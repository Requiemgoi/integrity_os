"""
Defects routes with filtering
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import Defect, Object, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/defects", tags=["Дефекты"])


class DefectResponse(BaseModel):
    id: int
    defect_code: str
    object_id: Optional[int] = None
    pipeline_code: Optional[str] = None
    severity: str
    
    # Location on pipeline
    weld_distance: Optional[float] = None
    section_number: Optional[int] = None
    section_length: Optional[float] = None
    measured_distance: Optional[float] = None
    orientation: Optional[str] = None
    
    # Classification
    defect_type: Optional[str] = None
    identification: Optional[str] = None
    external_size: Optional[str] = None
    
    # Dimensions
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    max_depth_percent: Optional[float] = None
    avg_depth_percent: Optional[float] = None
    depth_mm: Optional[float] = None
    
    # Wall thickness
    wall_thickness: Optional[float] = None
    remaining_wall: Optional[float] = None
    
    # ERF
    erf_b31g: Optional[float] = None
    erf_dnv: Optional[float] = None
    
    # Location
    surface_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    
    # Metadata
    comment: Optional[str] = None
    inspection_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    # Related object info
    object_code: Optional[str] = None
    object_name: Optional[str] = None
    
    # Legacy fields for compatibility
    method: Optional[str] = None
    depth: Optional[float] = None
    param1: Optional[float] = None
    param2: Optional[float] = None
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[DefectResponse], summary="Список дефектов", description="Получить список дефектов с фильтрами")
def get_defects(
    pipeline_code: Optional[str] = Query(None, description="Код трубопровода (MT-01, MT-02, MT-03)"),
    defect_type: Optional[str] = Query(None, description="Тип аномалии (потеря металла, вмятина, расслоение)"),
    identification: Optional[str] = Query(None, description="Идентификация (коррозия, механическое повреждение)"),
    method: Optional[str] = Query(None, description="Метод диагностики (VIK, UZK, MFL и т.п.)"),
    date_from: Optional[str] = Query(None, description="Дата начала (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Дата окончания (YYYY-MM-DD)"),
    severity: Optional[str] = Query(None, description="Критичность (low, medium, high, critical)"),
    min_depth: Optional[float] = Query(None, description="Минимальная глубина [%]"),
    max_depth: Optional[float] = Query(None, description="Максимальная глубина [%]"),
    sort_by: Optional[str] = Query("inspection_date", description="Сортировка (max_depth_percent, inspection_date)"),
    sort_order: Optional[str] = Query("desc", description="Порядок сортировки (asc, desc)"),
    limit: int = Query(100, description="Лимит записей"),
    db: Session = Depends(get_db)
):
    """Получить список дефектов с фильтрами"""
    try:
        query = db.query(Defect).outerjoin(Object, Defect.object_id == Object.id)
        
        # Apply filters
        filters = []
        
        if pipeline_code:
            filters.append(Defect.pipeline_code == pipeline_code)
        
        if defect_type:
            filters.append(Defect.defect_type.ilike(f"%{defect_type}%"))
        
        if identification:
            filters.append(Defect.identification.ilike(f"%{identification}%"))
        
        if method:
            filters.append(Defect.defect_type == method)  # Legacy compatibility
        
        if severity:
            filters.append(Defect.severity == severity)
        
        if min_depth is not None:
            filters.append(Defect.max_depth_percent >= min_depth)
        
        if max_depth is not None:
            filters.append(Defect.max_depth_percent <= max_depth)
        
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from)
                filters.append(Defect.inspection_date >= date_from_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Неверный формат date_from. Используйте YYYY-MM-DD")
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to)
                # Add one day to include the entire day
                date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
                filters.append(Defect.inspection_date <= date_to_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Неверный формат date_to. Используйте YYYY-MM-DD")
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Sorting
        if sort_by == "max_depth_percent":
            if sort_order == "asc":
                query = query.order_by(Defect.max_depth_percent.asc())
            else:
                query = query.order_by(Defect.max_depth_percent.desc())
        elif sort_by == "erf_b31g":
            if sort_order == "asc":
                query = query.order_by(Defect.erf_b31g.asc())
            else:
                query = query.order_by(Defect.erf_b31g.desc())
        elif sort_by == "severity":
            # Custom severity order: critical > high > medium > low
            from sqlalchemy import case
            severity_order = case(
                (Defect.severity == "critical", 1),
                (Defect.severity == "high", 2),
                (Defect.severity == "medium", 3),
                (Defect.severity == "low", 4),
                else_=5
            )
            if sort_order == "asc":
                query = query.order_by(severity_order.desc())
            else:
                query = query.order_by(severity_order.asc())
        else:  # default: inspection_date
            # Handle NULL values in inspection_date
            from sqlalchemy import nullslast, nullsfirst
            if sort_order == "asc":
                query = query.order_by(nullsfirst(Defect.inspection_date.asc()))
            else:
                query = query.order_by(nullslast(Defect.inspection_date.desc()))
        
        # Execute query with error handling
        try:
            defects = query.limit(limit).all()
        except Exception as db_error:
            print(f"Database query error: {str(db_error)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Ошибка выполнения запроса к базе данных: {str(db_error)}")
        
        # Format response with object info
        result = []
        for defect in defects:
            defect_dict = {
                "id": defect.id,
                "defect_code": defect.defect_code,
                "object_id": defect.object_id,
                "pipeline_code": defect.pipeline_code,
                "severity": defect.severity,
                # Location
                "weld_distance": defect.weld_distance,
                "section_number": defect.section_number,
                "section_length": defect.section_length,
                "measured_distance": defect.measured_distance,
                "orientation": defect.orientation,
                # Classification
                "defect_type": defect.defect_type,
                "identification": defect.identification,
                "external_size": defect.external_size,
                # Dimensions
                "length_mm": defect.length_mm,
                "width_mm": defect.width_mm,
                "max_depth_percent": defect.max_depth_percent,
                "avg_depth_percent": defect.avg_depth_percent,
                "depth_mm": defect.depth_mm,
                # Wall thickness
                "wall_thickness": defect.wall_thickness,
                "remaining_wall": defect.remaining_wall,
                # ERF
                "erf_b31g": defect.erf_b31g,
                "erf_dnv": defect.erf_dnv,
                # Location
                "surface_location": defect.surface_location,
                "latitude": defect.latitude,
                "longitude": defect.longitude,
                "elevation": defect.elevation,
                # Metadata
                "comment": defect.comment,
                "inspection_date": defect.inspection_date,
                "created_at": defect.created_at,
                "object_code": defect.object.object_code if defect.object else None,
                "object_name": defect.object.name if defect.object else None,
            }
            result.append(DefectResponse(**defect_dict))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in get_defects: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Ошибка при получении списка дефектов: {str(e)}")


@router.get("/{defect_id}", response_model=DefectResponse, summary="Детали дефекта")
def get_defect(
    defect_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить детальную информацию о дефекте"""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Дефект не найден")
    
    defect_dict = {
        "id": defect.id,
        "defect_code": defect.defect_code,
        "object_id": defect.object_id,
        "pipeline_code": defect.pipeline_code,
        "severity": defect.severity,
        # Location
        "weld_distance": defect.weld_distance,
        "section_number": defect.section_number,
        "section_length": defect.section_length,
        "measured_distance": defect.measured_distance,
        "orientation": defect.orientation,
        # Classification
        "defect_type": defect.defect_type,
        "identification": defect.identification,
        "external_size": defect.external_size,
        # Dimensions
        "length_mm": defect.length_mm,
        "width_mm": defect.width_mm,
        "max_depth_percent": defect.max_depth_percent,
        "avg_depth_percent": defect.avg_depth_percent,
        "depth_mm": defect.depth_mm,
        # Wall thickness
        "wall_thickness": defect.wall_thickness,
        "remaining_wall": defect.remaining_wall,
        # ERF
        "erf_b31g": defect.erf_b31g,
        "erf_dnv": defect.erf_dnv,
        # Location
        "surface_location": defect.surface_location,
        "latitude": defect.latitude,
        "longitude": defect.longitude,
        "elevation": defect.elevation,
        # Metadata
        "comment": defect.comment,
        "inspection_date": defect.inspection_date,
        "created_at": defect.created_at,
        "object_code": defect.object.object_code if defect.object else None,
        "object_name": defect.object.name if defect.object else None,
    }
    return DefectResponse(**defect_dict)
