# QarTech - Industry 4.0 Factory Digitization Platform

A cloud-based SaaS web application for factory digitization focused on IoT sensor data from three key areas: raw material control, production line, and finished goods warehouse. The application provides real-time dashboards, alerts, and predictive analytics via AI.

## Features

- **Real-time Monitoring**: Live sensor data visualization with WebSocket support
- **Three Sensor Categories**: 
  - Raw Materials (temperature, humidity, quantity, vibration)
  - Production Line (temperature, vibration, production speed, брак rate, pressure)
  - Warehouse (temperature, humidity, stock levels, vibration)
- **KPIs**: OEE (Overall Equipment Effectiveness), stock levels, production rates
- **Alerts**: Threshold-based and ML-predicted anomaly detection
- **Analytics**: Stock shortage forecasts, anomaly detection using Isolation Forest
- **Data Export**: CSV and PDF export functionality
- **Authentication**: JWT-based secure authentication

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLite**: Database for MVP (easily upgradeable to PostgreSQL)
- **SQLAlchemy**: ORM for database operations
- **scikit-learn**: Machine learning for anomaly detection
- **python-socketio**: WebSocket support for real-time updates
- **pandas**: Data manipulation and analysis

### Frontend
- **React**: UI framework
- **Material-UI**: Component library
- **Chart.js**: Data visualization
- **Socket.io-client**: Real-time WebSocket client
- **Axios**: HTTP client

## Project Structure

```
QarTech/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py           # Database configuration
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── auth.py               # Authentication utilities
│   │   ├── websocket.py          # WebSocket handler
│   │   ├── routes/               # API routes
│   │   │   ├── auth.py
│   │   │   ├── sensors.py
│   │   │   ├── dashboard.py
│   │   │   └── analytics.py
│   │   └── services/             # Business logic
│   │       ├── data_simulator.py
│   │       ├── alert_service.py
│   │       └── ml_service.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API services
│   │   ├── contexts/             # React contexts
│   │   └── App.js
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables (optional):
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## Docker Deployment (Optional)

### Using Docker Compose

1. Build and run containers:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

### Individual Dockerfiles

Backend:
```bash
cd backend
docker build -f Dockerfile.backend -t qartech-backend .
docker run -p 8000:8000 qartech-backend
```

Frontend:
```bash
cd frontend
docker build -f Dockerfile.frontend -t qartech-frontend .
docker run -p 3000:3000 qartech-frontend
```

## Usage

### Dashboard

1. Login with default credentials
2. View real-time sensor data in three tabs:
   - Raw Materials
   - Production Line
   - Warehouse
3. Monitor KPIs at the top of the dashboard
4. View active alerts in the right panel

### Features

- **Real-time Updates**: Data updates automatically via WebSocket every 10 seconds
- **Charts**: Line charts for trends, gauge charts for KPIs
- **Alerts**: Automatic threshold and ML-based anomaly detection
- **Export**: Download data as CSV or PDF reports

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### Sensors
- `GET /api/sensors/types` - Get sensor types
- `GET /api/sensors/{sensor_type}/data` - Get sensor data
- `GET /api/sensors/{sensor_type}/latest` - Get latest sensor data
- `POST /api/sensors/{sensor_type}/simulate` - Manually trigger simulation

#### Dashboard
- `GET /api/dashboard/kpis` - Get KPIs
- `GET /api/dashboard/alerts` - Get alerts
- `GET /api/dashboard/summary` - Get dashboard summary

#### Analytics
- `GET /api/analytics/forecast/{sensor_id}` - Get stock forecast
- `GET /api/analytics/anomalies/{sensor_id}` - Get ML anomalies
- `GET /api/analytics/export/csv` - Export CSV
- `GET /api/analytics/export/pdf` - Export PDF

## Data Simulation

The application automatically generates synthetic sensor data every 10 seconds. The simulator:
- Generates realistic sensor values with Gaussian noise
- Introduces occasional anomalies (5% probability)
- Maintains realistic patterns for each sensor type
- Updates KPIs periodically

## Machine Learning

The ML service uses **Isolation Forest** for anomaly detection:
- Trains on recent sensor data (last 24-48 hours)
- Detects anomalies in real-time
- Provides forecasts for stock shortages using linear regression

## Security Notes

⚠️ **For Production**:
- Change the `SECRET_KEY` in `backend/app/auth.py`
- Use environment variables for sensitive configuration
- Implement proper CORS policies
- Use HTTPS
- Consider upgrading to PostgreSQL for production
- Add rate limiting
- Implement proper password policies

## Testing

### Backend Testing
```bash
cd backend
pytest  # If tests are added
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Troubleshooting

### Backend Issues
- Ensure Python 3.8+ is installed
- Check that all dependencies are installed
- Verify database file permissions (SQLite)
- Check port 8000 is not in use

### Frontend Issues
- Clear browser cache
- Check Node.js version (16+)
- Delete `node_modules` and reinstall
- Verify API URL in `.env`

### WebSocket Issues
- Ensure backend is running
- Check CORS settings
- Verify WebSocket URL in frontend `.env`

## Future Enhancements

- [ ] Upgrade to PostgreSQL/InfluxDB for time-series data
- [ ] Add MQTT integration for real IoT devices
- [ ] Implement user roles and permissions
- [ ] Add more ML models (LSTM for forecasting)
- [ ] Mobile app (React Native)
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] Historical data analysis
- [ ] Custom alert rules configuration

## License

This project is for educational/demonstration purposes.

## Support

For issues or questions, please refer to the project documentation or contact the development team.

---

**Built for Industry 4.0 in Kazakhstan** 🇰🇿

