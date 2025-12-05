"""
Sensor data routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from ..database import get_db
from ..models import SensorData, User
from ..auth import get_current_user
from ..services.data_simulator import DataSimulator
from ..services.alert_service import AlertService

router = APIRouter(prefix="/api/sensors", tags=["Сенсоры"])

data_simulator = DataSimulator()
alert_service = AlertService()


class SensorDataResponse(BaseModel):
    id: int
    sensor_id: str
    sensor_type: str
    parameter: str
    value: float
    unit: str
    timestamp: datetime
    is_anomaly: bool
    
    class Config:
        from_attributes = True


@router.get("/types", summary="Типы сенсоров", description="Получить доступные типы сенсоров")
def get_sensor_types(current_user: User = Depends(get_current_user)):
    """Получить доступные типы сенсоров"""
    return {
        "sensor_types": ["raw_material", "production_line", "warehouse"]
    }


@router.get("/{sensor_type}/data", response_model=List[SensorDataResponse], summary="Данные сенсоров", description="Получить данные сенсоров для конкретного типа")
def get_sensor_data(
    sensor_type: str,
    hours: Optional[int] = 24,
    limit: Optional[int] = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить данные сенсоров для конкретного типа"""
    if sensor_type not in ["raw_material", "production_line", "warehouse"]:
        raise HTTPException(status_code=400, detail="Неверный тип сенсора")
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    data = db.query(SensorData).filter(
        SensorData.sensor_type == sensor_type,
        SensorData.timestamp >= cutoff_time
    ).order_by(desc(SensorData.timestamp)).limit(limit).all()
    
    return data


@router.get("/{sensor_type}/latest", response_model=List[SensorDataResponse], summary="Последние данные", description="Получить последние данные сенсоров для каждого параметра")
def get_latest_sensor_data(
    sensor_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить последние данные сенсоров для каждого параметра"""
    if sensor_type not in ["raw_material", "production_line", "warehouse"]:
        raise HTTPException(status_code=400, detail="Неверный тип сенсора")
    
    # Get distinct parameters
    parameters = db.query(SensorData.parameter).filter(
        SensorData.sensor_type == sensor_type
    ).distinct().all()
    
    latest_data = []
    for (param,) in parameters:
        latest = db.query(SensorData).filter(
            SensorData.sensor_type == sensor_type,
            SensorData.parameter == param
        ).order_by(desc(SensorData.timestamp)).first()
        
        if latest:
            latest_data.append(latest)
    
    return latest_data


@router.post("/{sensor_type}/simulate", summary="Симуляция данных", description="Вручную запустить симуляцию данных сенсоров")
def simulate_sensor_data(
    sensor_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Вручную запустить симуляцию данных сенсоров"""
    if sensor_type not in ["raw_material", "production_line", "warehouse"]:
        raise HTTPException(status_code=400, detail="Неверный тип сенсора")
    
    # Generate and save data
    data_points = data_simulator.save_sensor_data(db, sensor_type)
    
    # Process alerts
    alerts = []
    for point in data_points:
        point_alerts = alert_service.process_sensor_data(db, point)
        alerts.extend(point_alerts)
    
    return {
        "message": f"Сгенерировано {len(data_points)} точек данных",
        "data_points": len(data_points),
        "alerts_generated": len(alerts)
    }

