"""
Миграция для изменения колонки object_id в таблице defects на nullable
"""
import sqlite3
import os

# Путь к базе данных
DB_PATH = os.path.join(os.path.dirname(__file__), "integrity_os.db")

def migrate():
    """Изменить object_id на nullable"""
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
        
        # Найти object_id
        object_id_info = None
        for col in columns:
            if col[1] == 'object_id':
                object_id_info = col
                break
        
        if not object_id_info:
            print("Колонка object_id не найдена в таблице.")
            return
        
        # Проверить, есть ли NOT NULL ограничение
        if object_id_info[3] == 1:  # NOT NULL
            print("Колонка object_id имеет NOT NULL ограничение. Пересоздание таблицы...")
            
            # Получить все колонки и их определения
            column_defs = []
            for col in columns:
                col_name = col[1]
                col_type = col[2]
                not_null = "NOT NULL" if col[3] else ""
                default_val = f"DEFAULT {col[4]}" if col[4] is not None else ""
                pk = "PRIMARY KEY" if col[5] else ""
                
                # Для object_id убрать NOT NULL
                if col_name == 'object_id':
                    not_null = ""
                
                col_def = f"{col_name} {col_type}"
                if pk:
                    col_def += f" {pk}"
                if not_null:
                    col_def += f" {not_null}"
                if default_val:
                    col_def += f" {default_val}"
                
                column_defs.append(col_def)
            
            # Создать SQL для создания новой таблицы
            # В SQLite FOREIGN KEY добавляется как CONSTRAINT
            create_sql = f"""
                CREATE TABLE defects_new (
                    {', '.join(column_defs)},
                    FOREIGN KEY(object_id) REFERENCES objects(id)
                )
            """
            
            # Удалить временную таблицу если она существует
            cursor.execute("DROP TABLE IF EXISTS defects_new")
            
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
            
            # Восстановить индексы (получить список индексов)
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='defects'")
            indexes = cursor.fetchall()
            
            # Пересоздать индексы (кроме тех, что создаются автоматически)
            for idx_name, idx_sql in indexes:
                if idx_name and not idx_name.startswith('sqlite_'):
                    if idx_sql:
                        # Заменить имя таблицы в SQL
                        new_sql = idx_sql.replace('defects', 'defects')
                        try:
                            cursor.execute(new_sql)
                        except:
                            pass  # Игнорировать ошибки при создании индексов
            
            conn.commit()
            print("Таблица defects успешно пересоздана с nullable object_id!")
        else:
            print("Колонка object_id уже nullable.")
        
    except Exception as e:
        print(f"Ошибка при миграции: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
