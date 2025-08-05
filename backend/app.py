from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import sqlite3
import hashlib
import jwt
from functools import wraps

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
DATABASE = 'dsa_dashboard.db'

# Database initialization
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # User progress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Notes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            topic TEXT,
            week INTEGER,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            week INTEGER,
            status TEXT NOT NULL,
            github_url TEXT,
            demo_url TEXT,
            technologies TEXT,
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# Utility functions
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_email(email):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400
    
    # Check if user already exists
    if get_user_by_email(data['email']):
        return jsonify({'message': 'User already exists'}), 409
    
    # Create new user
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    password_hash = hash_password(data['password'])
    cursor.execute(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        (data['email'], password_hash, data.get('name', ''))
    )
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Generate token
    token = jwt.encode(
        {'user_id': user_id, 'exp': datetime.utcnow().timestamp() + 86400},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return jsonify({
        'message': 'User created successfully',
        'token': token,
        'user': {
            'id': user_id,
            'email': data['email'],
            'name': data.get('name', '')
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email and password are required'}), 400
    
    user = get_user_by_email(data['email'])
    
    if not user or user[2] != hash_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Generate token
    token = jwt.encode(
        {'user_id': user[0], 'exp': datetime.utcnow().timestamp() + 86400},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user[0],
            'email': user[1],
            'name': user[3] or ''
        }
    }), 200

@app.route('/api/user/progress', methods=['GET'])
@token_required
def get_user_progress(current_user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT data FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        (current_user_id,)
    )
    
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return jsonify({'progress': json.loads(result[0])}), 200
    else:
        return jsonify({'progress': {}}), 200

@app.route('/api/user/progress', methods=['POST'])
@token_required
def save_user_progress(current_user_id):
    data = request.get_json()
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check if progress exists
    cursor.execute(
        'SELECT id FROM user_progress WHERE user_id = ?',
        (current_user_id,)
    )
    
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute(
            'UPDATE user_progress SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            (json.dumps(data), current_user_id)
        )
    else:
        cursor.execute(
            'INSERT INTO user_progress (user_id, data) VALUES (?, ?)',
            (current_user_id, json.dumps(data))
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Progress saved successfully'}), 200

@app.route('/api/notes', methods=['GET'])
@token_required
def get_notes(current_user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
        (current_user_id,)
    )
    
    notes = []
    for row in cursor.fetchall():
        notes.append({
            'id': row[0],
            'title': row[2],
            'content': row[3],
            'topic': row[4],
            'week': row[5],
            'tags': json.loads(row[6]) if row[6] else [],
            'createdAt': row[7],
            'updatedAt': row[8]
        })
    
    conn.close()
    return jsonify({'notes': notes}), 200

@app.route('/api/notes', methods=['POST'])
@token_required
def create_note(current_user_id):
    data = request.get_json()
    
    if not data.get('title') or not data.get('content'):
        return jsonify({'message': 'Title and content are required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'INSERT INTO notes (id, user_id, title, content, topic, week, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (
            data.get('id'),
            current_user_id,
            data['title'],
            data['content'],
            data.get('topic'),
            data.get('week'),
            json.dumps(data.get('tags', []))
        )
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Note created successfully'}), 201

@app.route('/api/notes/<note_id>', methods=['PUT'])
@token_required
def update_note(current_user_id, note_id):
    data = request.get_json()
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        '''UPDATE notes SET title = ?, content = ?, topic = ?, week = ?, tags = ?, 
           updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?''',
        (
            data['title'],
            data['content'],
            data.get('topic'),
            data.get('week'),
            json.dumps(data.get('tags', [])),
            note_id,
            current_user_id
        )
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Note updated successfully'}), 200

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@token_required
def delete_note(current_user_id, note_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'DELETE FROM notes WHERE id = ? AND user_id = ?',
        (note_id, current_user_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Note deleted successfully'}), 200

@app.route('/api/projects', methods=['GET'])
@token_required
def get_projects(current_user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
        (current_user_id,)
    )
    
    projects = []
    for row in cursor.fetchall():
        projects.append({
            'id': row[0],
            'name': row[2],
            'description': row[3],
            'week': row[4],
            'status': row[5],
            'githubUrl': row[6],
            'demoUrl': row[7],
            'technologies': json.loads(row[8]) if row[8] else [],
            'progress': row[9],
            'createdAt': row[10],
            'updatedAt': row[11]
        })
    
    conn.close()
    return jsonify({'projects': projects}), 200

@app.route('/api/projects', methods=['POST'])
@token_required
def create_project(current_user_id):
    data = request.get_json()
    
    if not data.get('name') or not data.get('description'):
        return jsonify({'message': 'Name and description are required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        '''INSERT INTO projects (id, user_id, name, description, week, status, 
           github_url, demo_url, technologies, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            data.get('id'),
            current_user_id,
            data['name'],
            data['description'],
            data.get('week'),
            data.get('status', 'planned'),
            data.get('githubUrl'),
            data.get('demoUrl'),
            json.dumps(data.get('technologies', [])),
            data.get('progress', 0)
        )
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Project created successfully'}), 201

@app.route('/api/projects/<project_id>', methods=['PUT'])
@token_required
def update_project(current_user_id, project_id):
    data = request.get_json()
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        '''UPDATE projects SET name = ?, description = ?, week = ?, status = ?, 
           github_url = ?, demo_url = ?, technologies = ?, progress = ?, 
           updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?''',
        (
            data['name'],
            data['description'],
            data.get('week'),
            data.get('status'),
            data.get('githubUrl'),
            data.get('demoUrl'),
            json.dumps(data.get('technologies', [])),
            data.get('progress', 0),
            project_id,
            current_user_id
        )
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Project updated successfully'}), 200

@app.route('/api/projects/<project_id>', methods=['DELETE'])
@token_required
def delete_project(current_user_id, project_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        'DELETE FROM projects WHERE id = ? AND user_id = ?',
        (project_id, current_user_id)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Project deleted successfully'}), 200

@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics(current_user_id):
    # Get user progress
    progress_data = get_user_progress(current_user_id)
    
    # Get notes count
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM notes WHERE user_id = ?', (current_user_id,))
    notes_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM projects WHERE user_id = ?', (current_user_id,))
    projects_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM projects WHERE user_id = ? AND status = ?', (current_user_id, 'completed'))
    completed_projects = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'analytics': {
            'notes_count': notes_count,
            'projects_count': projects_count,
            'completed_projects': completed_projects,
            'progress_data': progress_data
        }
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)