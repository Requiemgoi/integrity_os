"""
Import routes for objects and inspections
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import pandas as pd
from io import BytesIO
import tempfile
import os
from ..database import get_db
from ..models import Object, Defect, User
from ..auth import get_current_user
from ..services.import_ili import import_anomalies_from_excel, get_available_sheets

router = APIRouter(prefix="/api/import", tags=["Импорт"])


@router.post("/objects", summary="Импорт объектов", description="Импорт объектов из CSV/XLSX файла")
async def import_objects(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Импорт объектов из файла"""
    try:
        # Read file
        contents = await file.read()
        
        # Determine file type
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(BytesIO(contents))
        elif file.filename.endswith('.csv'):
            # Try different encodings and separators
            encodings = ['utf-8', 'cp1251', 'windows-1251', 'latin-1']
            separators = [';', ',', '\t']
            df = None
            
            for encoding in encodings:
                for sep in separators:
                    try:
                        df = pd.read_csv(BytesIO(contents), sep=sep, encoding=encoding, low_memory=False)
                        if len(df.columns) > 1:  # If we got multiple columns, it's likely correct
                            break
                    except:
                        continue
                if df is not None and len(df.columns) > 1:
                    break
            
            if df is None or len(df.columns) <= 1:
                # Fallback to default
                df = pd.read_csv(BytesIO(contents), sep=';', encoding='cp1251', low_memory=False)
        else:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла. Используйте CSV или XLSX")
        
        # Normalize column names (remove spaces, lowercase)
        df.columns = df.columns.str.strip().str.lower()
        
        # Try to map common column name variations
        column_mapping = {
            'object_code': ['object_code', 'код объекта', 'код', 'id', 'номер', '№'],
            'name': ['name', 'название', 'наименование', 'описание'],
            'object_type': ['object_type', 'тип объекта', 'тип'],
            'pipeline_code': ['pipeline_code', 'трубопровод', 'линия', 'mt'],
            'latitude': ['latitude', 'широта', 'lat', 'y'],
            'longitude': ['longitude', 'долгота', 'lon', 'lng', 'x'],
            'param1': ['param1', 'параметр1', 'параметр 1', 'толщина', 'глубина'],
            'param2': ['param2', 'параметр2', 'параметр 2'],
        }
        
        # Map columns
        mapped_columns = {}
        for target_col, possible_names in column_mapping.items():
            for col in df.columns:
                if col in possible_names or any(name.lower() in col.lower() for name in possible_names):
                    mapped_columns[target_col] = col
                    break
        
        # Check required columns
        if 'object_code' not in mapped_columns:
            # Try to use first column or index as object_code
            if len(df.columns) > 0:
                mapped_columns['object_code'] = df.columns[0]
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Не удалось определить колонку с кодом объекта. Убедитесь, что файл содержит колонку 'object_code' или 'код объекта'"
                )
        
        imported = 0
        updated = 0
        errors = []
        object_cache = {}
        
        for index, row in df.iterrows():
            try:
                # Get object_code using mapped column
                object_code_col = mapped_columns.get('object_code', df.columns[0])
                object_code = str(row[object_code_col]).strip() if pd.notna(row.get(object_code_col)) else f"OBJ_{index + 1}"
                
                # Skip empty rows
                if not object_code or object_code == 'nan':
                    continue
                
                # Check if object exists
                existing = object_cache.get(object_code)
                if existing is None:
                    existing = db.query(Object).filter(Object.object_code == object_code).first()
                    if existing:
                        object_cache[object_code] = existing
                
                # Extract data using mapped columns
                def get_value(col_name, default=None):
                    if col_name in mapped_columns:
                        val = row.get(mapped_columns[col_name])
                        if pd.notna(val):
                            return val
                    return default
                
                # Try to extract coordinates (often at the end of CSV rows)
                lat = None
                lon = None
                if 'latitude' in mapped_columns:
                    try:
                        lat = float(get_value('latitude'))
                    except:
                        pass
                if 'longitude' in mapped_columns:
                    try:
                        lon = float(get_value('longitude'))
                    except:
                        pass
                
                # If coordinates not found, try to find them in numeric columns at the end
                if lat is None or lon is None:
                    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
                    for i, col in enumerate(numeric_cols):
                        val = row.get(col)
                        if pd.notna(val):
                            try:
                                num_val = float(val)
                                # Check if it looks like a coordinate (latitude: -90 to 90, longitude: -180 to 180)
                                if 40 <= num_val <= 60:  # Kazakhstan latitude range
                                    if lat is None:
                                        lat = num_val
                                    elif lon is None and abs(num_val - lat) > 1:
                                        lon = num_val
                                elif 50 <= num_val <= 80:  # Kazakhstan longitude range
                                    if lon is None:
                                        lon = num_val
                                    elif lat is None and abs(num_val - (lon if lon else 0)) > 1:
                                        lat = num_val
                            except:
                                pass
                
                data = {
                    'object_code': object_code,
                    'name': str(get_value('name', '')).strip() if get_value('name') else None,
                    'object_type': str(get_value('object_type', '')).strip() if get_value('object_type') else None,
                    'pipeline_code': str(get_value('pipeline_code', '')).strip() if get_value('pipeline_code') else None,
                    'latitude': lat,
                    'longitude': lon,
                    'param1': float(get_value('param1')) if get_value('param1') is not None and pd.notna(get_value('param1')) else None,
                    'param2': float(get_value('param2')) if get_value('param2') is not None and pd.notna(get_value('param2')) else None,
                }
                
                if existing:
                    # Update existing
                    for key, value in data.items():
                        if value is not None:
                            setattr(existing, key, value)
                    updated += 1
                else:
                    # Create new
                    obj = Object(**data)
                    db.add(obj)
                    object_cache[object_code] = obj
                    imported += 1
                    
            except Exception as e:
                errors.append(f"Строка {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Импорт завершен",
            "imported": imported,
            "updated": updated,
            "errors": errors[:10] if errors else []  # Limit errors to first 10
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка импорта: {str(e)}")


@router.post("/inspections", summary="Импорт диагностик", description="Импорт дефектов из CSV/XLSX файла")
async def import_inspections(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Импорт дефектов из файла"""
    try:
        # Read file
        contents = await file.read()
        
        # Determine file type
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(BytesIO(contents))
        elif file.filename.endswith('.csv'):
            # Try different encodings and separators
            encodings = ['utf-8', 'cp1251', 'windows-1251', 'latin-1']
            separators = [';', ',', '\t']
            df = None
            
            for encoding in encodings:
                for sep in separators:
                    try:
                        df = pd.read_csv(BytesIO(contents), sep=sep, encoding=encoding, low_memory=False)
                        if len(df.columns) > 1:  # If we got multiple columns, it's likely correct
                            break
                    except:
                        continue
                if df is not None and len(df.columns) > 1:
                    break
            
            if df is None or len(df.columns) <= 1:
                # Fallback to default
                df = pd.read_csv(BytesIO(contents), sep=';', encoding='cp1251', low_memory=False)
        else:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла. Используйте CSV или XLSX")
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Try to map common column name variations
        column_mapping = {
            'defect_code': ['defect_code', 'код дефекта', 'код', 'id', 'номер', '№'],
            'object_code': ['object_code', 'код объекта', 'объект', 'номер объекта'],
            'method': ['method', 'метод', 'метод диагностики', 'тип'],
            'severity': ['severity', 'критичность', 'риск', 'класс'],
            'inspection_date': ['inspection_date', 'дата', 'дата обследования', 'дата диагностики'],
            'depth': ['depth', 'глубина', 'толщина'],
            'param1': ['param1', 'параметр1', 'параметр 1'],
            'param2': ['param2', 'параметр2', 'параметр 2'],
            'description': ['description', 'описание', 'комментарий'],
        }
        
        # Map columns
        mapped_columns = {}
        for target_col, possible_names in column_mapping.items():
            for col in df.columns:
                if col in possible_names or any(name.lower() in col.lower() for name in possible_names):
                    mapped_columns[target_col] = col
                    break
        
        # Check required columns
        required_mappings = ['defect_code', 'object_code', 'method', 'severity']
        missing = [col for col in required_mappings if col not in mapped_columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Не удалось определить колонки: {', '.join(missing)}. Убедитесь, что файл содержит соответствующие колонки."
            )
        
        imported = 0
        errors = []
        
        def get_value(col_name, default=None):
            if col_name in mapped_columns:
                val = row.get(mapped_columns[col_name])
                if pd.notna(val):
                    return val
            return default
        
        for index, row in df.iterrows():
            try:
                defect_code = str(get_value('defect_code', f'DEF_{index + 1}')).strip()
                object_code = str(get_value('object_code', '')).strip()
                
                if not object_code or object_code == 'nan':
                    errors.append(f"Строка {index + 2}: Не указан код объекта")
                    continue
                
                # Find object
                obj = db.query(Object).filter(Object.object_code == object_code).first()
                if not obj:
                    errors.append(f"Строка {index + 2}: Объект {object_code} не найден")
                    continue
                
                # Parse inspection date
                inspection_date_val = get_value('inspection_date')
                if inspection_date_val:
                    try:
                        if isinstance(inspection_date_val, str):
                            # Try different date formats
                            for fmt in ['%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y.%m.%d']:
                                try:
                                    inspection_date = datetime.strptime(inspection_date_val, fmt)
                                    break
                                except:
                                    continue
                            else:
                                inspection_date = pd.to_datetime(inspection_date_val).to_pydatetime()
                        else:
                            inspection_date = pd.to_datetime(inspection_date_val).to_pydatetime()
                    except:
                        inspection_date = datetime.utcnow()
                else:
                    inspection_date = datetime.utcnow()
                
                # Check if defect exists
                existing = db.query(Defect).filter(Defect.defect_code == defect_code).first()
                
                if existing:
                    errors.append(f"Строка {index + 2}: Дефект {defect_code} уже существует")
                    continue
                
                # Parse method and severity
                method = str(get_value('method', 'MT-01')).strip().upper()
                severity_str = str(get_value('severity', 'medium')).strip().lower()
                
                # Map severity values
                severity_map = {
                    'низкий': 'low',
                    'низкая': 'low',
                    'средний': 'medium',
                    'средняя': 'medium',
                    'высокий': 'high',
                    'высокая': 'high',
                    'критический': 'critical',
                    'критическая': 'critical',
                }
                severity = severity_map.get(severity_str, severity_str)
                if severity not in ['low', 'medium', 'high', 'critical']:
                    severity = 'medium'
                
                # Extract data
                data = {
                    'defect_code': defect_code,
                    'object_id': obj.id,
                    'method': method,
                    'severity': severity,
                    'inspection_date': inspection_date,
                    'depth': float(get_value('depth')) if get_value('depth') is not None and pd.notna(get_value('depth')) else None,
                    'param1': float(get_value('param1')) if get_value('param1') is not None and pd.notna(get_value('param1')) else None,
                    'param2': float(get_value('param2')) if get_value('param2') is not None and pd.notna(get_value('param2')) else None,
                    'description': str(get_value('description', '')).strip() if get_value('description') else None,
                    'latitude': obj.latitude,  # Pull coordinates from object
                    'longitude': obj.longitude,
                }
                
                # Create defect
                defect = Defect(**data)
                db.add(defect)
                imported += 1
                    
            except Exception as e:
                errors.append(f"Строка {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Импорт завершен",
            "imported": imported,
            "errors": errors[:10] if errors else []  # Limit errors to first 10
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка импорта: {str(e)}")


@router.post("/ili", summary="Импорт ILI данных", description="Импорт данных внутритрубной диагностики из Excel файла")
async def import_ili_data(
    file: UploadFile = File(...),
    pipeline_code: str = Form(..., description="Код трубопровода (MT-01, MT-02, MT-03)"),
    sheet_name: str = Form(default="Аномалии", description="Название листа с аномалиями"),
    inspection_date: Optional[str] = Form(default=None, description="Дата диагностики (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Импорт данных внутритрубной диагностики (ILI) из Excel файла.
    
    Поддерживаемый формат: стандартный отчёт ILI с листом "Аномалии".
    
    Колонки:
    - шов на [м], № секции, длина секции [м]
    - тип аномалии, идентификация
    - длина [мм], ширина [мм], макс. глубина [%]
    - ERF B31G, ERF DNV
    - Широта [°], Долгота [°]
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Поддерживаются только Excel файлы (.xlsx, .xls)")
    
    # Parse inspection date
    insp_date = None
    if inspection_date:
        try:
            insp_date = datetime.strptime(inspection_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")
    
    # Save uploaded file temporarily
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        # Import data
        result = import_anomalies_from_excel(
            db=db,
            file_path=tmp_path,
            pipeline_code=pipeline_code,
            inspection_date=insp_date,
            sheet_name=sheet_name
        )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "message": "Импорт ILI данных завершен",
            "pipeline_code": pipeline_code,
            "imported": result["imported"],
            "errors": result.get("errors", []),
            "total_errors": result.get("total_errors", 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка импорта ILI: {str(e)}")


@router.post("/ili/sheets", summary="Получить листы Excel", description="Получить список листов в Excel файле")
async def get_excel_sheets(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Получить список листов в Excel файле для выбора нужного."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Поддерживаются только Excel файлы (.xlsx, .xls)")
    
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        sheets = get_available_sheets(tmp_path)
        os.unlink(tmp_path)
        
        return {
            "filename": file.filename,
            "sheets": sheets
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чтения файла: {str(e)}")
