"""
Миграция для добавления всех недостающих колонок в таблицу defects
"""
import sqlite3
import os

# Путь к базе данных
DB_PATH = os.path.join(os.path.dirname(__file__), "integrity_os.db")

# Все колонки из модели Defect
COLUMNS_TO_ADD = {
    'pipeline_code': 'VARCHAR',
    'weld_distance': 'REAL',
    'section_number': 'INTEGER',
    'section_length': 'REAL',
    'measured_distance': 'REAL',
    'orientation': 'VARCHAR',
    'defect_type': 'VARCHAR NOT NULL',
    'identification': 'VARCHAR',
    'external_size': 'VARCHAR',
    'severity': 'VARCHAR NOT NULL',
    'length_mm': 'REAL',
    'width_mm': 'REAL',
    'max_depth_percent': 'REAL',
    'avg_depth_percent': 'REAL',
    'depth_mm': 'REAL',
    'wall_thickness': 'REAL',
    'remaining_wall': 'REAL',
    'erf_b31g': 'REAL',
    'erf_case1': 'REAL',
    'erf_case2': 'REAL',
    'erf_dnv': 'REAL',
    'surface_location': 'VARCHAR',
    'location_class': 'VARCHAR',
    'cluster_id': 'INTEGER',
    'latitude': 'REAL',
    'longitude': 'REAL',
    'elevation': 'REAL',
    'comment': 'VARCHAR',
    'inspection_date': 'DATETIME',
}

def migrate():
    """Добавить все недостающие колонки"""
    if not os.path.exists(DB_PATH):
        print(f"База данных {DB_PATH} не найдена. Она будет создана при следующем запуске приложения.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Проверить, существует ли таблица defects
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='defects'")
        if not cursor.fetchone():
            print("Таблица defects не найдена. Она будет создана при следующем запуске приложения.")
            return
        
        # Получить список существующих колонок
        cursor.execute("PRAGMA table_info(defects)")
        existing_columns = {column[1] for column in cursor.fetchall()}
        
        # Добавить недостающие колонки
        added_count = 0
        for column_name, column_type in COLUMNS_TO_ADD.items():
            if column_name not in existing_columns:
                try:
                    print(f"Добавление колонки {column_name}...")
                    cursor.execute(f"ALTER TABLE defects ADD COLUMN {column_name} {column_type}")
                    added_count += 1
                except sqlite3.OperationalError as e:
                    print(f"Ошибка при добавлении колонки {column_name}: {e}")
        
        if added_count > 0:
            conn.commit()
            print(f"\nУспешно добавлено {added_count} колонок!")
        else:
            print("Все необходимые колонки уже существуют.")
        
        # Показать финальную структуру таблицы
        cursor.execute("PRAGMA table_info(defects)")
        final_columns = [column[1] for column in cursor.fetchall()]
        print(f"\nТекущие колонки в таблице defects ({len(final_columns)}):")
        for col in sorted(final_columns):
            print(f"  - {col}")
        
    except Exception as e:
        print(f"Ошибка при миграции: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
