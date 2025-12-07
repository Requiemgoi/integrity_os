"""
Миграция для изменения старых колонок (method, param1, param2, depth, description) на nullable
"""
import sqlite3
import os

# Путь к базе данных
DB_PATH = os.path.join(os.path.dirname(__file__), "integrity_os.db")

# Старые колонки, которые должны быть nullable
OLD_COLUMNS = ['method', 'param1', 'param2', 'depth', 'description']

def migrate():
    """Изменить старые колонки на nullable"""
    if not os.path.exists(DB_PATH):
        print(f"База данных {DB_PATH} не найдена.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("Проверка структуры таблицы defects...")
        
        # Получить информацию о всех колонках
        cursor.execute("PRAGMA table_info(defects)")
        columns = cursor.fetchall()
        
        # Найти колонки, которые нужно изменить
        columns_to_fix = []
        for col in columns:
            col_name = col[1]
            if col_name in OLD_COLUMNS and col[3] == 1:  # NOT NULL
                columns_to_fix.append(col_name)
        
        if not columns_to_fix:
            print("Все старые колонки уже nullable или не существуют.")
            return
        
        print(f"Найдены колонки с NOT NULL, которые нужно изменить: {columns_to_fix}")
        print("Пересоздание таблицы...")
        
        # Получить все колонки и их определения
        column_defs = []
        for col in columns:
            col_name = col[1]
            col_type = col[2]
            not_null = "NOT NULL" if col[3] else ""
            default_val = f"DEFAULT {col[4]}" if col[4] is not None else ""
            pk = "PRIMARY KEY" if col[5] else ""
            
            # Для старых колонок убрать NOT NULL
            if col_name in OLD_COLUMNS:
                not_null = ""
            
            col_def = f"{col_name} {col_type}"
            if pk:
                col_def += f" {pk}"
            if not_null:
                col_def += f" {not_null}"
            if default_val:
                col_def += f" {default_val}"
            
            column_defs.append(col_def)
        
        # Удалить временную таблицу если она существует
        cursor.execute("DROP TABLE IF EXISTS defects_new")
        
        # Создать SQL для создания новой таблицы
        create_sql = f"""
            CREATE TABLE defects_new (
                {', '.join(column_defs)},
                FOREIGN KEY(object_id) REFERENCES objects(id)
            )
        """
        
        print("Создание новой таблицы...")
        cursor.execute(create_sql)
        
        # Получить список всех колонок для INSERT
        all_columns = [col[1] for col in columns]
        columns_str = ', '.join(all_columns)
        
        # Скопировать данные
        print("Копирование данных...")
        cursor.execute(f"""
            INSERT INTO defects_new ({columns_str})
            SELECT {columns_str} FROM defects
        """)
        
        # Удалить старую таблицу
        cursor.execute("DROP TABLE defects")
        
        # Переименовать новую таблицу
        cursor.execute("ALTER TABLE defects_new RENAME TO defects")
        
        # Восстановить индексы
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_defects_defect_code ON defects(defect_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_defects_pipeline_code ON defects(pipeline_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_defects_object_id ON defects(object_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_defects_inspection_date ON defects(inspection_date)")
        
        conn.commit()
        print(f"Таблица defects успешно пересоздана! Колонки {columns_to_fix} теперь nullable.")
        
    except Exception as e:
        print(f"Ошибка при миграции: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

