"""
Reports routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..database import get_db
from ..models import Defect, Object, Pipeline, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Отчеты"])


@router.get("/generate", summary="Генерация отчета", description="Сгенерировать HTML отчет")
def generate_report(
    download: bool = Query(False, description="Скачать файл вместо отображения"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сгенерировать HTML отчет"""
    try:
        # Get statistics
        total_objects = db.query(Object).count()
        total_defects = db.query(Defect).count()
        
        # Defects by severity
        severity_stats = db.query(
            Defect.severity,
            func.count(Defect.id).label('count')
        ).group_by(Defect.severity).all()
        
        # Defects by method (using defect_type as method)
        method_stats = db.query(
            Defect.defect_type,
            func.count(Defect.id).label('count')
        ).filter(Defect.defect_type.isnot(None)).group_by(Defect.defect_type).all()
        
        # Top 5 objects by defects
        top_objects = db.query(
            Object.object_code,
            Object.name,
            func.count(Defect.id).label('defects_count')
        ).join(Defect, Object.id == Defect.object_id, isouter=True)\
         .group_by(Object.id)\
         .order_by(func.count(Defect.id).desc())\
         .limit(5).all()
        
        # Inspections by year
        year_stats = db.query(
            func.extract('year', Defect.inspection_date).label('year'),
            func.count(Defect.id).label('count')
        ).group_by(func.extract('year', Defect.inspection_date))\
         .order_by(func.extract('year', Defect.inspection_date).desc()).all()
        
        # Generate HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Отчет IntegrityOS</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                h1 {{
                    color: #1976d2;
                    border-bottom: 3px solid #1976d2;
                    padding-bottom: 10px;
                }}
                h2 {{
                    color: #424242;
                    margin-top: 30px;
                }}
                .stats {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }}
                .stat-card {{
                    background: #f0f0f0;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                }}
                .stat-value {{
                    font-size: 36px;
                    font-weight: bold;
                    color: #1976d2;
                }}
                .stat-label {{
                    font-size: 14px;
                    color: #666;
                    margin-top: 5px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                th, td {{
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }}
                th {{
                    background-color: #1976d2;
                    color: white;
                }}
                tr:hover {{
                    background-color: #f5f5f5;
                }}
                .badge {{
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                }}
                .severity-low {{ background-color: #4caf50; color: white; }}
                .severity-medium {{ background-color: #ff9800; color: white; }}
                .severity-high {{ background-color: #f44336; color: white; }}
                .severity-critical {{ background-color: #9c27b0; color: white; }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Отчет IntegrityOS</h1>
                <p><strong>Дата генерации:</strong> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</p>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-value">{total_objects}</div>
                        <div class="stat-label">Объектов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_defects}</div>
                        <div class="stat-label">Дефектов</div>
                    </div>
                </div>
                
                <h2>Дефекты по критичности</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Критичность</th>
                            <th>Количество</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for severity, count in severity_stats:
            severity_ru = {
                'low': 'Низкая',
                'medium': 'Средняя',
                'high': 'Высокая',
                'critical': 'Критическая'
            }.get(severity, severity)
            html += f"""
                        <tr>
                            <td><span class="badge severity-{severity}">{severity_ru}</span></td>
                            <td>{count}</td>
                        </tr>
            """
        
        html += """
                    </tbody>
                </table>
                
                <h2>Дефекты по методам диагностики</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Метод</th>
                            <th>Количество</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for method, count in method_stats:
            html += f"""
                        <tr>
                            <td>{method}</td>
                            <td>{count}</td>
                        </tr>
            """
        
        html += """
                    </tbody>
                </table>
                
                <h2>Топ-5 объектов по количеству дефектов</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Код объекта</th>
                            <th>Название</th>
                            <th>Количество дефектов</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for obj_code, obj_name, defects_count in top_objects:
            html += f"""
                        <tr>
                            <td>{obj_code}</td>
                            <td>{obj_name or '-'}</td>
                            <td>{defects_count}</td>
                        </tr>
            """
        
        html += """
                    </tbody>
                </table>
                
                <h2>Обследования по годам</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Год</th>
                            <th>Количество обследований</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for year, count in year_stats:
            html += f"""
                        <tr>
                            <td>{int(year)}</td>
                            <td>{count}</td>
                        </tr>
            """
        
        html += f"""
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Сгенерировано системой IntegrityOS</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Если запрошено скачивание, добавить заголовки для скачивания
        if download:
            filename = f"integrityos-report-{datetime.now().strftime('%Y-%m-%d')}.html"
            return Response(
                content=html,
                media_type="text/html",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
        
        return HTMLResponse(content=html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации отчета: {str(e)}")
