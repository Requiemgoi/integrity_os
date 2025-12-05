"""
Machine Learning service for anomaly detection and forecasting
Supports: Isolation Forest, Prophet (forecasting), Autoencoder (anomaly detection)
"""
import numpy as np
import os
import pickle
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from ..models import SensorData

logger = logging.getLogger(__name__)

# Optional imports for advanced ML
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


# Autoencoder class for anomaly detection
if TORCH_AVAILABLE:
    class Autoencoder(nn.Module):
        """Simple autoencoder for time series anomaly detection"""
        def __init__(self, input_dim: int, encoding_dim: int = 8):
            super(Autoencoder, self).__init__()
            self.encoder = nn.Sequential(
                nn.Linear(input_dim, 16),
                nn.ReLU(),
                nn.Linear(16, encoding_dim),
                nn.ReLU()
            )
            self.decoder = nn.Sequential(
                nn.Linear(encoding_dim, 16),
                nn.ReLU(),
                nn.Linear(16, input_dim),
                nn.Sigmoid()
            )
        
        def forward(self, x):
            encoded = self.encoder(x)
            decoded = self.decoder(encoded)
            return decoded


class MLService:
    """ML service for anomaly detection and predictions"""
    
    def __init__(self):
        self.models = {}  # Cache models per sensor type (Isolation Forest)
        self.scalers = {}
        self.prophet_models = {}  # Cache Prophet models
        self.prophet_failed = set()  # Track failed Prophet initializations to avoid retrying
        self.autoencoders = {}  # Cache autoencoder models
        self.autoencoder_scalers = {}  # Scalers for autoencoders
        self.contamination = 0.1  # Expected proportion of anomalies
        self.models_dir = "ml_models"  # Directory to save models
        os.makedirs(self.models_dir, exist_ok=True)
    
    def prepare_training_data(self, db: Session, sensor_id: str, hours: int = 24) -> np.ndarray:
        """Prepare training data from recent sensor readings"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get recent data
        recent_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp).all()
        
        if len(recent_data) < 10:
            return None
        
        # Extract values
        values = np.array([[d.value] for d in recent_data])
        return values
    
    def train_model(self, sensor_id: str, training_data: np.ndarray):
        """Train Isolation Forest model for a sensor"""
        if training_data is None or len(training_data) < 10:
            return None
        
        # Scale the data
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(training_data)
        
        # Train Isolation Forest
        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        model.fit(scaled_data)
        
        # Cache model and scaler
        self.models[sensor_id] = model
        self.scalers[sensor_id] = scaler
        
        return model
    
    def detect_anomaly(self, sensor_id: str, value: float) -> bool:
        """Detect if a value is anomalous using trained model"""
        if sensor_id not in self.models:
            return False
        
        model = self.models[sensor_id]
        scaler = self.scalers[sensor_id]
        
        # Scale the value
        scaled_value = scaler.transform([[value]])
        
        # Predict (-1 for anomaly, 1 for normal)
        prediction = model.predict(scaled_value)[0]
        
        return prediction == -1
    
    def predict_anomalies(self, db: Session, sensor_id: str, hours: int = 24) -> List[Dict]:
        """Predict anomalies for recent sensor data"""
        # Prepare training data
        training_data = self.prepare_training_data(db, sensor_id, hours * 2)
        
        if training_data is None:
            return []
        
        # Train or use cached model
        if sensor_id not in self.models:
            self.train_model(sensor_id, training_data)
        
        if sensor_id not in self.models:
            return []
        
        # Get recent data for prediction
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp.desc()).limit(100).all()
        
        anomalies = []
        for data_point in recent_data:
            is_anomaly = self.detect_anomaly(sensor_id, data_point.value)
            if is_anomaly:
                anomalies.append({
                    "sensor_id": sensor_id,
                    "value": data_point.value,
                    "timestamp": data_point.timestamp.isoformat(),
                    "parameter": data_point.parameter
                })
        
        return anomalies
    
    def forecast_stock_shortage(self, db: Session, sensor_id: str, days_ahead: int = 7) -> Dict:
        """Simple linear regression forecast for stock levels"""
        cutoff_time = datetime.utcnow() - timedelta(days=30)
        
        # Get historical stock data
        stock_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.parameter == "stock_level",
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp).all()
        
        if len(stock_data) < 10:
            return {"forecast": None, "shortage_risk": "unknown"}
        
        # Simple trend calculation
        values = [d.value for d in stock_data]
        timestamps = [(d.timestamp - stock_data[0].timestamp).total_seconds() / 86400 
                     for d in stock_data]
        
        # Linear regression
        n = len(values)
        sum_x = sum(timestamps)
        sum_y = sum(values)
        sum_xy = sum(x * y for x, y in zip(timestamps, values))
        sum_x2 = sum(x * x for x in timestamps)
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
        
        # Forecast
        future_days = timestamps[-1] + days_ahead
        forecast_value = slope * future_days + intercept
        
        # Determine shortage risk
        current_value = values[-1]
        threshold = current_value * 0.2  # 20% of current stock
        
        if forecast_value < threshold:
            risk = "high"
        elif forecast_value < threshold * 2:
            risk = "medium"
        else:
            risk = "low"
        
        return {
            "forecast": round(forecast_value, 2),
            "current": round(current_value, 2),
            "days_ahead": days_ahead,
            "shortage_risk": risk,
            "trend": "decreasing" if slope < 0 else "increasing"
        }
    
    def forecast_parameter(self, db: Session, sensor_id: str, parameter: str, 
                           horizon: int = 24, hours_history: int = 168) -> Dict:
        """
        Forecast parameter values using Prophet
        
        Args:
            db: Database session
            sensor_id: Sensor ID
            parameter: Parameter name (e.g., 'temperature', 'humidity')
            horizon: Number of hours to forecast ahead
            hours_history: Number of hours of historical data to use
        
        Returns:
            Dict with forecast data points and confidence intervals
        """
        if not PROPHET_AVAILABLE:
            return {
                "error": "Prophet not installed. Install with: pip install prophet",
                "forecast": None
            }
        
        # Get historical data
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_history)
        historical_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.parameter == parameter,
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp).all()
        
        if len(historical_data) < 24:  # Need at least 24 data points
            return {
                "error": "Insufficient historical data",
                "forecast": None
            }
        
        # Prepare data for Prophet (needs 'ds' and 'y' columns)
        df = []
        for point in historical_data:
            df.append({
                'ds': point.timestamp,
                'y': float(point.value)
            })
        
        import pandas as pd
        prophet_df = pd.DataFrame(df)
        
        # Check cache or train new model
        model_key = f"{sensor_id}_{parameter}"
        
        # If Prophet initialization failed before, skip retry and use linear forecast
        if model_key in self.prophet_failed:
            return self._simple_linear_forecast(historical_data, horizon)
        
        if model_key not in self.prophet_models:
            # Try to train Prophet model
            try:
                model = Prophet(
                    stan_backend="CMDSTANPY",
                    daily_seasonality=True,
                    weekly_seasonality=True,
                    yearly_seasonality=False,
                    interval_width=0.95
                )
                model.fit(prophet_df)
                self.prophet_models[model_key] = model
            except Exception as e:
                # If Prophet fails, mark as failed and use simple linear forecast
                self.prophet_failed.add(model_key)
                logger.warning(
                    f"Prophet initialization failed for {model_key}: {e}. "
                    "Using simple linear forecast. This error will not be logged again for this model."
                )
                return self._simple_linear_forecast(historical_data, horizon)
        
        try:
            model = self.prophet_models[model_key]
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=horizon, freq='H')
            forecast = model.predict(future)
            
            # Get only future predictions
            future_forecast = forecast.tail(horizon)
            
            # Format response
            forecast_points = []
            for _, row in future_forecast.iterrows():
                forecast_points.append({
                    "timestamp": row['ds'].isoformat(),
                    "value": round(float(row['yhat']), 2),
                    "lower_bound": round(float(row['yhat_lower']), 2),
                    "upper_bound": round(float(row['yhat_upper']), 2)
                })
            
            return {
                "forecast": forecast_points,
                "horizon_hours": horizon,
                "current_value": float(historical_data[-1].value),
                "model_type": "prophet"
            }
        except Exception as e:
            # If Prophet prediction fails, mark as failed and use simple linear forecast
            self.prophet_failed.add(model_key)
            logger.warning(
                f"Prophet prediction failed for {model_key}: {e}. "
                "Using simple linear forecast. This error will not be logged again for this model."
            )
            return self._simple_linear_forecast(historical_data, horizon)
    
    def _simple_linear_forecast(self, historical_data: List, horizon: int) -> Dict:
        """Simple linear regression forecast as fallback"""
        if len(historical_data) < 2:
            return {
                "error": "Insufficient data for forecast",
                "forecast": None
            }
        
        # Extract values and timestamps
        values = [float(d.value) for d in historical_data]
        timestamps = [(d.timestamp - historical_data[0].timestamp).total_seconds() / 3600 
                     for d in historical_data]  # hours
        
        # Linear regression
        n = len(values)
        sum_x = sum(timestamps)
        sum_y = sum(values)
        sum_xy = sum(x * y for x, y in zip(timestamps, values))
        sum_x2 = sum(x * x for x in timestamps)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            # If no variance, use constant value
            slope = 0
            intercept = values[-1]
        else:
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            intercept = (sum_y - slope * sum_x) / n
        
        # Calculate standard deviation for confidence intervals
        residuals = [values[i] - (slope * timestamps[i] + intercept) for i in range(n)]
        std_dev = np.std(residuals) if len(residuals) > 1 else abs(values[-1] * 0.1)
        
        # Generate forecast points
        forecast_points = []
        last_timestamp = historical_data[-1].timestamp
        current_value = values[-1]
        
        for i in range(1, horizon + 1):
            future_hours = timestamps[-1] + i
            forecast_value = slope * future_hours + intercept
            forecast_timestamp = last_timestamp + timedelta(hours=i)
            
            # Simple confidence interval: ±2 standard deviations
            forecast_points.append({
                "timestamp": forecast_timestamp.isoformat(),
                "value": round(forecast_value, 2),
                "lower_bound": round(forecast_value - 2 * std_dev, 2),
                "upper_bound": round(forecast_value + 2 * std_dev, 2)
            })
        
        return {
            "forecast": forecast_points,
            "horizon_hours": horizon,
            "current_value": round(current_value, 2),
            "model_type": "linear_fallback"
        }
    
    def train_autoencoder(self, db: Session, sensor_id: str, parameter: str,
                         window_size: int = 10, hours_history: int = 168) -> Dict:
        """
        Train autoencoder for anomaly detection
        
        Args:
            db: Database session
            sensor_id: Sensor ID
            parameter: Parameter name
            window_size: Size of sliding window for time series
            hours_history: Hours of historical data to use
        
        Returns:
            Dict with training results: {"success": bool, "epochs": int, "final_loss": float, 
                                        "data_points": int, "windows": int, "message": str}
        """
        if not TORCH_AVAILABLE:
            return {"success": False, "message": "PyTorch not available"}
        
        # Get historical data
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_history)
        historical_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.parameter == parameter,
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp).all()
        
        if len(historical_data) < window_size * 2:
            return {
                "success": False, 
                "message": f"Insufficient data: need at least {window_size * 2} points, got {len(historical_data)}"
            }
        
        # Create sliding windows
        values = np.array([float(d.value) for d in historical_data])
        
        # Normalize data
        scaler = MinMaxScaler()
        values_scaled = scaler.fit_transform(values.reshape(-1, 1)).flatten()
        
        # Create windows
        windows = []
        for i in range(len(values_scaled) - window_size + 1):
            windows.append(values_scaled[i:i + window_size])
        
        if len(windows) < 10:
            return {
                "success": False,
                "message": f"Insufficient windows: need at least 10, got {len(windows)}"
            }
        
        X = np.array(windows)
        
        # Convert to PyTorch tensors
        X_tensor = torch.FloatTensor(X)
        
        # Initialize and train autoencoder
        model_key = f"{sensor_id}_{parameter}"
        autoencoder = Autoencoder(input_dim=window_size, encoding_dim=max(4, window_size // 4))
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(autoencoder.parameters(), lr=0.001)
        
        # Training loop
        num_epochs = 50
        batch_size = 32
        logger.info(f"Starting autoencoder training for {model_key}: {len(windows)} windows, {num_epochs} epochs")
        
        epoch_losses = []
        for epoch in range(num_epochs):
            # Shuffle data
            indices = torch.randperm(len(X_tensor))
            X_shuffled = X_tensor[indices]
            
            epoch_loss = 0.0
            batch_count = 0
            
            for i in range(0, len(X_shuffled), batch_size):
                batch = X_shuffled[i:i + batch_size]
                
                # Forward pass
                reconstructed = autoencoder(batch)
                loss = criterion(reconstructed, batch)
                
                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
                batch_count += 1
            
            avg_epoch_loss = epoch_loss / batch_count if batch_count > 0 else 0.0
            epoch_losses.append(avg_epoch_loss)
            
            # Log progress every 10 epochs
            if (epoch + 1) % 10 == 0 or epoch == 0:
                logger.info(f"Epoch {epoch + 1}/{num_epochs} - Loss: {avg_epoch_loss:.6f}")
        
        final_loss = epoch_losses[-1] if epoch_losses else 0.0
        logger.info(f"Training completed for {model_key}. Final loss: {final_loss:.6f}")
        
        # Save model and scaler
        self.autoencoders[model_key] = autoencoder
        self.autoencoder_scalers[model_key] = scaler
        
        # Save to disk
        model_path = os.path.join(self.models_dir, f"autoencoder_{model_key}.pth")
        scaler_path = os.path.join(self.models_dir, f"scaler_{model_key}.pkl")
        torch.save(autoencoder.state_dict(), model_path)
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        return {
            "success": True,
            "epochs": num_epochs,
            "final_loss": round(final_loss, 6),
            "initial_loss": round(epoch_losses[0], 6) if epoch_losses else 0.0,
            "data_points": len(historical_data),
            "windows": len(windows),
            "window_size": window_size,
            "message": f"Autoencoder trained successfully. Loss improved from {epoch_losses[0]:.6f} to {final_loss:.6f}" if epoch_losses else "Training completed"
        }
    
    def detect_anomaly_autoencoder(self, sensor_id: str, parameter: str, 
                                  values: List[float], threshold: float = 0.1) -> Tuple[bool, float]:
        """
        Detect anomaly using trained autoencoder
        
        Args:
            sensor_id: Sensor ID
            parameter: Parameter name
            values: List of recent values (should match window_size used in training)
            threshold: Reconstruction error threshold for anomaly detection
        
        Returns:
            Tuple of (is_anomaly, reconstruction_error)
        """
        if not TORCH_AVAILABLE:
            return False, 0.0
        
        model_key = f"{sensor_id}_{parameter}"
        
        if model_key not in self.autoencoders:
            return False, 0.0
        
        autoencoder = self.autoencoders[model_key]
        scaler = self.autoencoder_scalers[model_key]
        
        # Normalize input
        values_array = np.array(values).reshape(-1, 1)
        values_scaled = scaler.transform(values_array).flatten()
        
        # Convert to tensor
        input_tensor = torch.FloatTensor(values_scaled).unsqueeze(0)
        
        # Get reconstruction
        autoencoder.eval()
        with torch.no_grad():
            reconstructed = autoencoder(input_tensor)
            reconstruction_error = torch.mean((input_tensor - reconstructed) ** 2).item()
        
        is_anomaly = reconstruction_error > threshold
        
        return is_anomaly, reconstruction_error
    
    def predict_anomalies_autoencoder(self, db: Session, sensor_id: str, parameter: str,
                                     hours: int = 24, window_size: int = 10,
                                     threshold: float = 0.1) -> List[Dict]:
        """
        Predict anomalies using autoencoder for recent sensor data
        
        Args:
            db: Database session
            sensor_id: Sensor ID
            parameter: Parameter name
            hours: Hours of recent data to check
            window_size: Window size for autoencoder
            threshold: Reconstruction error threshold
        
        Returns:
            List of detected anomalies
        """
        if not TORCH_AVAILABLE:
            return []
        
        # Train model if not exists
        model_key = f"{sensor_id}_{parameter}"
        if model_key not in self.autoencoders:
            # Try to load from disk
            model_path = os.path.join(self.models_dir, f"autoencoder_{model_key}.pth")
            scaler_path = os.path.join(self.models_dir, f"scaler_{model_key}.pkl")
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                # Load model
                autoencoder = Autoencoder(input_dim=window_size, encoding_dim=max(4, window_size // 4))
                autoencoder.load_state_dict(torch.load(model_path))
                autoencoder.eval()
                
                with open(scaler_path, 'rb') as f:
                    scaler = pickle.load(f)
                
                self.autoencoders[model_key] = autoencoder
                self.autoencoder_scalers[model_key] = scaler
            else:
                # Train new model
                if not self.train_autoencoder(db, sensor_id, parameter, window_size):
                    return []
        
        # Get recent data
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_data = db.query(SensorData).filter(
            SensorData.sensor_id == sensor_id,
            SensorData.parameter == parameter,
            SensorData.timestamp >= cutoff_time
        ).order_by(SensorData.timestamp).all()
        
        if len(recent_data) < window_size:
            return []
        
        anomalies = []
        
        # Check each window
        for i in range(len(recent_data) - window_size + 1):
            window_data = recent_data[i:i + window_size]
            values = [float(d.value) for d in window_data]
            
            is_anomaly, error = self.detect_anomaly_autoencoder(
                sensor_id, parameter, values, threshold
            )
            
            if is_anomaly:
                # Use the last point in window as anomaly
                anomaly_point = window_data[-1]
                anomalies.append({
                    "sensor_id": sensor_id,
                    "parameter": parameter,
                    "value": float(anomaly_point.value),
                    "timestamp": anomaly_point.timestamp.isoformat(),
                    "reconstruction_error": round(error, 4),
                    "method": "autoencoder"
                })
        
        return anomalies

