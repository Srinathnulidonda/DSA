from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
import json
from functools import wraps
import uuid

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///dsa_learning.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:5500'])

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    progress = db.relationship('UserProgress', backref='user', lazy=True, uselist=False)
    notes = db.relationship('Note', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)

class UserProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    completed_days = db.Column(db.Integer, default=0)
    completed_projects = db.Column(db.Integer, default=0)
    solved_problems = db.Column(db.Integer, default=0)
    study_hours = db.Column(db.Float, default=0.0)
    current_week = db.Column(db.Integer, default=1)
    current_day = db.Column(db.Integer, default=1)
    streak = db.Column(db.Integer, default=0)
    last_study_date = db.Column(db.DateTime)
    week_progress = db.Column(db.Text)  # JSON string
    topic_mastery = db.Column(db.Text)  # JSON string
    achievements = db.Column(db.Text)  # JSON string
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    category = db.Column(db.String(50), default='General')
    week = db.Column(db.Integer)
    tags = db.Column(db.Text)  # JSON string
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    week = db.Column(db.Integer)
    github_link = db.Column(db.String(500))
    live_demo = db.Column(db.String(500))
    technologies = db.Column(db.Text)  # JSON string
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, planned
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudySession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    duration = db.Column(db.Float, nullable=False)  # in hours
    week = db.Column(db.Integer)
    day = db.Column(db.Integer)
    topics = db.Column(db.Text)  # JSON string
    notes = db.Column(db.Text)
    session_date = db.Column(db.DateTime, default=datetime.utcnow)

# Utility Functions
def json_safe_loads(data, default=None):
    """Safely load JSON data with fallback"""
    if not data:
        return default or {}
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return default or {}

def json_safe_dumps(data):
    """Safely dump data to JSON string"""
    if data is None:
        return '{}'
    try:
        return json.dumps(data)
    except (TypeError, ValueError):
        return '{}'

def require_auth(f):
    """Custom decorator that handles both JWT and session-based auth"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Try JWT first
        try:
            return jwt_required()(f)(*args, **kwargs)
        except:
            # Fallback to session-based auth for development
            if 'user_id' in session:
                return f(*args, **kwargs)
            return jsonify({'error': 'Authentication required'}), 401
    return decorated_function

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validation
        if not data or not data.get('email') or not data.get('password') or not data.get('username'):
            return jsonify({'error': 'Email, username, and password are required'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Create user
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        user = User(
            email=data['email'],
            username=data['username'],
            password_hash=password_hash
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create initial progress record
        progress = UserProgress(user_id=user.id)
        db.session.add(progress)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user and bcrypt.check_password_hash(user.password_hash, data['password']):
            access_token = create_access_token(identity=user.id)
            session['user_id'] = user.id  # Also set session for fallback
            
            return jsonify({
                'message': 'Login successful',
                'token': access_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

# Progress Routes
@app.route('/api/progress', methods=['GET'])
@require_auth
def get_progress():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        
        if not progress:
            # Create default progress if not exists
            progress = UserProgress(user_id=user_id)
            db.session.add(progress)
            db.session.commit()
        
        return jsonify({
            'completed_days': progress.completed_days,
            'completed_projects': progress.completed_projects,
            'solved_problems': progress.solved_problems,
            'study_hours': progress.study_hours,
            'current_week': progress.current_week,
            'current_day': progress.current_day,
            'streak': progress.streak,
            'last_study_date': progress.last_study_date.isoformat() if progress.last_study_date else None,
            'week_progress': json_safe_loads(progress.week_progress, [0] * 14),
            'topic_mastery': json_safe_loads(progress.topic_mastery),
            'achievements': json_safe_loads(progress.achievements, []),
            'updated_at': progress.updated_at.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress', methods=['POST', 'PUT'])
def update_progress():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
            
        data = request.get_json()
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        
        if not progress:
            progress = UserProgress(user_id=user_id)
            db.session.add(progress)
        
        # Update fields if provided
        if 'completed_days' in data:
            progress.completed_days = data['completed_days']
        if 'completed_projects' in data:
            progress.completed_projects = data['completed_projects']
        if 'solved_problems' in data:
            progress.solved_problems = data['solved_problems']
        if 'study_hours' in data:
            progress.study_hours = data['study_hours']
        if 'current_week' in data:
            progress.current_week = data['current_week']
        if 'current_day' in data:
            progress.current_day = data['current_day']
        if 'streak' in data:
            progress.streak = data['streak']
        if 'last_study_date' in data:
            progress.last_study_date = datetime.fromisoformat(data['last_study_date'].replace('Z', '+00:00'))
        if 'week_progress' in data:
            progress.week_progress = json_safe_dumps(data['week_progress'])
        if 'topic_mastery' in data:
            progress.topic_mastery = json_safe_dumps(data['topic_mastery'])
        if 'achievements' in data:
            progress.achievements = json_safe_dumps(data['achievements'])
        
        db.session.commit()
        
        return jsonify({'message': 'Progress updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Notes Routes
@app.route('/api/notes', methods=['GET'])
@require_auth
def get_notes():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        notes = Note.query.filter_by(user_id=user_id).order_by(Note.updated_at.desc()).all()
        
        notes_data = []
        for note in notes:
            notes_data.append({
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'category': note.category,
                'week': note.week,
                'tags': json_safe_loads(note.tags, []),
                'is_pinned': note.is_pinned,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat()
            })
        
        return jsonify(notes_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
@require_auth
def create_note():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        data = request.get_json()
        
        if not data or not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        
        note = Note(
            user_id=user_id,
            title=data['title'],
            content=data.get('content', ''),
            category=data.get('category', 'General'),
            week=data.get('week'),
            tags=json_safe_dumps(data.get('tags', [])),
            is_pinned=data.get('is_pinned', False)
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'id': note.id,
            'message': 'Note created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
@require_auth
def update_note(note_id):
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({'error': 'Note not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            note.title = data['title']
        if 'content' in data:
            note.content = data['content']
        if 'category' in data:
            note.category = data['category']
        if 'week' in data:
            note.week = data['week']
        if 'tags' in data:
            note.tags = json_safe_dumps(data['tags'])
        if 'is_pinned' in data:
            note.is_pinned = data['is_pinned']
        
        db.session.commit()
        
        return jsonify({'message': 'Note updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@require_auth
def delete_note(note_id):
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({'error': 'Note not found'}), 404
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({'message': 'Note deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Projects Routes
@app.route('/api/projects', methods=['GET'])
@require_auth
def get_projects():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        projects = Project.query.filter_by(user_id=user_id).order_by(Project.updated_at.desc()).all()
        
        projects_data = []
        for project in projects:
            projects_data.append({
                'id': project.id,
                'title': project.title,
                'description': project.description,
                'week': project.week,
                'github_link': project.github_link,
                'live_demo': project.live_demo,
                'technologies': json_safe_loads(project.technologies, []),
                'status': project.status,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat()
            })
        
        return jsonify(projects_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
@require_auth
def create_project():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        data = request.get_json()
        
        if not data or not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        
        project = Project(
            user_id=user_id,
            title=data['title'],
            description=data.get('description', ''),
            week=data.get('week'),
            github_link=data.get('github_link', ''),
            live_demo=data.get('live_demo', ''),
            technologies=json_safe_dumps(data.get('technologies', [])),
            status=data.get('status', 'planned')
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'id': project.id,
            'message': 'Project created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@require_auth
def update_project(project_id):
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        project = Project.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            project.title = data['title']
        if 'description' in data:
            project.description = data['description']
        if 'week' in data:
            project.week = data['week']
        if 'github_link' in data:
            project.github_link = data['github_link']
        if 'live_demo' in data:
            project.live_demo = data['live_demo']
        if 'technologies' in data:
            project.technologies = json_safe_dumps(data['technologies'])
        if 'status' in data:
            project.status = data['status']
        
        db.session.commit()
        
        return jsonify({'message': 'Project updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@require_auth
def delete_project(project_id):
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        project = Project.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({'message': 'Project deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Statistics Routes
@app.route('/api/statistics', methods=['GET'])
@require_auth
def get_statistics():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        
        # Get progress data
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        
        # Get notes count
        notes_count = Note.query.filter_by(user_id=user_id).count()
        
        # Get projects count by status
        projects_total = Project.query.filter_by(user_id=user_id).count()
        projects_completed = Project.query.filter_by(user_id=user_id, status='completed').count()
        
        # Get recent study sessions
        recent_sessions = StudySession.query.filter_by(user_id=user_id)\
            .order_by(StudySession.session_date.desc()).limit(7).all()
        
        sessions_data = []
        for session in recent_sessions:
            sessions_data.append({
                'duration': session.duration,
                'date': session.session_date.isoformat(),
                'week': session.week,
                'day': session.day
            })
        
        stats = {
            'progress': {
                'completed_days': progress.completed_days if progress else 0,
                'completed_projects': progress.completed_projects if progress else 0,
                'solved_problems': progress.solved_problems if progress else 0,
                'study_hours': progress.study_hours if progress else 0,
                'streak': progress.streak if progress else 0,
            },
            'content': {
                'notes_count': notes_count,
                'projects_total': projects_total,
                'projects_completed': projects_completed
            },
            'recent_sessions': sessions_data
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Resources Routes
@app.route('/api/resources', methods=['GET'])
def get_resources():
    try:
        # Load resources from JSON file
        resources_file = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'resources', 'dsa_resources.json')
        
        if os.path.exists(resources_file):
            with open(resources_file, 'r') as f:
                resources = json.load(f)
            return jsonify(resources), 200
        else:
            # Return default resources if file not found
            default_resources = {
                'categories': {
                    'videos': 'Video Tutorials',
                    'visualizers': 'Algorithm Visualizers',
                    'practice': 'Practice Platforms',
                    'articles': 'Articles & Documentation'
                },
                'resources': []
            }
            return jsonify(default_resources), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Study Session Routes
@app.route('/api/study-sessions', methods=['POST'])
@require_auth
def create_study_session():
    try:
        user_id = get_jwt_identity() or session.get('user_id')
        data = request.get_json()
        
        if not data or not data.get('duration'):
            return jsonify({'error': 'Duration is required'}), 400
        
        session_obj = StudySession(
            user_id=user_id,
            duration=data['duration'],
            week=data.get('week'),
            day=data.get('day'),
            topics=json_safe_dumps(data.get('topics', [])),
            notes=data.get('notes', '')
        )
        
        db.session.add(session_obj)
        db.session.commit()
        
        return jsonify({
            'id': session_obj.id,
            'message': 'Study session recorded successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# Health Check Route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }), 200

# Initialize Database
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )