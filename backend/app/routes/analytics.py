"""
Analytics routes for predictions and exports
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict
import pandas as pd
import io
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from ..database import get_db
from ..models import SensorData, Alert, KPI, User
from ..auth import get_current_user
from ..services.ml_service import MLService

router = APIRouter(prefix="/api/analytics", tags=["Аналитика"])

ml_service = MLService()


@router.get("/trends", summary="Тренды", description="Получить анализ трендов по типу сенсора")
def get_trends(
    sensor_type: str,
    period: str = "24h",
    start_date: str = None,
    end_date: str = None,
    metric: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить анализ трендов для типа сенсора
    
    Параметры:
    - sensor_type: Тип сенсора (raw_material, production_line, warehouse)
    - period: Период анализа (1h, 24h, 7d, 30d)
    - start_date: Начальная дата (ISO формат, опционально)
    - end_date: Конечная дата (ISO формат, опционально)
    - metric: Конкретная метрика для анализа (опционально)
    """
    
    # Определяем временной диапазон
    if start_date and end_date:
        cutoff_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        # Парсим period
        period_hours = {
            '1h': 1,
            '24h': 24,
            '7d': 168,
            '30d': 720
        }.get(period, 24)
        
        end_time = datetime.utcnow()
        cutoff_time = end_time - timedelta(hours=period_hours)
    
    # Получаем данные из БД
    query = db.query(SensorData).filter(
        SensorData.sensor_type == sensor_type,
        SensorData.timestamp >= cutoff_time,
        SensorData.timestamp <= end_time
    )
    
    if metric:
        query = query.filter(SensorData.parameter == metric)
    
    data = query.order_by(SensorData.timestamp).all()
    
    if not data:
        return {
            "metrics": [],
            "overview": None,
            "detailed": [],
            "summary": []
        }
    
    # Группируем данные по параметрам
    parameters = {}
    for d in data:
        if d.parameter not in parameters:
            parameters[d.parameter] = []
        parameters[d.parameter].append({
            "timestamp": d.timestamp.isoformat(),
            "value": d.value,
            "unit": d.unit,
            "is_anomaly": d.is_anomaly
        })
    
    # Формируем список метрик
    metrics = [
        {"key": param, "name": param.replace('_', ' ').title()}
        for param in parameters.keys()
    ]
    
    # Вычисляем summary (процентные изменения)
    summary = []
    for param, values in parameters.items():
        if len(values) >= 2:
            # Сравниваем средние за первую и вторую половину периода
            mid = len(values) // 2
            first_half_avg = sum(v["value"] for v in values[:mid]) / mid
            second_half_avg = sum(v["value"] for v in values[mid:]) / (len(values) - mid)
            
            if first_half_avg != 0:
                change = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            else:
                change = 0
            
            summary.append({
                "name": param.replace('_', ' ').title(),
                "change": round(change, 2)
            })
    
    # Формируем overview данные (все метрики на одном графике)
    overview_data = []
    for d in data:
        overview_data.append({
            "timestamp": d.timestamp.isoformat(),
            "parameter": d.parameter,
            "value": d.value,
            "name": d.parameter.replace('_', ' ').title()
        })
    
    # Формируем detailed данные (отдельный график для каждой метрики)
    detailed = []
    for param, values in parameters.items():
        detailed.append({
            "title": param.replace('_', ' ').title(),
            "dataKey": "value",
            "name": param,
            "data": values
        })
    
    return {
        "metrics": metrics,
        "overview": overview_data if overview_data else None,
        "detailed": detailed,
        "summary": summary
    }


@router.get("/forecast/{sensor_id}", summary="Прогноз", description="Получить прогноз дефицита запасов для сенсора")
def get_forecast(
    sensor_id: str,
    days_ahead: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить прогноз дефицита запасов для сенсора"""
    forecast = ml_service.forecast_stock_shortage(db, sensor_id, days_ahead)
    return forecast


@router.get("/anomalies/{sensor_id}", summary="Аномалии", description="Получить аномалии, обнаруженные ML для сенсора")
def get_anomalies(
    sensor_id: str,
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить аномалии, обнаруженные ML для сенсора"""
    anomalies = ml_service.predict_anomalies(db, sensor_id, hours)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.get("/forecast-parameter/{sensor_id}/{parameter}", 
            summary="Прогноз параметра (Prophet)", 
            description="Получить прогноз параметра сенсора с использованием Prophet")
def get_forecast_parameter(
    sensor_id: str,
    parameter: str,
    horizon: int = 24,
    hours_history: int = 168,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить прогноз параметра сенсора с использованием Prophet"""
    forecast = ml_service.forecast_parameter(
        db, sensor_id, parameter, horizon, hours_history
    )
    return forecast


@router.get("/anomalies-autoencoder/{sensor_id}/{parameter}",
            summary="Аномалии (Autoencoder)",
            description="Получить аномалии, обнаруженные автоэнкодером")
def get_anomalies_autoencoder(
    sensor_id: str,
    parameter: str,
    hours: int = 24,
    window_size: int = 10,
    threshold: float = 0.1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить аномалии, обнаруженные автоэнкодером"""
    anomalies = ml_service.predict_anomalies_autoencoder(
        db, sensor_id, parameter, hours, window_size, threshold
    )
    return {"anomalies": anomalies, "count": len(anomalies), "method": "autoencoder"}


@router.post("/train-autoencoder/{sensor_id}/{parameter}",
             summary="Обучить автоэнкодер",
             description="Обучить автоэнкодер для детекции аномалий")
def train_autoencoder(
    sensor_id: str,
    parameter: str,
    window_size: int = 10,
    hours_history: int = 168,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обучить автоэнкодер для детекции аномалий"""
    result = ml_service.train_autoencoder(
        db, sensor_id, parameter, window_size, hours_history
    )
    if result.get("success", False):
        return {
            "message": result.get("message", "Autoencoder trained successfully"),
            "sensor_id": sensor_id,
            "parameter": parameter,
            "training_details": {
                "epochs": result.get("epochs", 0),
                "final_loss": result.get("final_loss", 0.0),
                "initial_loss": result.get("initial_loss", 0.0),
                "data_points": result.get("data_points", 0),
                "windows": result.get("windows", 0),
                "window_size": result.get("window_size", 0)
            }
        }
    else:
        error_msg = result.get("message", "Failed to train autoencoder. Check if enough data is available.")
        raise HTTPException(status_code=400, detail=error_msg)


@router.get("/export/csv", summary="Экспорт CSV", description="Экспортировать данные сенсоров в CSV")
def export_csv(
    sensor_type: str = None,
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Экспортировать данные сенсоров в CSV"""
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    query = db.query(SensorData).filter(
        SensorData.timestamp >= cutoff_time
    )
    
    if sensor_type:
        query = query.filter(SensorData.sensor_type == sensor_type)
    
    data = query.order_by(SensorData.timestamp).all()
    
    # Convert to DataFrame
    df = pd.DataFrame([
        {
            "sensor_id": d.sensor_id,
            "sensor_type": d.sensor_type,
            "parameter": d.parameter,
            "value": d.value,
            "unit": d.unit,
            "timestamp": d.timestamp.isoformat(),
            "is_anomaly": d.is_anomaly
        }
        for d in data
    ])
    
    # Create CSV in memory
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sensor_data_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )


@router.get("/export/pdf", summary="Экспорт PDF", description="Экспортировать сводку дашборда в PDF")
def export_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Экспортировать сводку дашборда в PDF"""
    # Get summary data
    sensor_types = ["raw_material", "production_line", "warehouse"]
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph("Отчет QarTech Dashboard", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Get latest KPIs
    kpis = db.query(KPI).order_by(KPI.timestamp.desc()).limit(10).all()
    if kpis:
        story.append(Paragraph("Ключевые показатели эффективности", styles["Heading2"]))
        kpi_data = [["Название KPI", "Значение", "Цель", "Единица", "Время"]]
        for kpi in kpis[:10]:
            kpi_data.append([
                kpi.kpi_name,
                str(kpi.value),
                str(kpi.target) if kpi.target else "Н/Д",
                kpi.unit,
                kpi.timestamp.strftime("%Y-%m-%d %H:%M")
            ])
        
        kpi_table = Table(kpi_data)
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 12))
    
    # Get active alerts
    alerts = db.query(Alert).filter(Alert.is_resolved == False).limit(20).all()
    if alerts:
        story.append(Paragraph("Активные оповещения", styles["Heading2"]))
        alert_data = [["ID сенсора", "Тип", "Важность", "Сообщение", "Время"]]
        for alert in alerts:
            alert_data.append([
                alert.sensor_id,
                alert.alert_type,
                alert.severity,
                alert.message[:50] + "..." if len(alert.message) > 50 else alert.message,
                alert.created_at.strftime("%Y-%m-%d %H:%M")
            ])
        
        alert_table = Table(alert_data)
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ("GRID", (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(alert_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dashboard_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"}
    )

