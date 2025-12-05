"""
Database models for sensor data, users, and alerts
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SensorData(Base):
    """Time-series sensor data from IoT devices"""
    __tablename__ = "sensor_data"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String, index=True, nullable=False)  # e.g., "raw_material_001"
    sensor_type = Column(String, nullable=False)  # "raw_material", "production_line", "warehouse"
    parameter = Column(String, nullable=False)  # "temperature", "vibration", "quantity", etc.
    value = Column(Float, nullable=False)
    unit = Column(String, default="")
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    is_anomaly = Column(Boolean, default=False)
    location = Column(String)  # Optional location identifier


class Alert(Base):
    """Alerts generated from thresholds or ML predictions"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String, index=True)
    sensor_type = Column(String, nullable=False)
    alert_type = Column(String, nullable=False)  # "threshold", "ml_anomaly", "prediction"
    severity = Column(String, default="medium")  # "low", "medium", "high", "critical"
    message = Column(String, nullable=False)
    value = Column(Float)
    threshold = Column(Float)  # For threshold-based alerts
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True))


class KPI(Base):
    """Key Performance Indicators calculated from sensor data"""
    __tablename__ = "kpis"
    
    id = Column(Integer, primary_key=True, index=True)
    kpi_name = Column(String, nullable=False)  # "OEE", "stock_level", "production_rate"
    sensor_type = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    target = Column(Float)
    unit = Column(String, default="")
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

