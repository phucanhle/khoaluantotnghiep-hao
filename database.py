import os
import json
import sqlite3
import hashlib
import pymysql

# Database connection configuration (MySQL default settings)
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "kltn_lipsticks"
}

# Global database status
DB_TYPE = None # 'mysql' or 'sqlite'

def get_db_connection():
    global DB_TYPE
    
    # Try MySQL first
    try:
        conn = pymysql.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            connect_timeout=3
        )
        
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.close()
        
        conn = pymysql.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        DB_TYPE = 'mysql'
        return conn
    except Exception as e:
        # Fallback to SQLite
        os.makedirs("data", exist_ok=True)
        sqlite_path = os.path.join("data", "lipsticks.db")
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        DB_TYPE = 'sqlite'
        return conn

def execute_query(query, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if DB_TYPE == 'sqlite':
        query = query.replace('%s', '?')
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        conn.commit()
        return cursor
    finally:
        cursor.close()
        conn.close()

def fetch_all(query, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if DB_TYPE == 'sqlite':
        query = query.replace('%s', '?')
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        if DB_TYPE == 'sqlite':
            return [dict(row) for row in cursor.fetchall()]
        else:
            return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def fetch_one(query, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if DB_TYPE == 'sqlite':
        query = query.replace('%s', '?')
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        row = cursor.fetchone()
        if not row:
            return None
        if DB_TYPE == 'sqlite':
            return dict(row)
        else:
            return row
    finally:
        cursor.close()
        conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create Lipsticks table
    if DB_TYPE == 'mysql':
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lipsticks (
                id INT PRIMARY KEY,
                brand VARCHAR(100),
                product_name VARCHAR(255),
                shade_name VARCHAR(100),
                hex_code VARCHAR(10),
                rgb_r INT,
                rgb_g INT,
                rgb_b INT,
                hsl_h INT,
                hsl_s INT,
                hsl_l INT,
                lab_l DECIMAL(5,2),
                lab_a DECIMAL(5,2),
                lab_b DECIMAL(5,2),
                color_family VARCHAR(100),
                price_tier VARCHAR(50),
                image_base64 LONGTEXT,
                original_image_url VARCHAR(500),
                dupes_json TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(50) PRIMARY KEY,
                password_hash VARCHAR(255),
                role VARCHAR(20) DEFAULT 'user',
                skin_tone VARCHAR(50),
                undertone VARCHAR(50),
                personal_color VARCHAR(50),
                preferred_finish VARCHAR(50),
                survey_completed INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50),
                lipstick_id INT,
                rating INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50),
                lipstick_id INT,
                action_type VARCHAR(50),
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50),
                customer_name VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                total_amount DECIMAL(10,2),
                items_json TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    else: # SQLite
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lipsticks (
                id INTEGER PRIMARY KEY,
                brand TEXT,
                product_name TEXT,
                shade_name TEXT,
                hex_code TEXT,
                rgb_r INTEGER,
                rgb_g INTEGER,
                rgb_b INTEGER,
                hsl_h INTEGER,
                hsl_s INTEGER,
                hsl_l INTEGER,
                lab_l REAL,
                lab_a REAL,
                lab_b REAL,
                color_family TEXT,
                price_tier TEXT,
                image_base64 TEXT,
                original_image_url TEXT,
                dupes_json TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT,
                role TEXT DEFAULT 'user',
                skin_tone TEXT,
                undertone TEXT,
                personal_color TEXT,
                preferred_finish TEXT,
                survey_completed INTEGER DEFAULT 0
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                lipstick_id INTEGER,
                rating INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                lipstick_id INTEGER,
                action_type TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                customer_name TEXT,
                phone TEXT,
                address TEXT,
                total_amount REAL,
                items_json TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
    conn.commit()
    
    # 2. Seed default admin if not exists
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    admin_row = cursor.fetchone()
    admin_count = admin_row['count'] if isinstance(admin_row, dict) else admin_row[0]
    
    if admin_count == 0:
        pw_hash = hash_password("admin123")
        placeholder = '?' if DB_TYPE == 'sqlite' else '%s'
        cursor.execute(f"""
            INSERT INTO users (username, password_hash, role, skin_tone, undertone, personal_color, preferred_finish, survey_completed)
            VALUES ({placeholder}, {placeholder}, 'admin', 'Medium', 'Neutral', 'Autumn', 'Matte', 1)
        """, ("admin", pw_hash))
        conn.commit()
        print("[DB] Default Admin account seeded (admin / admin123).")
        
    # 3. Seed product data if empty
    cursor.execute("SELECT COUNT(*) as count FROM lipsticks")
    count_row = cursor.fetchone()
    count = count_row['count'] if isinstance(count_row, dict) else count_row[0]
    
    if count == 0:
        print("[DB] Seeding products from data/lipsticks.json...")
        json_path = os.path.join("data", "lipsticks.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                lipsticks = json.load(f)
                
            placeholder = '?' if DB_TYPE == 'sqlite' else '%s'
            insert_query = f"""
                INSERT INTO lipsticks (
                    id, brand, product_name, shade_name, hex_code,
                    rgb_r, rgb_g, rgb_b, hsl_h, hsl_s, hsl_l,
                    lab_l, lab_a, lab_b, color_family, price_tier,
                    image_base64, original_image_url, dupes_json
                ) VALUES (
                    {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder},
                    {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder},
                    {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder},
                    {placeholder}, {placeholder}, {placeholder}
                )
            """
            
            def get_base64_from_path(img_path):
                if not os.path.exists(img_path):
                    return ""
                import base64
                ext = os.path.splitext(img_path)[1].lower()
                mime = "image/jpeg"
                if ext == ".svg":
                    mime = "image/svg+xml"
                elif ext == ".png":
                    mime = "image/png"
                try:
                    with open(img_path, "rb") as img_file:
                        encoded = base64.b64encode(img_file.read()).decode("utf-8")
                        return f"data:{mime};base64,{encoded}"
                except:
                    return ""

            for lp in lipsticks:
                base64_str = lp.get("image_base64", "")
                if not base64_str and lp.get("image_path"):
                    base64_str = get_base64_from_path(lp["image_path"])
                
                dupes = lp.get("dupes", [])
                dupes_str = json.dumps(dupes, ensure_ascii=False)
                
                params = (
                    lp["id"],
                    lp["brand"],
                    lp["product_name"],
                    lp["shade_name"],
                    lp["hex_code"],
                    lp["rgb"]["r"], lp["rgb"]["g"], lp["rgb"]["b"],
                    lp["hsl"]["h"], lp["hsl"]["s"], lp["hsl"]["l"],
                    lp["lab"]["l"], lp["lab"]["a"], lp["lab"]["b"],
                    lp["color_family"],
                    lp["price_tier"],
                    base64_str,
                    lp.get("original_image_url", lp.get("image_url", "")),
                    dupes_str
                )
                cursor.execute(insert_query, params)
            conn.commit()
            print(f"[DB] Seeded {len(lipsticks)} lipsticks.")
            
    cursor.close()
    conn.close()

if __name__ == "__main__":
    init_db()
