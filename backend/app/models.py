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


class Pipeline(Base):
    """Pipeline geometry data (MT-01, MT-02, MT-03)"""
    __tablename__ = "pipelines"
    
    id = Column(Integer, primary_key=True, index=True)
    pipeline_code = Column(String, nullable=False, index=True)  # "MT-01", "MT-02", "MT-03"
    name = Column(String)
    geometry = Column(String, nullable=False)  # JSON string with coordinates
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Object(Base):
    """Pipeline objects (stations, valves, etc.)"""
    __tablename__ = "objects"
    
    id = Column(Integer, primary_key=True, index=True)
    object_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    object_type = Column(String)  # "station", "valve", "pump", etc.
    pipeline_code = Column(String, index=True)  # Reference to pipeline
    latitude = Column(Float)
    longitude = Column(Float)
    param1 = Column(Float)  # Additional parameter
    param2 = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    defects = relationship("Defect", back_populates="object")


class Defect(Base):
    """Defects found during ILI inspections (внутритрубная диагностика)"""
    __tablename__ = "defects"
    
    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String, unique=True, index=True, nullable=False)
    pipeline_code = Column(String, index=True)  # MT-01, MT-02, MT-03
    object_id = Column(Integer, ForeignKey("objects.id"), index=True, nullable=True)
    
    # Location on pipeline
    weld_distance = Column(Float)  # шов на [м] - distance to weld
    section_number = Column(Integer)  # № секции
    section_length = Column(Float)  # длина секции [м]
    measured_distance = Column(Float)  # измер. расст. [м]
    orientation = Column(String)  # ориентация (время на циферблате)
    
    # Defect classification
    defect_type = Column(String, nullable=False)  # тип аномалии: потеря металла, вмятина, расслоение
    identification = Column(String)  # идентификация: коррозия, механическое повреждение
    external_size = Column(String)  # внеш. размеры: ЯЗВА, ОБЩАЯ и т.д.
    severity = Column(String, nullable=False)  # low, medium, high, critical
    
    # Dimensions
    length_mm = Column(Float)  # длина [мм]
    width_mm = Column(Float)  # ширина [мм]
    max_depth_percent = Column(Float)  # макс. глубина [%]
    avg_depth_percent = Column(Float)  # средняя глубина [%]
    depth_mm = Column(Float)  # глубина [мм]
    
    # Wall thickness
    wall_thickness = Column(Float)  # прив.ТС [мм] - приведённая толщина стенки
    remaining_wall = Column(Float)  # остат. ТС [мм]
    
    # Risk factors (ERF - Estimated Repair Factor)
    erf_b31g = Column(Float)  # ERF B31G
    erf_case1 = Column(Float)  # ERF (случай 1)
    erf_case2 = Column(Float)  # ERF (случай 2)
    erf_dnv = Column(Float)  # ERF DNV
    
    # Location
    surface_location = Column(String)  # локация на поверхн.: ВНШ, внешняя, внутренняя
    location_class = Column(String)  # класс лок.
    cluster_id = Column(Integer)  # № кластера
    
    # Coordinates
    latitude = Column(Float)  # Широта [°]
    longitude = Column(Float)  # Долгота [°]
    elevation = Column(Float)  # высота [м]
    
    # Metadata
    comment = Column(String)  # комментарий
    inspection_date = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    object = relationship("Object", back_populates="defects")

