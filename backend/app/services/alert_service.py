"""
Alert service for threshold-based and ML-based alerts
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict
from ..models import Alert, SensorData
from .ml_service import MLService


class AlertService:
    """Service for generating and managing alerts"""
    
    def __init__(self):
        self.thresholds = {
            "raw_material": {
                "temperature": {"min": 15.0, "max": 25.0},
                "humidity": {"min": 35.0, "max": 55.0},
                "quantity": {"min": 1000.0, "max": 10000.0},
                "vibration": {"max": 1.0}
            },
            "production_line": {
                "temperature": {"min": 60.0, "max": 90.0},
                "vibration": {"max": 5.0},
                "production_speed": {"min": 80.0, "max": 120.0},
                "брак_rate": {"max": 5.0},
                "pressure": {"min": 1.0, "max": 2.0}
            },
            "warehouse": {
                "temperature": {"min": 15.0, "max": 22.0},
                "humidity": {"min": 30.0, "max": 50.0},
                "stock_level": {"min": 2000.0, "max": 12000.0},
                "vibration": {"max": 0.5}
            }
        }
        self.ml_service = MLService()
    
    def check_threshold_alert(self, sensor_data: SensorData) -> Alert:
        """Check if sensor data violates thresholds"""
        sensor_type = sensor_data.sensor_type
        parameter = sensor_data.parameter
        value = sensor_data.value
        
        if sensor_type not in self.thresholds:
            return None
        
        if parameter not in self.thresholds[sensor_type]:
            return None
        
        thresholds = self.thresholds[sensor_type][parameter]
        severity = "medium"
        message = ""
        
        # Функция для перевода названий параметров
        def translate_param(param):
            translations = {
                "temperature": "Температура",
                "humidity": "Влажность",
                "quantity": "Количество",
                "vibration": "Вибрация",
                "production_speed": "Скорость производства",
                "брак_rate": "Процент брака",
                "pressure": "Давление",
                "stock_level": "Уровень запасов"
            }
            return translations.get(param, param)
        
        param_name = translate_param(parameter)
        
        # Check min threshold
        if "min" in thresholds and value < thresholds["min"]:
            severity = "high" if parameter in ["quantity", "stock_level"] else "medium"
            message = f"{param_name} ниже минимального порога: {value} < {thresholds['min']}"
        
        # Check max threshold
        elif "max" in thresholds and value > thresholds["max"]:
            severity = "high" if parameter in ["temperature", "брак_rate"] else "medium"
            message = f"{param_name} превышает максимальный порог: {value} > {thresholds['max']}"
        else:
            return None
        
        # Create alert
        alert = Alert(
            sensor_id=sensor_data.sensor_id,
            sensor_type=sensor_type,
            alert_type="threshold",
            severity=severity,
            message=message,
            value=value,
            threshold=thresholds.get("min") or thresholds.get("max")
        )
        
        return alert
    
    def check_ml_anomaly(self, db: Session, sensor_data: SensorData) -> Alert:
        """Check for ML-detected anomalies"""
        is_anomaly = self.ml_service.detect_anomaly(sensor_data.sensor_id, sensor_data.value)
        
        if not is_anomaly:
            return None
        
        # Train model if needed
        training_data = self.ml_service.prepare_training_data(db, sensor_data.sensor_id)
        if training_data is not None and sensor_data.sensor_id not in self.ml_service.models:
            self.ml_service.train_model(sensor_data.sensor_id, training_data)
        
        # Функция для перевода названий параметров
        def translate_param(param):
            translations = {
                "temperature": "Температура",
                "humidity": "Влажность",
                "quantity": "Количество",
                "vibration": "Вибрация",
                "production_speed": "Скорость производства",
                "брак_rate": "Процент брака",
                "pressure": "Давление",
                "stock_level": "Уровень запасов"
            }
            return translations.get(param, param)
        
        param_name = translate_param(sensor_data.parameter)
        
        alert = Alert(
            sensor_id=sensor_data.sensor_id,
            sensor_type=sensor_data.sensor_type,
            alert_type="ml_anomaly",
            severity="high",
            message=f"ML обнаружил аномалию в {param_name}: {sensor_data.value}",
            value=sensor_data.value
        )
        
        return alert
    
    def process_sensor_data(self, db: Session, sensor_data: SensorData) -> List[Alert]:
        """Process sensor data and generate alerts"""
        alerts = []
        
        # Check threshold alerts
        threshold_alert = self.check_threshold_alert(sensor_data)
        if threshold_alert:
            alerts.append(threshold_alert)
        
        # Check ML anomalies (only for certain parameters)
        if sensor_data.parameter in ["temperature", "vibration", "production_speed"]:
            ml_alert = self.check_ml_anomaly(db, sensor_data)
            if ml_alert:
                alerts.append(ml_alert)
        
        # Save alerts to database
        for alert in alerts:
            db.add(alert)
        db.commit()
        
        return alerts
    
    def get_active_alerts(self, db: Session, limit: int = 50) -> List[Alert]:
        """Get active (unresolved) alerts"""
        return db.query(Alert).filter(
            Alert.is_resolved == False
        ).order_by(Alert.created_at.desc()).limit(limit).all()
    
    def resolve_alert(self, db: Session, alert_id: int):
        """Mark an alert as resolved"""
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.utcnow()
            db.commit()
            return alert
        return None

