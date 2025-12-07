"""
Pipelines routes for geometry data
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import Pipeline, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/pipelines", tags=["Трубопроводы"])


class PipelineResponse(BaseModel):
    id: int
    pipeline_code: str
    name: Optional[str]
    geometry: str  # JSON string
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[PipelineResponse], summary="Список трубопроводов", description="Получить геометрию всех трубопроводов")
def get_pipelines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список всех трубопроводов с геометрией"""
    pipelines = db.query(Pipeline).all()
    return pipelines
