"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routes import auth
# from .routes import sensors, dashboard, analytics
# from .websocket import sio, simulate_and_broadcast
import asyncio
from datetime import datetime
# from .services.data_simulator import DataSimulator
# from .services.alert_service import AlertService
from .database import SessionLocal

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
fastapi_app = FastAPI(
    title="IntegrityOS API",
    description="MVP платформы IntegrityOS",
    version="1.0.0"
)

# CORS middleware
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
fastapi_app.include_router(auth.router)
# fastapi_app.include_router(sensors.router)
# fastapi_app.include_router(dashboard.router)
# fastapi_app.include_router(analytics.router)

# Socket.IO disabled
app = fastapi_app


@fastapi_app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("Starting IntegrityOS backend...")
    
    # Create default user if not exists
    db = SessionLocal()
    try:
        from .models import User
        from .auth import get_password_hash
        
        default_user = db.query(User).filter(User.username == "admin").first()
        if not default_user:
            default_user = User(
                username="admin",
                email="admin@integrity.os",
                hashed_password=get_password_hash("admin123")
            )
            db.add(default_user)
            db.commit()
            print("Created default admin user (username: admin, password: admin123)")
    finally:
        db.close()


@fastapi_app.get("/")
def root():
    """Корневой endpoint"""
    return {
        "message": "IntegrityOS API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@fastapi_app.get("/health")
def health_check():
    """Проверка работоспособности"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

