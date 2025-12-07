"""
Routes for statistics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Dict, List
from ..database import get_db
from ..models import Defect, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Статистика"])


@router.get("/methods")
def get_methods_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Статистика по методам диагностики"""
    stats = db.query(
        Defect.method,
        func.count(Defect.id).label('count')
    ).group_by(Defect.method).all()
    
    return {
        "methods": [
            {"method": method, "count": count}
            for method, count in stats
        ]
    }


@router.get("/severity")
def get_severity_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Статистика по серьезности дефектов"""
    stats = db.query(
        Defect.severity,
        func.count(Defect.id).label('count')
    ).group_by(Defect.severity).all()
    
    return {
        "severity": [
            {"severity": sev, "count": count}
            for sev, count in stats
        ]
    }


@router.get("/top_risks")
def get_top_risks(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Топ объектов с наибольшим количеством критических дефектов"""
    from ..models import Object
    
    stats = db.query(
        Object.id,
        Object.object_code,
        Object.name,
        func.count(Defect.id).label('critical_count')
    ).join(Defect, Object.id == Defect.object_id).filter(
        Defect.severity.in_(['high', 'critical'])
    ).group_by(
        Object.id, Object.object_code, Object.name
    ).order_by(
        func.count(Defect.id).desc()
    ).limit(limit).all()
    
    return {
        "top_risks": [
            {
                "object_id": obj_id,
                "object_code": obj_code,
                "object_name": obj_name or obj_code,
                "critical_defects": count
            }
            for obj_id, obj_code, obj_name, count in stats
        ]
    }


@router.get("/inspections_by_year")
def get_inspections_by_year(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Статистика обследований по годам"""
    stats = db.query(
        extract('year', Defect.inspection_date).label('year'),
        func.count(Defect.id).label('count')
    ).group_by(
        extract('year', Defect.inspection_date)
    ).order_by('year').all()
    
    return {
        "by_year": [
            {"year": int(year), "count": count}
            for year, count in stats
        ]
    }
