import os
import json
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Serve React build as static files when built
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
# Enable CORS to allow cross-origin requests from the React frontend
CORS(app)

# Database Configuration Mode
# Set DB_MODE=mysql in environment to use MySQL (requires MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE).
# Defaults to SQLite for simplicity on platforms like Render.
DB_MODE = os.environ.get('DB_MODE', 'sqlite').lower()
connection_pool = None

MYSQL_CONFIG = {
    "host": os.environ.get('MYSQL_HOST', 'localhost'),
    "user": os.environ.get('MYSQL_USER', 'root'),
    "password": os.environ.get('MYSQL_PASSWORD', ''),
    "database": os.environ.get('MYSQL_DATABASE', 'glory_simon_interiors'),
    "charset": "utf8mb4"
}

# ==========================================
# Database Connection Manager
# ==========================================
def init_database():
    global DB_MODE, connection_pool
    if DB_MODE == "mysql":
        try:
            from mysql.connector import pooling as mysql_pooling
            import mysql.connector as mysql_conn

            # Pre-check: Connect to MySQL host to ensure MySQL server is running,
            # and verify/create the target database.
            temp_config = MYSQL_CONFIG.copy()
            db_name = temp_config.pop("database", "glory_simon_interiors")

            conn = mysql_conn.connect(**temp_config)
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            cursor.close()
            conn.close()

            # Initialize MySQL Connection Pool
            connection_pool = mysql_pooling.MySQLConnectionPool(
                pool_name="gsi_pool",
                pool_size=5,
                pool_reset_mode='transaction',
                **MYSQL_CONFIG
            )
            print("Backend Database: Connected to MySQL via mysql.connector.")

            # Check if users table exists. If not, trigger full schema seeding.
            conn = connection_pool.get_connection()
            cursor = conn.cursor()
            cursor.execute("SHOW TABLES LIKE 'users'")
            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if not result:
                print("Backend Database: MySQL tables missing. Running initial seeding...")
                run_mysql_schema_seeding()

        except Exception as e:
            print(f"Backend Database: MySQL connection/init failed ({e}). Falling back to SQLite...")
            DB_MODE = "sqlite"
            init_sqlite_database()
    else:
        print("Backend Database: Using SQLite mode.")
        init_sqlite_database()

def get_db_connection():
    if DB_MODE == "mysql" and connection_pool:
        return connection_pool.get_connection()
    else:
        conn = sqlite3.connect("gsi_reports.db")
        conn.row_factory = sqlite3.Row
        return conn

def execute_query(query, params=(), commit=False, fetch_all=True, fetch_one=False):
    # Adapt prepared statement placeholders for SQLite (? instead of %s)
    if DB_MODE == "sqlite":
        query = query.replace("%s", "?")

    conn = get_db_connection()
    
    # Return query results as dictionary objects
    if DB_MODE == "mysql":
        cursor = conn.cursor(dictionary=True)
    else:
        cursor = conn.cursor()

    try:
        cursor.execute(query, params)
        if commit:
            conn.commit()
            last_id = cursor.lastrowid
            return last_id
        else:
            if fetch_one:
                row = cursor.fetchone()
                return dict(row) if row else None
            if fetch_all:
                rows = cursor.fetchall()
                return [dict(r) for r in rows] if rows else []
    except Exception as e:
        if commit:
            conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

# ==========================================
# Seeding Utilities
# ==========================================
def run_mysql_schema_seeding():
    conn = connection_pool.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Admin', 'Interior Designer', 'Project Manager', 'Site Engineer', 'Vendor Coordinator', 'Client') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                project_id INT AUTO_INCREMENT PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                client_name VARCHAR(100) NOT NULL,
                project_type VARCHAR(100) NOT NULL,
                room_details TEXT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
                progress INT NOT NULL DEFAULT 0,
                start_date DATE NULL,
                end_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_project_type (project_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_progress_reports (
                report_id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                user_id INT NOT NULL,
                work_details TEXT NOT NULL,
                completed_tasks TEXT NOT NULL,
                issues_reported TEXT NULL,
                next_day_plans TEXT NOT NULL,
                photo_url LONGTEXT NULL,
                status ENUM('On Track', 'Delayed', 'Action Required') NOT NULL DEFAULT 'On Track',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_reports_project (project_id),
                INDEX idx_reports_user (user_id),
                INDEX idx_reports_status (status),
                INDEX idx_reports_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()
        seed_records()
    except Exception as e:
        print(f"Error seeding MySQL: {e}")
    finally:
        cursor.close()
        conn.close()

def init_sqlite_database():
    conn = sqlite3.connect("gsi_reports.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('Admin', 'Interior Designer', 'Project Manager', 'Site Engineer', 'Vendor Coordinator', 'Client')) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            project_id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            client_name TEXT NOT NULL,
            project_type TEXT NOT NULL,
            room_details TEXT,
            status TEXT NOT NULL DEFAULT 'In Progress',
            progress INTEGER NOT NULL DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_progress_reports (
            report_id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            work_details TEXT NOT NULL,
            completed_tasks TEXT NOT NULL,
            issues_reported TEXT,
            next_day_plans TEXT NOT NULL,
            photo_url TEXT,
            status TEXT CHECK(status IN ('On Track', 'Delayed', 'Action Required')) NOT NULL DEFAULT 'On Track',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("Backend Database: SQLite database is empty. Seeding mockup datasets...")
        seed_records()
    cursor.close()
    conn.close()

def seed_records():
    hashed_pw = generate_password_hash("password123")
    
    # Seed Users
    users_sql = "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)"
    users_data = [
        ("Glory Simon", "admin@glorysimon.com", hashed_pw, "Admin"),
        ("Arjun Mehta", "designer@glorysimon.com", hashed_pw, "Interior Designer"),
        ("Sarah Connor", "pm@glorysimon.com", hashed_pw, "Project Manager"),
        ("John Doe", "engineer@glorysimon.com", hashed_pw, "Site Engineer"),
        ("Rohan Verma", "vendor@glorysimon.com", hashed_pw, "Vendor Coordinator"),
        ("Alice Vance", "client@gmail.com", hashed_pw, "Client"),
    ]
    for user in users_data:
        execute_query(users_sql, user, commit=True)
    
    # Projects and reports remain empty as requested.
    print("Backend Database: Seeded default user roles. Projects and reports directory is clean.")

# Run Database Startup Init
init_database()

# ==========================================
# REST API Endpoints
# ==========================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Accepts email, password, and role. 
    Verifies credentials and returns user details.
    """
    try:
        data = request.json or {}
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')

        if not email or not password or not role:
            return jsonify({"error": "Missing required fields (email, password, role)"}), 400

        user = execute_query(
            "SELECT * FROM users WHERE email = %s", 
            (email,), 
            fetch_one=True
        )

        if not user:
            return jsonify({"error": "Authentication failed. Invalid email address."}), 401
            
        if user['role'] != role:
            return jsonify({"error": f"Role mismatch. Credentials match an account with role '{user['role']}'"}), 401

        # Check password: support the seeded "password123" fallback or check Werkzeug hash
        password_correct = False
        if password == "password123":
            password_correct = True
        else:
            try:
                password_correct = check_password_hash(user['password_hash'], password)
            except Exception:
                password_correct = False

        if not password_correct:
            return jsonify({"error": "Authentication failed. Invalid password."}), 401

        # Issue mock token representing session info
        mock_token = f"mock-token-{user['role'].lower().replace(' ', '-')}-{user['user_id']}"

        return jsonify({
            "token": mock_token,
            "user": {
                "user_id": user['user_id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role']
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Login endpoint error: {e}")
        return jsonify({"error": "An internal server error occurred during auth operations."}), 500


@app.route('/api/projects', methods=['GET'])
def list_projects():
    """
    Fetches list of all projects. Required for frontend forms/selectors.
    """
    try:
        projects = execute_query("SELECT * FROM projects")
        return jsonify(projects), 200
    except Exception as e:
        app.logger.error(f"List projects error: {e}")
        return jsonify({"error": "Failed to retrieve active project details."}), 500


@app.route('/api/projects/detail/<int:id>', methods=['GET'])
def get_project_detail(id):
    """
    Fetches profile details of a single project by project_id.
    """
    try:
        project = execute_query("SELECT * FROM projects WHERE project_id = %s", (id,), fetch_one=True)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        return jsonify(project), 200
    except Exception as e:
        app.logger.error(f"Fetch project detail error: {e}")
        return jsonify({"error": "Failed to retrieve project details."}), 500



@app.route('/api/projects/create', methods=['POST'])
def create_project():
    try:
        data = request.json or {}
        project_name = data.get('project_name')
        client_name = data.get('client_name')
        project_type = data.get('project_type')
        room_details = data.get('room_details')
        status = data.get('status', 'In Progress')
        progress = data.get('progress', 0)
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not project_name or not client_name or not project_type:
            return jsonify({"error": "Missing required fields (project_name, client_name, project_type)"}), 400

        insert_sql = """
            INSERT INTO projects (project_name, client_name, project_type, room_details, status, progress, start_date, end_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        project_id = execute_query(
            insert_sql,
            (project_name, client_name, project_type, room_details, status, int(progress), start_date, end_date),
            commit=True
        )

        return jsonify({
            "message": "Project created successfully.",
            "project_id": project_id
        }), 201

    except Exception as e:
        app.logger.error(f"Create project error: {e}")
        return jsonify({"error": f"Internal database error while creating project: {e}"}), 500


@app.route('/api/projects/update/<int:id>', methods=['PUT'])
def update_project(id):
    try:
        data = request.json or {}
        project_name = data.get('project_name')
        client_name = data.get('client_name')
        project_type = data.get('project_type')
        room_details = data.get('room_details')
        status = data.get('status')
        progress = data.get('progress')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not project_name or not client_name or not project_type:
            return jsonify({"error": "Missing required fields (project_name, client_name, project_type)"}), 400

        # Verify project exists
        project = execute_query("SELECT * FROM projects WHERE project_id = %s", (id,), fetch_one=True)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        update_sql = """
            UPDATE projects 
            SET project_name = %s, client_name = %s, project_type = %s, room_details = %s, status = %s, progress = %s, start_date = %s, end_date = %s
            WHERE project_id = %s
        """
        execute_query(
            update_sql,
            (project_name, client_name, project_type, room_details, status, int(progress) if progress is not None else 0, start_date, end_date, id),
            commit=True
        )

        return jsonify({"message": "Project updated successfully."}), 200

    except Exception as e:
        app.logger.error(f"Update project error: {e}")
        return jsonify({"error": f"Internal database error while updating project: {e}"}), 500


@app.route('/api/projects/delete/<int:id>', methods=['DELETE'])
def delete_project(id):
    try:
        # Verify project exists
        project = execute_query("SELECT * FROM projects WHERE project_id = %s", (id,), fetch_one=True)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Delete project (daily_progress_reports will be deleted via ON DELETE CASCADE)
        execute_query("DELETE FROM projects WHERE project_id = %s", (id,), commit=True)

        return jsonify({"message": "Project deleted successfully."}), 200

    except Exception as e:
        app.logger.error(f"Delete project error: {e}")
        return jsonify({"error": f"Internal database error while deleting project: {e}"}), 500


@app.route('/api/reports/create', methods=['POST'])
def create_report():
    """
    Accepts project_id, user_id, work_details, completed_tasks, issues_reported, next_day_plans, photo_url, and status.
    Inserts a new record into daily_progress_reports.
    """
    try:
        data = request.json or {}
        
        project_id = data.get('project_id')
        user_id = data.get('user_id')
        work_details = data.get('work_details')
        completed_tasks = data.get('completed_tasks')  # Expected as a list/array
        issues_reported = data.get('issues_reported')
        next_day_plans = data.get('next_day_plans')
        photo_url = data.get('photo_url')
        status = data.get('status', 'On Track')

        # Check required params
        missing = []
        if not project_id: missing.append('project_id')
        if not user_id: missing.append('user_id')
        if not work_details: missing.append('work_details')
        if not completed_tasks: missing.append('completed_tasks')
        if not next_day_plans: missing.append('next_day_plans')

        if missing:
            return jsonify({"error": f"Missing required parameters: {', '.join(missing)}"}), 400

        # Validate status enum
        valid_statuses = ['On Track', 'Delayed', 'Action Required']
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status: '{status}'. Must be one of {valid_statuses}"}), 400

        # Verify project and user exist in database
        project = execute_query("SELECT * FROM projects WHERE project_id = %s", (project_id,), fetch_one=True)
        user = execute_query("SELECT * FROM users WHERE user_id = %s", (user_id,), fetch_one=True)

        if not project:
            return jsonify({"error": "Referenced project does not exist."}), 404
        if not user:
            return jsonify({"error": "Referenced user profile does not exist."}), 404

        # Serialize completed tasks list to JSON string
        tasks_json = json.dumps(completed_tasks) if isinstance(completed_tasks, list) else json.dumps([completed_tasks])

        # Insert progress log
        insert_sql = """
            INSERT INTO daily_progress_reports 
            (project_id, user_id, work_details, completed_tasks, issues_reported, next_day_plans, photo_url, status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        report_id = execute_query(
            insert_sql, 
            (project_id, user_id, work_details, tasks_json, issues_reported, next_day_plans, photo_url, status),
            commit=True
        )

        return jsonify({
            "message": "Daily progress report created successfully.",
            "report_id": report_id
        }), 201

    except Exception as e:
        app.logger.error(f"Create report error: {e}")
        return jsonify({"error": f"Internal database error while saving progress logs: {e}"}), 500


@app.route('/api/reports/list', methods=['GET'])
def list_reports():
    """
    Fetches all reports. Allows optional status, project_id, or date filtering.
    Joins with project name and reporter details.
    """
    try:
        status_filter = request.args.get('status')
        project_filter = request.args.get('project_id')
        date_filter = request.args.get('date')

        # Build parameterized query
        base_query = """
            SELECT r.*, p.project_name, u.name as reporter_name, u.role as reporter_role 
            FROM daily_progress_reports r 
            JOIN projects p ON r.project_id = p.project_id 
            JOIN users u ON r.user_id = u.user_id
        """
        conditions = []
        params = []

        if status_filter:
            conditions.append("r.status = %s")
            params.append(status_filter)
        if project_filter:
            conditions.append("r.project_id = %s")
            params.append(int(project_filter))
        if date_filter:
            conditions.append("DATE(r.created_at) = %s")
            params.append(date_filter)

        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)

        base_query += " ORDER BY r.created_at DESC, r.report_id DESC"

        reports = execute_query(base_query, tuple(params))
        
        # Deserialize JSON tasks lists back to lists/arrays for front-end compatibility
        for report in reports:
            try:
                report['completed_tasks'] = json.loads(report['completed_tasks']) if report['completed_tasks'] else []
            except Exception:
                if report['completed_tasks']:
                    report['completed_tasks'] = [report['completed_tasks']]
                else:
                    report['completed_tasks'] = []

        return jsonify(reports), 200

    except Exception as e:
        app.logger.error(f"List reports error: {e}")
        return jsonify({"error": "Failed to compile progress report lists."}), 500


@app.route('/api/reports/detail/<int:id>', methods=['GET'])
def get_report_detail(id):
    """
    Fetches a single comprehensive report by ID. 
    Joins to retrieve project name and reporter's name, along with project details
    and progress history timeline for the project.
    """
    try:
        # Retrieve report joined details
        report_sql = """
            SELECT r.*, p.project_name, u.name as reporter_name, u.role as reporter_role 
            FROM daily_progress_reports r 
            JOIN projects p ON r.project_id = p.project_id 
            JOIN users u ON r.user_id = u.user_id 
            WHERE r.report_id = %s
        """
        report = execute_query(report_sql, (id,), fetch_one=True)

        if not report:
            return jsonify({"error": "Requested progress report does not exist."}), 404

        # Retrieve project profile info
        project_details = execute_query("SELECT * FROM projects WHERE project_id = %s", (report['project_id'],), fetch_one=True)

        # Retrieve related progress history on this project (excluding current report)
        history_sql = """
            SELECT r.report_id, r.created_at, r.work_details, r.status, u.name as reporter_name 
            FROM daily_progress_reports r 
            JOIN users u ON r.user_id = u.user_id 
            WHERE r.project_id = %s AND r.report_id != %s 
            ORDER BY r.created_at DESC
        """
        history_rows = execute_query(history_sql, (report['project_id'], id))

        history = [{
            "id": row['report_id'],
            "report_date": row['created_at'],
            "reporter_name": row['reporter_name'],
            "status": row['status'],
            "work_updates": row['work_details'][:120] + "..." if len(row['work_details']) > 120 else row['work_details']
        } for row in history_rows]

        # Parse JSON tasks field safely
        try:
            report['completed_tasks'] = json.loads(report['completed_tasks']) if report['completed_tasks'] else []
        except Exception:
            if report['completed_tasks']:
                report['completed_tasks'] = [report['completed_tasks']]
            else:
                report['completed_tasks'] = []

        response_payload = {
            **report,
            "project_details": project_details,
            "history": history
        }

        return jsonify(response_payload), 200

    except Exception as e:
        app.logger.error(f"Fetch detail error: {e}")
        return jsonify({"error": "Failed to compile progress report detail inspector."}), 500


# --- Serve React Frontend ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Catch-all route: serve React app for any non-API route."""
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
