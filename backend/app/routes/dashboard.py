"""
Dashboard routes for KPIs and aggregated data
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Dict
from ..database import get_db
from ..models import KPI, SensorData, Alert, User
from ..auth import get_current_user
from ..services.data_simulator import DataSimulator

router = APIRouter(prefix="/api/dashboard", tags=["Дашборд"])

data_simulator = DataSimulator()


@router.get("/kpis", summary="KPI", description="Получить последние значения KPI")
def get_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить последние значения KPI"""
    # Get latest KPI for each name
    kpi_names = db.query(KPI.kpi_name).distinct().all()
    
    latest_kpis = []
    for (kpi_name,) in kpi_names:
        latest = db.query(KPI).filter(
            KPI.kpi_name == kpi_name
        ).order_by(desc(KPI.timestamp)).first()
        
        if latest:
            latest_kpis.append({
                "id": latest.id,
                "kpi_name": latest.kpi_name,
                "sensor_type": latest.sensor_type,
                "value": latest.value,
                "target": latest.target,
                "unit": latest.unit,
                "timestamp": latest.timestamp.isoformat()
            })
    
    return {"kpis": latest_kpis}


@router.get("/alerts", summary="Оповещения", description="Получить активные оповещения")
def get_alerts(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить активные оповещения"""
    alerts = db.query(Alert).filter(
        Alert.is_resolved == False
    ).order_by(desc(Alert.created_at)).limit(limit).all()
    
    return {
        "alerts": [
            {
                "id": alert.id,
                "sensor_id": alert.sensor_id,
                "sensor_type": alert.sensor_type,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "value": alert.value,
                "created_at": alert.created_at.isoformat()
            }
            for alert in alerts
        ]
    }


@router.get("/summary", summary="Сводка", description="Получить сводку дашборда с агрегированной статистикой")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить сводку дашборда с агрегированной статистикой"""
    # Get latest data for each sensor type
    sensor_types = ["raw_material", "production_line", "warehouse"]
    summary = {}
    
    for sensor_type in sensor_types:
        # Count total sensors
        sensor_count = db.query(SensorData.sensor_id).filter(
            SensorData.sensor_type == sensor_type
        ).distinct().count()
        
        # Get latest data count
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        recent_count = db.query(SensorData).filter(
            SensorData.sensor_type == sensor_type,
            SensorData.timestamp >= cutoff_time
        ).count()
        
        # Count active alerts
        alert_count = db.query(Alert).filter(
            Alert.sensor_type == sensor_type,
            Alert.is_resolved == False
        ).count()
        
        # Get average values for key parameters
        latest_data = db.query(SensorData).filter(
            SensorData.sensor_type == sensor_type
        ).order_by(desc(SensorData.timestamp)).limit(10).all()
        
        summary[sensor_type] = {
            "sensor_count": sensor_count,
            "recent_data_points": recent_count,
            "active_alerts": alert_count,
            "latest_data": [
                {
                    "parameter": d.parameter,
                    "value": d.value,
                    "unit": d.unit,
                    "timestamp": d.timestamp.isoformat()
                }
                for d in latest_data[:5]
            ]
        }
    
    return summary


@router.post("/kpis/generate", summary="Генерация KPI", description="Вручную сгенерировать значения KPI")
def generate_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Вручную сгенерировать значения KPI"""
    kpis = data_simulator.save_kpis(db)
    return {
        "message": f"Сгенерировано {len(kpis)} KPI",
        "kpis": len(kpis)
    }

