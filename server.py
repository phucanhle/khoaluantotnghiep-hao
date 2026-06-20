import os
import json
import mimetypes
from flask import Flask, render_template, jsonify, request, redirect, session, url_for, send_from_directory
import database
import recommendation

# Explicitly register WebAssembly and data MIME types (highly critical for mobile browsers compiling WASM)
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/octet-stream', '.data')

app = Flask(__name__, 
            static_folder="static",
            template_folder="templates")

# Secret key for sessions
app.secret_key = "kltn_phung_to_hao_secret_key_2026"

# Ensure DB is initialized on startup
database.init_db()

# ==========================================================================
# PAGE VIEW ROUTING
# ==========================================================================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/product/<int:lipstick_id>')
def product_detail(lipstick_id):
    # Verify product exists
    lp = database.fetch_one("SELECT * FROM lipsticks WHERE id = %s", (lipstick_id,))
    if not lp:
        return redirect(url_for('shop'))
    return render_template('product.html', lipstick_id=lipstick_id)

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/admin')
def admin_dashboard():
    # Authentication check
    if 'username' not in session or session.get('role') != 'admin':
        return redirect(url_for('profile'))
    return render_template('admin.html')

# Support serving files from data folder
@app.route('/data/<path:filename>')
def serve_data_files(filename):
    return send_from_directory('data', filename)

@app.after_request
def add_header(response):
    # Enable aggressive caching for static assets (js, css, images) to improve loading speed
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        # Prevent caching of dynamic HTML and API responses to guarantee immediate updates on mobile devices
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
    # Dynamic Gzip compression for text-based and JSON responses to improve mobile transfer speeds
    import gzip
    import io
    
    accept_encoding = request.headers.get('Accept-Encoding', '')
    content_type = response.content_type or ''
    is_compressible = (
        'text/' in content_type or 
        'javascript' in content_type or 
        'json' in content_type
    )
    
    if (response.status_code >= 200 and 
        response.status_code < 300 and 
        'gzip' in accept_encoding and 
        is_compressible and 
        'Content-Encoding' not in response.headers):
        
        response.direct_passthrough = False
        data = response.get_data()
        
        if len(data) >= 500:
            gzip_buffer = io.BytesIO()
            with gzip.GzipFile(mode='wb', fileobj=gzip_buffer) as gzip_file:
                gzip_file.write(data)
            
            response.set_data(gzip_buffer.getvalue())
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = len(response.get_data())
            
    return response

# ==========================================================================
# AUTHENTICATION APIS
# ==========================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"error": "Vui lòng nhập đầy đủ tài khoản và mật khẩu."}), 400
        
    # Check if user exists
    exists = database.fetch_one("SELECT username FROM users WHERE username = %s", (username,))
    if exists:
        return jsonify({"error": "Tài khoản đã tồn tại."}), 400
        
    pw_hash = database.hash_password(password)
    
    database.execute_query("""
        INSERT INTO users (username, password_hash, role, skin_tone, undertone, personal_color, preferred_finish, survey_completed)
        VALUES (%s, %s, 'user', 'Medium', 'Neutral', 'Spring', 'Matte', 0)
    """, (username, pw_hash))
    
    # Log user in
    session['username'] = username
    session['role'] = 'user'
    
    # Log interaction
    database.execute_query(
        "INSERT INTO interactions (user_id, action_type, details) VALUES (%s, %s, %s)",
        (username, 'register', 'Registered new user account')
    )
    
    return jsonify({"success": True, "message": "Đăng ký tài khoản thành công."})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"error": "Vui lòng nhập tài khoản và mật khẩu."}), 400
        
    pw_hash = database.hash_password(password)
    user = database.fetch_one("SELECT * FROM users WHERE username = %s AND password_hash = %s", (username, pw_hash))
    
    if not user:
        return jsonify({"error": "Sai tài khoản hoặc mật khẩu."}), 401
        
    session['username'] = user['username']
    session['role'] = user['role']
    
    # Log interaction
    database.execute_query(
        "INSERT INTO interactions (user_id, action_type, details) VALUES (%s, %s, %s)",
        (username, 'login', f"Logged in successfully as {user['role']}")
    )
    
    return jsonify({
        "success": True, 
        "username": user['username'],
        "role": user['role'],
        "skin_tone": user['skin_tone'],
        "undertone": user['undertone'],
        "survey_completed": user['survey_completed']
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    username = session.get('username', 'GUEST')
    # Log interaction
    database.execute_query(
        "INSERT INTO interactions (user_id, action_type, details) VALUES (%s, %s, %s)",
        (username, 'logout', 'Logged out')
    )
    session.clear()
    return jsonify({"success": True})

@app.route('/api/auth/session', methods=['GET'])
def get_session():
    if 'username' in session:
        user = database.fetch_one("SELECT username, role, skin_tone, undertone, survey_completed FROM users WHERE username = %s", (session['username'],))
        if user:
            return jsonify({
                "logged_in": True,
                "username": user["username"],
                "role": user["role"],
                "skin_tone": user["skin_tone"],
                "undertone": user["undertone"],
                "survey_completed": user["survey_completed"]
            })
    return jsonify({"logged_in": False, "username": "GUEST", "role": "guest"})

# ==========================================================================
# E-COMMERCE CART & CHECKOUT APIS
# ==========================================================================

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json
    username = session.get('username', 'GUEST')
    customer_name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    total_amount = float(data.get('total_amount', 0))
    items = data.get('items', [])
    
    if not customer_name or not phone or not address or total_amount <= 0 or not items:
        return jsonify({"error": "Vui lòng nhập đầy đủ thông tin giao hàng và giỏ hàng phải có sản phẩm."}), 400
        
    items_json = json.dumps(items, ensure_ascii=False)
    
    database.execute_query("""
        INSERT INTO orders (username, customer_name, phone, address, total_amount, items_json, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'pending')
    """, (username, customer_name, phone, address, total_amount, items_json))
    
    # Log checkout interaction for each item
    for item in items:
        database.execute_query(
            "INSERT INTO interactions (user_id, lipstick_id, action_type, details) VALUES (%s, %s, %s, %s)",
            (username, int(item['id']), 'checkout', f"Purchased {item['quantity']} pcs - Order total: {total_amount}k")
        )
        
    return jsonify({"success": True, "message": "Đặt hàng thành công! Đơn hàng của bạn đang được duyệt."})

@app.route('/api/user/orders', methods=['GET'])
def get_user_orders():
    username = session.get('username')
    if not username:
        return jsonify([])
    orders = database.fetch_all("SELECT * FROM orders WHERE username = %s ORDER BY id DESC", (username,))
    
    order_list = []
    for o in orders:
        order = dict(o)
        order["items"] = json.loads(o["items_json"]) if o.get("items_json") else []
        order_list.append(order)
    return jsonify(order_list)

# ==========================================================================
# PRODUCT FILTERING & RETRIEVAL APIS
# ==========================================================================

@app.route('/api/lipsticks', methods=['GET'])
def get_lipsticks():
    search = request.args.get('search', '').strip()
    brand = request.args.get('brand', '').strip()
    color = request.args.get('color', '').strip()
    price = request.args.get('price', '').strip()
    sort = request.args.get('sort', '').strip() # 'asc' or 'desc'
    
    query = "SELECT * FROM lipsticks WHERE 1=1"
    params = []
    
    if search:
        query += " AND (brand LIKE %s OR product_name LIKE %s OR shade_name LIKE %s OR hex_code LIKE %s)"
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param])
        
    if brand:
        query += " AND brand = %s"
        params.append(brand)
        
    if color:
        query += " AND color_family = %s"
        params.append(color)
        
    if price:
        query += " AND price_tier = %s"
        params.append(price)
        
    # Sorting order
    if sort == 'asc':
        # Handled price conversion. For KLTN we can order by ID or price tier or custom price mapping
        # Since price is represented by price_tier in the seed database, we can sort by id or price_tier
        # Let's map price tier: Affordable < Premium < Luxury < Ultra-Luxury
        query += " ORDER BY id ASC" # default sorting
    elif sort == 'desc':
        query += " ORDER BY id DESC"
        
    rows = database.fetch_all(query, params)
    
    lipstick_list = []
    for row in rows:
        lipstick = dict(row)
        lipstick["rgb"] = {"r": row["rgb_r"], "g": row["rgb_g"], "b": row["rgb_b"]}
        lipstick["hsl"] = {"h": row["hsl_h"], "s": row["hsl_s"], "l": row["hsl_l"]}
        lipstick["lab"] = {"l": float(row["lab_l"]), "a": float(row["lab_a"]), "b": float(row["lab_b"])}
        lipstick["dupes"] = json.loads(row["dupes_json"]) if row.get("dupes_json") else []
        lipstick_list.append(lipstick)
        
    return jsonify(lipstick_list)

@app.route('/api/lipsticks/<int:lipstick_id>', methods=['GET'])
def get_lipstick(lipstick_id):
    row = database.fetch_one("SELECT * FROM lipsticks WHERE id = %s", (lipstick_id,))
    if not row:
        return jsonify({"error": "Lipstick not found"}), 404
        
    lipstick = dict(row)
    lipstick["rgb"] = {"r": row["rgb_r"], "g": row["rgb_g"], "b": row["rgb_b"]}
    lipstick["hsl"] = {"h": row["hsl_h"], "s": row["hsl_s"], "l": row["hsl_l"]}
    lipstick["lab"] = {"l": float(row["lab_l"]), "a": float(row["lab_a"]), "b": float(row["lab_b"])}
    lipstick["dupes"] = json.loads(row["dupes_json"]) if row.get("dupes_json") else []
    
    return jsonify(lipstick)

# ==========================================================================
# RECOMMENDATION & SURVEY APIS
# ==========================================================================

@app.route('/api/survey', methods=['POST'])
def save_survey():
    data = request.json
    username = session.get('username', 'GUEST')
    skin_tone = data.get("skin_tone", "Fair")
    undertone = data.get("undertone", "Warm")
    personal_color = data.get("personal_color", "Spring")
    pref_finish = data.get("preferred_finish", "Matte")
    
    # Save to users table
    if username != 'GUEST':
        database.execute_query("""
            UPDATE users 
            SET skin_tone = %s, undertone = %s, personal_color = %s, preferred_finish = %s, survey_completed = 1 
            WHERE username = %s
        """, (skin_tone, undertone, personal_color, pref_finish, username))
    
    # Save seed ratings if any
    seed_ratings = data.get("ratings", {})
    for lp_id, val in seed_ratings.items():
        database.execute_query(
            "INSERT INTO ratings (user_id, lipstick_id, rating) VALUES (%s, %s, %s)",
            (username, int(lp_id), int(val))
        )
        
    # Log interaction
    database.execute_query(
        "INSERT INTO interactions (user_id, action_type, details) VALUES (%s, %s, %s)",
        (username, 'survey_completed', f"Completed skin test. Tone: {skin_tone}, Undertone: {undertone}")
    )
        
    return jsonify({"success": True, "message": "Hoàn thành bài kiểm tra tone da thành công."})

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    # Prioritize active session user, fallback to guest
    username = session.get('username', 'GUEST')
    user_id = request.args.get('user_id', username).strip()
    recommendations = recommendation.get_collaborative_filtering_recommendations(user_id, limit=6)
    return jsonify(recommendations)

@app.route('/api/rate', methods=['POST'])
def rate_lipstick():
    data = request.json
    username = session.get('username', 'GUEST')
    lipstick_id = int(data.get("lipstick_id"))
    rating = int(data.get("rating"))
    
    database.execute_query(
        "INSERT INTO ratings (user_id, lipstick_id, rating) VALUES (%s, %s, %s)",
        (username, lipstick_id, rating)
    )
    
    database.execute_query(
        "INSERT INTO interactions (user_id, lipstick_id, action_type, details) VALUES (%s, %s, %s, %s)",
        (username, lipstick_id, 'explicit_rating', f"Rated {rating} stars")
    )
    
    return jsonify({"success": True})

@app.route('/api/interaction', methods=['POST'])
def log_interaction():
    data = request.json
    username = session.get('username', 'GUEST')
    lipstick_id = int(data.get("lipstick_id")) if data.get("lipstick_id") else None
    action_type = data.get("action_type")
    details = data.get("details", "")
    
    database.execute_query(
        "INSERT INTO interactions (user_id, lipstick_id, action_type, details) VALUES (%s, %s, %s, %s)",
        (username, lipstick_id, action_type, details)
    )
    
    return jsonify({"success": True})

@app.route('/api/interactions/live', methods=['GET'])
def get_live_interactions():
    query = """
        SELECT i.*, l.brand, l.shade_name 
        FROM interactions i
        LEFT JOIN lipsticks l ON i.lipstick_id = l.id
        ORDER BY i.id DESC LIMIT 15
    """
    rows = database.fetch_all(query)
    return jsonify(rows)

# ==========================================================================
# ADMINISTRATOR APIS (GUARDED)
# ==========================================================================

@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    orders = database.fetch_all("SELECT * FROM orders ORDER BY id DESC")
    order_list = []
    for o in orders:
        order = dict(o)
        order["items"] = json.loads(o["items_json"]) if o.get("items_json") else []
        order_list.append(order)
    return jsonify(order_list)

@app.route('/api/admin/orders/<int:order_id>/status', methods=['POST'])
def admin_update_order_status(order_id):
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    status = data.get('status', 'pending')
    
    database.execute_query("UPDATE orders SET status = %s WHERE id = %s", (status, order_id))
    
    # Log action
    database.execute_query(
        "INSERT INTO interactions (user_id, action_type, details) VALUES (%s, %s, %s)",
        (session['username'], 'admin_action', f"Updated order #{order_id} status to '{status}'")
    )
    
    return jsonify({"success": True, "message": "Cập nhật trạng thái đơn hàng thành công."})

@app.route('/api/admin/products/<int:lipstick_id>/price', methods=['POST'])
def admin_update_product_price(lipstick_id):
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    price_tier = data.get('price_tier', 'Luxury')
    
    database.execute_query("UPDATE lipsticks SET price_tier = %s WHERE id = %s", (price_tier, lipstick_id))
    
    # Log action
    database.execute_query(
        "INSERT INTO interactions (user_id, lipstick_id, action_type, details) VALUES (%s, %s, %s, %s)",
        (session['username'], lipstick_id, 'admin_action', f"Updated lipstick price tier to {price_tier}")
    )
    
    return jsonify({"success": True, "message": "Cập nhật phân khúc giá sản phẩm thành công."})

# ==========================================================================
# EXPORT DATA APIS
# ==========================================================================

@app.route('/api/export/training', methods=['GET'])
def export_training_data():
    ratings = database.fetch_all("""
        SELECT r.user_id, p.skin_tone, p.undertone, p.personal_color, p.preferred_finish,
               r.lipstick_id, l.brand, l.product_name, l.shade_name, r.rating
        FROM ratings r
        JOIN users p ON r.user_id = p.username
        JOIN lipsticks l ON r.lipstick_id = l.id
    """)
    return jsonify(ratings)

@app.route('/api/export/composite', methods=['GET'])
def export_composite_data():
    profiles = database.fetch_all("SELECT * FROM users")
    composite_data = []
    
    for prof in profiles:
        uid = prof["username"]
        user_ratings = database.fetch_all("SELECT lipstick_id, rating FROM ratings WHERE user_id = %s", (uid,))
        user_interactions = database.fetch_all("SELECT lipstick_id, action_type FROM interactions WHERE user_id = %s", (uid,))
        
        scores = {}
        for r in user_ratings:
            lid = r["lipstick_id"]
            scores[lid] = scores.get(lid, 0) + (r["rating"] * 5)
            
        for i in user_interactions:
            lid = i["lipstick_id"]
            if not lid:
                continue
            act = i["action_type"]
            weight = 1
            if act == 'view_lipstick':
                weight = 3
            elif act == 'dupe_search':
                weight = 4
            elif act == 'explicit_rating':
                weight = 5
            elif act == 'checkout':
                weight = 10
            scores[lid] = scores.get(lid, 0) + weight
            
        ratings_list = []
        for lid, score in scores.items():
            lp = database.fetch_one("SELECT brand, product_name, shade_name FROM lipsticks WHERE id = %s", (lid,))
            if lp:
                ratings_list.append({
                    "lipstick_id": lid,
                    "brand": lp["brand"],
                    "product_name": lp["product_name"],
                    "shade_name": lp["shade_name"],
                    "composite_score": score
                })
                
        if ratings_list:
            composite_data.append({
                "user_id": uid,
                "skin_tone": prof["skin_tone"],
                "undertone": prof["undertone"],
                "personal_color": prof["personal_color"],
                "preferred_finish": prof["preferred_finish"],
                "ratings": ratings_list
            })
            
    return jsonify(composite_data)

if __name__ == '__main__':
    import sys
    use_https = '--https' in sys.argv
    ssl_ctx = 'adhoc' if use_https else None
    
    if use_https:
        print("\n" + "="*80)
        print(" RUNNING SERVER UNDER HTTPS (SELF-SIGNED SSL)")
        print(" Your phone URL: https://<YOUR_COMPUTER_IP>:5000/")
        print(" Note: The browser will show a security warning. Click 'Advanced' -> 'Proceed' to bypass it.")
        print("="*80 + "\n")
        
    app.run(host='0.0.0.0', port=5000, debug=not use_https, ssl_context=ssl_ctx)
