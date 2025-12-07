"""
Objects routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import Object, Defect, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/objects", tags=["Объекты"])


class ObjectResponse(BaseModel):
    id: int
    object_code: str
    name: Optional[str]
    object_type: Optional[str]
    pipeline_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    param1: Optional[float]
    param2: Optional[float]
    created_at: str
    defects_count: int = 0
    
    class Config:
        from_attributes = True


class ObjectDetailResponse(ObjectResponse):
    defects: List[dict] = []


@router.get("", response_model=List[ObjectResponse], summary="Список объектов", description="Получить список объектов с фильтрами")
def get_objects(
    search: Optional[str] = Query(None, description="Поиск по коду или названию"),
    pipeline_code: Optional[str] = Query(None, description="Фильтр по коду трубопровода"),
    object_type: Optional[str] = Query(None, description="Фильтр по типу объекта"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список объектов с фильтрами"""
    query = db.query(Object)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Object.object_code.ilike(f"%{search}%"),
                Object.name.ilike(f"%{search}%")
            )
        )
    
    if pipeline_code:
        query = query.filter(Object.pipeline_code == pipeline_code)
    
    if object_type:
        query = query.filter(Object.object_type == object_type)
    
    objects = query.all()
    
    # Add defects count
    result = []
    for obj in objects:
        defects_count = db.query(Defect).filter(Defect.object_id == obj.id).count()
        obj_dict = {
            "id": obj.id,
            "object_code": obj.object_code,
            "name": obj.name,
            "object_type": obj.object_type,
            "pipeline_code": obj.pipeline_code,
            "latitude": obj.latitude,
            "longitude": obj.longitude,
            "param1": obj.param1,
            "param2": obj.param2,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "defects_count": defects_count,
        }
        result.append(ObjectResponse(**obj_dict))
    
    return result


@router.get("/{object_id}", response_model=ObjectDetailResponse, summary="Детали объекта")
def get_object(
    object_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить детальную информацию об объекте"""
    obj = db.query(Object).filter(Object.id == object_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    
    # Get defects
    defects = db.query(Defect).filter(Defect.object_id == object_id).all()
    defects_data = [
        {
            "id": d.id,
            "defect_code": d.defect_code,
            "method": d.method,
            "severity": d.severity,
            "depth": d.depth,
            "inspection_date": d.inspection_date.isoformat() if d.inspection_date else None,
        }
        for d in defects
    ]
    
    obj_dict = {
        "id": obj.id,
        "object_code": obj.object_code,
        "name": obj.name,
        "object_type": obj.object_type,
        "pipeline_code": obj.pipeline_code,
        "latitude": obj.latitude,
        "longitude": obj.longitude,
        "param1": obj.param1,
        "param2": obj.param2,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "defects_count": len(defects_data),
        "defects": defects_data,
    }
    
    return ObjectDetailResponse(**obj_dict)
