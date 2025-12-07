"""
Dashboard statistics routes for widgets
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Defect, Object, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/dashboard/stats", tags=["Статистика дашборда"])


@router.get("/widgets", summary="Виджеты дашборда", description="Получить статистику для виджетов дашборда")
def get_dashboard_widgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику для виджетов: методы, severity, топ-5, обследования по годам"""
    
    # Defects by method
    method_stats = db.query(
        Defect.defect_type,
        func.count(Defect.id).label('count')
    ).group_by(Defect.defect_type).all()
    
    methods_data = [{"method": method, "count": count} for method, count in method_stats]
    
    # Defects by severity
    severity_stats = db.query(
        Defect.severity,
        func.count(Defect.id).label('count')
    ).group_by(Defect.severity).all()
    
    severity_data = [{"severity": severity, "count": count} for severity, count in severity_stats]
    
    # Top 5 objects by defects count
    top_objects = db.query(
        Object.id,
        Object.object_code,
        Object.name,
        func.count(Defect.id).label('defects_count')
    ).join(Defect, Object.id == Defect.object_id, isouter=True)\
     .group_by(Object.id)\
     .order_by(func.count(Defect.id).desc())\
     .limit(5).all()
    
    top_objects_data = [
        {
            "id": obj_id,
            "object_code": object_code,
            "name": name or "-",
            "defects_count": defects_count
        }
        for obj_id, object_code, name, defects_count in top_objects
    ]
    
    # Inspections by year
    year_stats = db.query(
        func.extract('year', Defect.inspection_date).label('year'),
        func.count(Defect.id).label('count')
    ).group_by(func.extract('year', Defect.inspection_date))\
     .order_by(func.extract('year', Defect.inspection_date).desc()).all()
    
    inspections_by_year = [
        {"year": int(year), "count": count}
        for year, count in year_stats
    ]
    
    # Total counts
    total_objects = db.query(Object).count()
    total_defects = db.query(Defect).count()
    
    return {
        "methods": methods_data,
        "severity": severity_data,
        "top_objects": top_objects_data,
        "inspections_by_year": inspections_by_year,
        "totals": {
            "objects": total_objects,
            "defects": total_defects
        }
    }
