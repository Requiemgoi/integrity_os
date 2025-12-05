@echo off
REM Скрипт для тестирования trends API endpoint
echo ========================================
echo Тестирование /api/analytics/trends API
echo ========================================
echo.

REM Сначала получаем токен
echo [1/2] Получение токена авторизации...
curl -X POST "http://localhost:8000/api/auth/login" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "username=admin&password=admin123" > token_response.json

echo.
echo [2/2] Тестирование trends endpoint...
echo.

REM Тестируем trends API (замените TOKEN на реальный токен из token_response.json)
curl "http://localhost:8000/api/analytics/trends?sensor_type=raw_material&period=24h" ^
  -H "Accept: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

echo.
echo ========================================
echo Тест завершен!
echo ========================================
pause

