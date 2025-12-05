"""
Synthetic sensor data generator for IoT simulation
"""
import random
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.orm import Session
from ..models import SensorData, KPI


class DataSimulator:
    """Generate synthetic sensor data with realistic patterns and anomalies"""
    
    def __init__(self):
        self.sensor_configs = {
            "raw_material": {
                "sensors": [
                    {"id": "rm_temp_001", "param": "temperature", "base": 20.0, "range": 5.0, "unit": "°C"},
                    {"id": "rm_humidity_001", "param": "humidity", "base": 45.0, "range": 10.0, "unit": "%"},
                    {"id": "rm_quantity_001", "param": "quantity", "base": 5000.0, "range": 500.0, "unit": "kg"},
                    {"id": "rm_vibration_001", "param": "vibration", "base": 0.5, "range": 0.3, "unit": "mm/s"},
                ]
            },
            "production_line": {
                "sensors": [
                    {"id": "pl_temp_001", "param": "temperature", "base": 75.0, "range": 10.0, "unit": "°C"},
                    {"id": "pl_vibration_001", "param": "vibration", "base": 2.5, "range": 1.0, "unit": "mm/s"},
                    {"id": "pl_speed_001", "param": "production_speed", "base": 100.0, "range": 15.0, "unit": "units/min"},
                    {"id": "pl_defect_001", "param": "брак_rate", "base": 2.0, "range": 1.5, "unit": "%"},
                    {"id": "pl_pressure_001", "param": "pressure", "base": 1.5, "range": 0.3, "unit": "bar"},
                ]
            },
            "warehouse": {
                "sensors": [
                    {"id": "wh_temp_001", "param": "temperature", "base": 18.0, "range": 3.0, "unit": "°C"},
                    {"id": "wh_humidity_001", "param": "humidity", "base": 40.0, "range": 8.0, "unit": "%"},
                    {"id": "wh_stock_001", "param": "stock_level", "base": 8000.0, "range": 1000.0, "unit": "units"},
                    {"id": "wh_vibration_001", "param": "vibration", "base": 0.2, "range": 0.1, "unit": "mm/s"},
                ]
            }
        }
    
    def generate_value(self, base: float, range_val: float, anomaly_prob: float = 0.05) -> tuple:
        """
        Generate a sensor value with optional anomaly
        Returns: (value, is_anomaly)
        """
        # Normal value with Gaussian noise
        noise = np.random.normal(0, range_val * 0.3)
        value = base + noise
        
        # Introduce anomalies occasionally
        is_anomaly = False
        if random.random() < anomaly_prob:
            is_anomaly = True
            # Anomaly: spike or drop
            if random.random() < 0.5:
                value = base + range_val * 2  # Spike
            else:
                value = base - range_val * 1.5  # Drop
        
        # Ensure value is within reasonable bounds
        value = max(0, value)
        return round(value, 2), is_anomaly
    
    def generate_sensor_data(self, sensor_type: str, timestamp: datetime = None) -> List[SensorData]:
        """Generate sensor data for a specific sensor type"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        if sensor_type not in self.sensor_configs:
            return []
        
        sensors = self.sensor_configs[sensor_type]["sensors"]
        data_points = []
        
        for sensor_config in sensors:
            value, is_anomaly = self.generate_value(
                sensor_config["base"],
                sensor_config["range"]
            )
            
            data_point = SensorData(
                sensor_id=sensor_config["id"],
                sensor_type=sensor_type,
                parameter=sensor_config["param"],
                value=value,
                unit=sensor_config["unit"],
                timestamp=timestamp,
                is_anomaly=is_anomaly
            )
            data_points.append(data_point)
        
        return data_points
    
    def generate_kpis(self, timestamp: datetime = None) -> List[KPI]:
        """Generate KPI values"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        kpis = []
        
        # OEE (Overall Equipment Effectiveness) - production line
        oee_value = random.uniform(75.0, 95.0)
        kpis.append(KPI(
            kpi_name="OEE",
            sensor_type="production_line",
            value=round(oee_value, 2),
            target=85.0,
            unit="%",
            timestamp=timestamp
        ))
        
        # Stock level - warehouse
        stock_value = random.uniform(6000.0, 10000.0)
        kpis.append(KPI(
            kpi_name="stock_level",
            sensor_type="warehouse",
            value=round(stock_value, 2),
            target=8000.0,
            unit="units",
            timestamp=timestamp
        ))
        
        # Production rate - production line
        prod_rate = random.uniform(90.0, 110.0)
        kpis.append(KPI(
            kpi_name="production_rate",
            sensor_type="production_line",
            value=round(prod_rate, 2),
            target=100.0,
            unit="units/min",
            timestamp=timestamp
        ))
        
        return kpis
    
    def save_sensor_data(self, db: Session, sensor_type: str, timestamp: datetime = None):
        """Generate and save sensor data to database"""
        data_points = self.generate_sensor_data(sensor_type, timestamp)
        for point in data_points:
            db.add(point)
        db.commit()
        return data_points
    
    def save_kpis(self, db: Session, timestamp: datetime = None):
        """Generate and save KPIs to database"""
        kpis = self.generate_kpis(timestamp)
        for kpi in kpis:
            db.add(kpi)
        db.commit()
        return kpis

