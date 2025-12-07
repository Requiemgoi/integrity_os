"""
WebSocket handler for real-time updates
"""
import socketio
from sqlalchemy.orm import Session
from datetime import datetime
from .database import SessionLocal
from .services.data_simulator import DataSimulator
from .services.alert_service import AlertService
from .models import SensorData, Alert

# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode='asgi')
socket_app = socketio.ASGIApp(sio)

data_simulator = DataSimulator()
alert_service = AlertService()


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    print(f"Connection details: {environ.get('REMOTE_ADDR', 'unknown')}")
    await sio.emit("message", {"data": "Connected to IntegrityOS WebSocket"}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")


@sio.event
async def connect_error(sid, data):
    """Handle connection errors"""
    print(f"Connection error for {sid}: {data}")


@sio.event
async def subscribe(sid, data):
    """Subscribe to sensor type updates"""
    sensor_type = data.get("sensor_type")
    if sensor_type:
        sio.enter_room(sid, sensor_type)
        await sio.emit("subscribed", {"sensor_type": sensor_type}, room=sid)


async def broadcast_sensor_data(sensor_type: str, data_points: list):
    """Broadcast sensor data to subscribed clients"""
    await sio.emit(
        "sensor_data",
        {
            "sensor_type": sensor_type,
            "data": [
                {
                    "sensor_id": d.sensor_id,
                    "parameter": d.parameter,
                    "value": d.value,
                    "unit": d.unit,
                    "timestamp": d.timestamp.isoformat(),
                    "is_anomaly": d.is_anomaly
                }
                for d in data_points
            ]
        },
        room=sensor_type
    )


async def broadcast_alert(alert: Alert):
    """Broadcast alert to all connected clients"""
    await sio.emit(
        "alert",
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
    )


async def simulate_and_broadcast(sensor_type: str):
    """Simulate sensor data and broadcast via WebSocket"""
    db = SessionLocal()
    try:
        # Generate sensor data
        data_points = data_simulator.save_sensor_data(db, sensor_type)
        
        # Process alerts
        for point in data_points:
            alerts = alert_service.process_sensor_data(db, point)
            for alert in alerts:
                await broadcast_alert(alert)
        
        # Broadcast sensor data
        await broadcast_sensor_data(sensor_type, data_points)
        
    finally:
        db.close()

