from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date
import os
from functools import wraps
import json
import uuid
import logging
from collections import defaultdict

# Initialize Flask app
app = Flask(__name__)

# Enhanced Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

# Database configuration - Production ready for Render
if os.environ.get('DATABASE_URL'):
    # Production database (PostgreSQL on Render)
    database_url = os.environ.get('DATABASE_URL')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Development database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dsa_dashboard.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 300,
    'pool_pre_ping': True,
}

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Enhanced CORS configuration
CORS(app, origins=[
    "https://your-vercel-app.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
], supports_credentials=True)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enhanced Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Enhanced Profile data
    avatar_url = db.Column(db.String(500))
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    github_username = db.Column(db.String(100))
    linkedin_url = db.Column(db.String(500))
    
    # Gamification
    total_points = db.Column(db.Integer, default=0)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    level = db.Column(db.Integer, default=1)
    experience_points = db.Column(db.Integer, default=0)
    
    # Study preferences
    daily_goal_minutes = db.Column(db.Integer, default=60)
    preferred_study_time = db.Column(db.String(20), default='morning')  # morning, afternoon, evening
    difficulty_preference = db.Column(db.String(20), default='medium')  # easy, medium, hard
    
    # Relationships
    progress = db.relationship('Progress', backref='user', lazy=True, cascade='all, delete-orphan')
    notes = db.relationship('Note', backref='user', lazy=True, cascade='all, delete-orphan')
    pomodoro_sessions = db.relationship('PomodoroSession', backref='user', lazy=True, cascade='all, delete-orphan')
    achievements = db.relationship('UserAchievement', backref='user', lazy=True, cascade='all, delete-orphan')
    daily_goals = db.relationship('DailyGoal', backref='user', lazy=True, cascade='all, delete-orphan')
    study_sessions = db.relationship('StudySession', backref='user', lazy=True, cascade='all, delete-orphan')

class Progress(db.Model):
    __tablename__ = 'progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    week_number = db.Column(db.Integer, nullable=False, index=True)
    day_number = db.Column(db.Integer, nullable=False)
    topic = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False, index=True)
    completion_date = db.Column(db.DateTime)
    time_spent = db.Column(db.Integer, default=0)  # in minutes
    difficulty_rating = db.Column(db.Integer)  # 1-5 scale
    confidence_level = db.Column(db.Integer)  # 1-5 scale
    notes = db.Column(db.Text)
    resources_used = db.Column(db.Text)  # JSON string of resources
    practice_problems_solved = db.Column(db.Integer, default=0)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'week_number', 'day_number'),)

class Note(db.Model):
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(100), index=True)
    week_number = db.Column(db.Integer)
    tags = db.Column(db.Text)  # JSON string of tags
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_favorite = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=False)
    note_type = db.Column(db.String(50), default='general')  # general, code_snippet, algorithm, concept
    code_language = db.Column(db.String(50))  # for code snippets
    view_count = db.Column(db.Integer, default=0)

class PomodoroSession(db.Model):
    __tablename__ = 'pomodoro_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    topic = db.Column(db.String(200))
    week_number = db.Column(db.Integer)
    day_number = db.Column(db.Integer)
    completed = db.Column(db.Boolean, default=False)
    interruptions = db.Column(db.Integer, default=0)
    focus_rating = db.Column(db.Integer)  # 1-5 scale
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    badge_icon = db.Column(db.String(100))
    points = db.Column(db.Integer, default=0)
    category = db.Column(db.String(50))  # streak, completion, time, mastery
    requirement_type = db.Column(db.String(50))  # count, streak, percentage
    requirement_value = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    achievement = db.relationship('Achievement', backref='user_achievements')
    
    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id'),)

class DailyGoal(db.Model):
    __tablename__ = 'daily_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    study_time_goal = db.Column(db.Integer, default=60)  # minutes
    study_time_actual = db.Column(db.Integer, default=0)
    topics_goal = db.Column(db.Integer, default=3)
    topics_completed = db.Column(db.Integer, default=0)
    pomodoro_goal = db.Column(db.Integer, default=4)
    pomodoro_completed = db.Column(db.Integer, default=0)
    notes_goal = db.Column(db.Integer, default=2)
    notes_created = db.Column(db.Integer, default=0)
    goal_achieved = db.Column(db.Boolean, default=False)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'date'),)

class StudySession(db.Model):
    __tablename__ = 'study_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    duration = db.Column(db.Integer)  # in minutes
    topics_covered = db.Column(db.Text)  # JSON array
    week_number = db.Column(db.Integer)
    productivity_rating = db.Column(db.Integer)  # 1-5 scale
    mood_before = db.Column(db.String(20))  # energetic, tired, motivated, etc.
    mood_after = db.Column(db.String(20))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

# Enhanced Utility Functions
def update_user_streak(user):
    """Enhanced streak calculation with timezone awareness"""
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # Check if user was active today
    today_activity = Progress.query.filter_by(
        user_id=user.id,
        completed=True
    ).filter(db.func.date(Progress.completion_date) == today).first()
    
    # Check if user was active yesterday
    yesterday_activity = Progress.query.filter_by(
        user_id=user.id,
        completed=True
    ).filter(db.func.date(Progress.completion_date) == yesterday).first()
    
    if today_activity:
        if yesterday_activity or user.current_streak == 0:
            if user.last_activity.date() != today:
                user.current_streak += 1
        user.last_activity = datetime.utcnow()
        
        if user.current_streak > user.longest_streak:
            user.longest_streak = user.current_streak
    else:
        # Reset streak if no activity today and it's past the user's preferred study time
        current_hour = datetime.utcnow().hour
        if current_hour > 20:  # After 8 PM, consider day ended
            if user.last_activity.date() < yesterday:
                user.current_streak = 0

def calculate_user_points(user):
    """Enhanced points calculation with multiple factors"""
    completed_topics = Progress.query.filter_by(user_id=user.id, completed=True).count()
    pomodoro_sessions = PomodoroSession.query.filter_by(user_id=user.id, completed=True).count()
    notes_count = Note.query.filter_by(user_id=user.id).count()
    achievements_count = UserAchievement.query.filter_by(user_id=user.id).count()
    
    # Enhanced point calculation
    points = (
        (completed_topics * 15) +
        (pomodoro_sessions * 5) +
        (notes_count * 3) +
        (user.current_streak * 10) +
        (achievements_count * 25) +
        (user.longest_streak * 5)
    )
    
    # Bonus for consistency (completed topics in last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_completions = Progress.query.filter(
        Progress.user_id == user.id,
        Progress.completed == True,
        Progress.completion_date >= week_ago
    ).count()
    
    if recent_completions >= 5:
        points += 50  # Consistency bonus
    
    user.total_points = points
    
    # Update level based on points
    new_level = min(100, max(1, (points // 1000) + 1))
    if new_level > user.level:
        user.level = new_level
        # Award level up achievement
        check_and_award_achievements(user.id, 'level_up', new_level)
    
    return points

def check_and_award_achievements(user_id, achievement_type, value=None):
    """Check and award achievements based on user activity"""
    try:
        user = User.query.get(user_id)
        if not user:
            return
        
        # Define achievement criteria
        achievement_criteria = {
            'first_signup': lambda: True,
            'first_topic': lambda: Progress.query.filter_by(user_id=user_id, completed=True).count() >= 1,
            'week_warrior': lambda: user.current_streak >= 7,
            'month_master': lambda: user.current_streak >= 30,
            'century_club': lambda: user.current_streak >= 100,
            'note_taker': lambda: Note.query.filter_by(user_id=user_id).count() >= 10,
            'pomodoro_pro': lambda: PomodoroSession.query.filter_by(user_id=user_id, completed=True).count() >= 25,
            'week_completionist': lambda: check_week_completion(user_id),
            'early_bird': lambda: check_early_bird_pattern(user_id),
            'night_owl': lambda: check_night_owl_pattern(user_id),
            'level_up': lambda: True if value else False,
        }
        
        # Check specific achievement or all
        achievements_to_check = [achievement_type] if achievement_type in achievement_criteria else achievement_criteria.keys()
        
        for ach_name in achievements_to_check:
            if ach_name in achievement_criteria and achievement_criteria[ach_name]():
                # Check if user already has this achievement
                existing = UserAchievement.query.join(Achievement).filter(
                    UserAchievement.user_id == user_id,
                    Achievement.name == ach_name
                ).first()
                
                if not existing:
                    achievement = Achievement.query.filter_by(name=ach_name).first()
                    if achievement:
                        user_achievement = UserAchievement(
                            user_id=user_id,
                            achievement_id=achievement.id
                        )
                        db.session.add(user_achievement)
                        user.total_points += achievement.points
        
        db.session.commit()
        
    except Exception as e:
        logger.error(f"Error checking achievements: {str(e)}")
        db.session.rollback()

def check_week_completion(user_id):
    """Check if user completed a full week"""
    for week in range(1, 15):  # Check weeks 1-14
        week_progress = Progress.query.filter_by(
            user_id=user_id,
            week_number=week,
            completed=True
        ).count()
        if week_progress >= 5:  # Assuming 5 days per week
            return True
    return False

def check_early_bird_pattern(user_id):
    """Check if user consistently studies in the morning"""
    morning_sessions = PomodoroSession.query.filter(
        PomodoroSession.user_id == user_id,
        db.extract('hour', PomodoroSession.created_at) < 12
    ).count()
    total_sessions = PomodoroSession.query.filter_by(user_id=user_id).count()
    return total_sessions > 10 and (morning_sessions / total_sessions) > 0.7

def check_night_owl_pattern(user_id):
    """Check if user consistently studies at night"""
    night_sessions = PomodoroSession.query.filter(
        PomodoroSession.user_id == user_id,
        db.extract('hour', PomodoroSession.created_at) > 20
    ).count()
    total_sessions = PomodoroSession.query.filter_by(user_id=user_id).count()
    return total_sessions > 10 and (night_sessions / total_sessions) > 0.7

def init_achievements():
    """Initialize default achievements"""
    achievements_data = [
        {
            'name': 'first_signup',
            'title': 'Welcome Aboard!',
            'description': 'Successfully registered for the DSA learning journey',
            'badge_icon': '🎉',
            'points': 10,
            'category': 'milestone'
        },
        {
            'name': 'first_topic',
            'title': 'First Steps',
            'description': 'Completed your first topic',
            'badge_icon': '👶',
            'points': 25,
            'category': 'completion'
        },
        {
            'name': 'week_warrior',
            'title': 'Week Warrior',
            'description': 'Maintained a 7-day study streak',
            'badge_icon': '⚔️',
            'points': 100,
            'category': 'streak'
        },
        {
            'name': 'month_master',
            'title': 'Month Master',
            'description': 'Maintained a 30-day study streak',
            'badge_icon': '👑',
            'points': 500,
            'category': 'streak'
        },
        {
            'name': 'century_club',
            'title': 'Century Club',
            'description': 'Achieved a 100-day study streak',
            'badge_icon': '💯',
            'points': 1000,
            'category': 'streak'
        },
        {
            'name': 'note_taker',
            'title': 'Note Taker',
            'description': 'Created 10 study notes',
            'badge_icon': '📝',
            'points': 50,
            'category': 'productivity'
        },
        {
            'name': 'pomodoro_pro',
            'title': 'Pomodoro Pro',
            'description': 'Completed 25 pomodoro sessions',
            'badge_icon': '🍅',
            'points': 75,
            'category': 'time'
        },
        {
            'name': 'week_completionist',
            'title': 'Week Completionist',
            'description': 'Completed an entire week of study topics',
            'badge_icon': '✅',
            'points': 200,
            'category': 'completion'
        },
        {
            'name': 'early_bird',
            'title': 'Early Bird',
            'description': 'Consistently study in the morning',
            'badge_icon': '🌅',
            'points': 100,
            'category': 'habit'
        },
        {
            'name': 'night_owl',
            'title': 'Night Owl',
            'description': 'Consistently study at night',
            'badge_icon': '🦉',
            'points': 100,
            'category': 'habit'
        }
    ]
    
    for ach_data in achievements_data:
        existing = Achievement.query.filter_by(name=ach_data['name']).first()
        if not existing:
            achievement = Achievement(**ach_data)
            db.session.add(achievement)
    
    try:
        db.session.commit()
        logger.info("Achievements initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing achievements: {str(e)}")
        db.session.rollback()

def create_tables():
    """Initialize database tables and achievements"""
    try:
        with app.app_context():
            db.create_all()
            init_achievements()
            logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# Enhanced Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Enhanced validation
        if not data.get('username') or len(data['username']) < 3:
            return jsonify({'message': 'Username must be at least 3 characters long'}), 400
            
        if not data.get('email') or '@' not in data['email']:
            return jsonify({'message': 'Valid email is required'}), 400
            
        if not data.get('password') or len(data['password']) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'Username already exists'}), 400
            
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already exists'}), 400
        
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        
        db.session.add(user)
        db.session.flush()  # Get user.id before commit
        
        # Award first achievement
        check_and_award_achievements(user.id, 'first_signup')
        
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"New user registered: {user.username}")
        
        return jsonify({
            'message': 'User created successfully',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': 'Registration failed. Please try again.'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and check_password_hash(user.password_hash, data['password']):
            # Update last activity
            user.last_activity = datetime.utcnow()
            
            # Update user stats
            update_user_streak(user)
            calculate_user_points(user)
            
            db.session.commit()
            
            access_token = create_access_token(identity=user.id)
            
            logger.info(f"User logged in: {user.username}")
            
            return jsonify({
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'total_points': user.total_points,
                    'current_streak': user.current_streak,
                    'level': user.level
                }
            }), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed. Please try again.'}), 500

# Enhanced Progress Routes
@app.route('/api/progress', methods=['GET'])
@jwt_required()
def get_progress():
    try:
        user_id = get_jwt_identity()
        week = request.args.get('week', type=int)
        
        query = Progress.query.filter_by(user_id=user_id)
        if week:
            query = query.filter_by(week_number=week)
        
        progress = query.all()
        
        result = []
        for p in progress:
            result.append({
                'id': p.id,
                'week_number': p.week_number,
                'day_number': p.day_number,
                'topic': p.topic,
                'completed': p.completed,
                'completion_date': p.completion_date.isoformat() if p.completion_date else None,
                'time_spent': p.time_spent,
                'difficulty_rating': p.difficulty_rating,
                'confidence_level': p.confidence_level,
                'notes': p.notes,
                'resources_used': json.loads(p.resources_used) if p.resources_used else [],
                'practice_problems_solved': p.practice_problems_solved
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get progress error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/progress', methods=['POST'])
@jwt_required()
def update_progress():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if progress entry exists
        progress = Progress.query.filter_by(
            user_id=user_id,
            week_number=data['week_number'],
            day_number=data['day_number']
        ).first()
        
        if not progress:
            progress = Progress(
                user_id=user_id,
                week_number=data['week_number'],
                day_number=data['day_number'],
                topic=data['topic']
            )
            db.session.add(progress)
        
        # Update fields
        progress.completed = data.get('completed', False)
        progress.time_spent = data.get('time_spent', 0)
        progress.difficulty_rating = data.get('difficulty_rating')
        progress.confidence_level = data.get('confidence_level')
        progress.notes = data.get('notes', '')
        progress.resources_used = json.dumps(data.get('resources_used', []))
        progress.practice_problems_solved = data.get('practice_problems_solved', 0)
        
        if progress.completed and not progress.completion_date:
            progress.completion_date = datetime.utcnow()
        
        # Update user streak and points
        user = User.query.get(user_id)
        update_user_streak(user)
        calculate_user_points(user)
        
        # Check for achievements
        if progress.completed:
            check_and_award_achievements(user_id, 'first_topic')
            check_and_award_achievements(user_id, 'week_completionist')
        
        db.session.commit()
        
        return jsonify({'message': 'Progress updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update progress error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Enhanced Notes Routes
@app.route('/api/notes', methods=['GET'])
@jwt_required()
def get_notes():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        topic = request.args.get('topic', '')
        note_type = request.args.get('type', '')
        favorites_only = request.args.get('favorites', 'false').lower() == 'true'
        
        query = Note.query.filter_by(user_id=user_id)
        
        if search:
            query = query.filter(
                db.or_(
                    Note.title.contains(search),
                    Note.content.contains(search),
                    Note.tags.contains(search)
                )
            )
        
        if topic:
            query = query.filter_by(topic=topic)
            
        if note_type:
            query = query.filter_by(note_type=note_type)
            
        if favorites_only:
            query = query.filter_by(is_favorite=True)
        
        notes = query.order_by(Note.updated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        for note in notes.items:
            result.append({
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'topic': note.topic,
                'week_number': note.week_number,
                'tags': json.loads(note.tags) if note.tags else [],
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
                'is_favorite': note.is_favorite,
                'is_public': note.is_public,
                'note_type': note.note_type,
                'code_language': note.code_language,
                'view_count': note.view_count
            })
        
        return jsonify({
            'notes': result,
            'pagination': {
                'page': notes.page,
                'pages': notes.pages,
                'per_page': notes.per_page,
                'total': notes.total
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get notes error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
@jwt_required()
def create_note():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        note = Note(
            user_id=user_id,
            title=data['title'],
            content=data['content'],
            topic=data.get('topic', ''),
            week_number=data.get('week_number'),
            tags=json.dumps(data.get('tags', [])),
            is_favorite=data.get('is_favorite', False),
            is_public=data.get('is_public', False),
            note_type=data.get('note_type', 'general'),
            code_language=data.get('code_language')
        )
        
        db.session.add(note)
        
        # Check for note-taking achievements
        check_and_award_achievements(user_id, 'note_taker')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Note created successfully',
            'note_id': note.id
        }), 201
        
    except Exception as e:
        logger.error(f"Create note error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    try:
        user_id = get_jwt_identity()
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({'message': 'Note not found'}), 404
        
        data = request.get_json()
        note.title = data.get('title', note.title)
        note.content = data.get('content', note.content)
        note.topic = data.get('topic', note.topic)
        note.week_number = data.get('week_number', note.week_number)
        note.tags = json.dumps(data.get('tags', json.loads(note.tags) if note.tags else []))
        note.is_favorite = data.get('is_favorite', note.is_favorite)
        note.is_public = data.get('is_public', note.is_public)
        note.note_type = data.get('note_type', note.note_type)
        note.code_language = data.get('code_language', note.code_language)
        note.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Note updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update note error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    try:
        user_id = get_jwt_identity()
        note = Note.query.filter_by(id=note_id, user_id=user_id).first()
        
        if not note:
            return jsonify({'message': 'Note not found'}), 404
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({'message': 'Note deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete note error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Enhanced Pomodoro Routes
@app.route('/api/pomodoro', methods=['POST'])
@jwt_required()
def create_pomodoro_session():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        session = PomodoroSession(
            user_id=user_id,
            duration=data['duration'],
            topic=data.get('topic', ''),
            week_number=data.get('week_number'),
            day_number=data.get('day_number'),
            completed=data.get('completed', True),
            interruptions=data.get('interruptions', 0),
            focus_rating=data.get('focus_rating')
        )
        
        db.session.add(session)
        
        # Update user points and check achievements
        user = User.query.get(user_id)
        calculate_user_points(user)
        check_and_award_achievements(user_id, 'pomodoro_pro')
        
        db.session.commit()
        
        return jsonify({'message': 'Pomodoro session saved'}), 201
        
    except Exception as e:
        logger.error(f"Create pomodoro session error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/pomodoro/stats', methods=['GET'])
@jwt_required()
def get_pomodoro_stats():
    try:
        user_id = get_jwt_identity()
        days = request.args.get('days', 7, type=int)
        
        # Get stats for the specified number of days
        start_date = datetime.utcnow() - timedelta(days=days)
        sessions = PomodoroSession.query.filter_by(
            user_id=user_id,
            completed=True
        ).filter(PomodoroSession.created_at >= start_date).all()
        
        total_sessions = len(sessions)
        total_time = sum(session.duration for session in sessions)
        
        # Calculate daily breakdown
        daily_stats = defaultdict(lambda: {'sessions': 0, 'time': 0})
        for session in sessions:
            day_key = session.created_at.date().isoformat()
            daily_stats[day_key]['sessions'] += 1
            daily_stats[day_key]['time'] += session.duration
        
        # Focus rating average
        focus_ratings = [s.focus_rating for s in sessions if s.focus_rating]
        avg_focus = sum(focus_ratings) / len(focus_ratings) if focus_ratings else 0
        
        return jsonify({
            'total_sessions': total_sessions,
            'total_time': total_time,
            'average_per_day': total_time / days,
            'average_focus_rating': round(avg_focus, 1),
            'daily_breakdown': dict(daily_stats)
        }), 200
        
    except Exception as e:
        logger.error(f"Get pomodoro stats error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Enhanced Dashboard Routes
@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Update user data
        update_user_streak(user)
        calculate_user_points(user)
        
        # Get completion stats
        total_topics = Progress.query.filter_by(user_id=user_id).count()
        completed_topics = Progress.query.filter_by(user_id=user_id, completed=True).count()
        
        # Get this week's progress
        current_week = datetime.utcnow().isocalendar()[1]
        week_progress = Progress.query.filter_by(
            user_id=user_id,
            week_number=current_week
        ).all()
        
        week_completed = sum(1 for p in week_progress if p.completed)
        week_total = len(week_progress)
        
        # Get recent activity
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_notes = Note.query.filter_by(user_id=user_id).filter(
            Note.created_at >= week_ago
        ).count()
        
        recent_pomodoros = PomodoroSession.query.filter_by(
            user_id=user_id,
            completed=True
        ).filter(PomodoroSession.created_at >= week_ago).count()
        
        # Get achievements
        achievements = UserAchievement.query.filter_by(user_id=user_id).join(
            Achievement
        ).order_by(UserAchievement.earned_at.desc()).limit(5).all()
        
        recent_achievements = []
        for ua in achievements:
            recent_achievements.append({
                'title': ua.achievement.title,
                'description': ua.achievement.description,
                'badge_icon': ua.achievement.badge_icon,
                'points': ua.achievement.points,
                'earned_at': ua.earned_at.isoformat()
            })
        
        db.session.commit()
        
        return jsonify({
            'user': {
                'username': user.username,
                'total_points': user.total_points,
                'current_streak': user.current_streak,
                'longest_streak': user.longest_streak,
                'level': user.level,
                'daily_goal_minutes': user.daily_goal_minutes
            },
            'progress': {
                'total_topics': total_topics,
                'completed_topics': completed_topics,
                'completion_percentage': (completed_topics / total_topics * 100) if total_topics > 0 else 0,
                'week_progress': {
                    'completed': week_completed,
                    'total': week_total,
                    'percentage': (week_completed / week_total * 100) if week_total > 0 else 0
                }
            },
            'recent_activity': {
                'notes_created': recent_notes,
                'pomodoros_completed': recent_pomodoros
            },
            'recent_achievements': recent_achievements
        }), 200
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Enhanced Leaderboard Route
@app.route('/api/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    try:
        leaderboard_type = request.args.get('type', 'points')  # points, streak, level
        limit = request.args.get('limit', 10, type=int)
        
        if leaderboard_type == 'streak':
            top_users = User.query.order_by(User.current_streak.desc()).limit(limit).all()
        elif leaderboard_type == 'level':
            top_users = User.query.order_by(User.level.desc(), User.total_points.desc()).limit(limit).all()
        else:  # points
            top_users = User.query.order_by(User.total_points.desc()).limit(limit).all()
        
        leaderboard = []
        for i, user in enumerate(top_users):
            leaderboard.append({
                'rank': i + 1,
                'username': user.username,
                'points': user.total_points,
                'streak': user.current_streak,
                'level': user.level,
                'avatar_url': user.avatar_url
            })
        
        return jsonify(leaderboard), 200
        
    except Exception as e:
        logger.error(f"Get leaderboard error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# COMPLETE ROADMAP ROUTE WITH ALL 14 WEEKS AND DETAILED DAYS
@app.route('/api/roadmap/complete', methods=['GET'])
def get_complete_roadmap():
    """Get the complete detailed DSA roadmap with all weeks, days, and resources"""
    
    complete_roadmap = {
        "total_weeks": 14,
        "total_days": 98,
        "estimated_hours": 280,
        "difficulty_progression": "Beginner → Intermediate → Advanced → Expert",
        "weeks": [
            {
                "week": 1,
                "title": "Foundation & Environment Setup",
                "description": "Build strong programming foundations and set up development environment",
                "difficulty": "Beginner",
                "estimated_hours": 15,
                "learning_objectives": [
                    "Set up complete development environment",
                    "Master basic programming syntax",
                    "Understand input/output operations",
                    "Learn function creation and usage",
                    "Practice basic array operations"
                ],
                "days": [
                    {
                        "day": 1,
                        "topic": "Environment Setup & IDE Configuration",
                        "subtopics": [
                            "Install Python 3.11+ or C++17",
                            "Set up VS Code with extensions",
                            "Configure Git and GitHub",
                            "Install debugging tools",
                            "Set up virtual environment"
                        ],
                        "time_estimate": "2-3 hours",
                        "resources": {
                            "text": [
                                {"title": "Python Installation Guide", "url": "https://www.python.org/downloads/", "difficulty": "Beginner"},
                                {"title": "VS Code Setup", "url": "https://code.visualstudio.com/docs/python/python-tutorial", "difficulty": "Beginner"},
                                {"title": "Git Basics", "url": "https://www.w3schools.com/git/", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Complete Python Setup", "url": "https://www.youtube.com/watch?v=YYXdXT2l-Gg", "duration": "15 min"},
                                {"title": "VS Code for Python", "url": "https://www.youtube.com/watch?v=7EXd4_ttIuw", "duration": "20 min"}
                            ],
                            "interactive": [
                                {"title": "Git Interactive Tutorial", "url": "https://learngitbranching.js.org/", "type": "hands-on"}
                            ]
                        },
                        "practice": [
                            "Create first Python script",
                            "Set up GitHub repository",
                            "Configure VS Code settings",
                            "Test debugging setup"
                        ]
                    },
                    {
                        "day": 2,
                        "topic": "Basic Syntax & Data Types",
                        "subtopics": [
                            "Variables and naming conventions",
                            "Primitive data types",
                            "Type conversion",
                            "Operators (arithmetic, logical, comparison)",
                            "Constants and scope"
                        ],
                        "time_estimate": "2-3 hours",
                        "resources": {
                            "text": [
                                {"title": "Python Variables", "url": "https://www.w3schools.com/python/python_variables.asp", "difficulty": "Beginner"},
                                {"title": "Data Types - Programiz", "url": "https://www.programiz.com/python-programming/variables-datatypes", "difficulty": "Beginner"},
                                {"title": "Operators Guide", "url": "https://www.javatpoint.com/python-operators", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Python Basics - Variables", "url": "https://www.youtube.com/watch?v=cQT33yu9pY8", "duration": "25 min"},
                                {"title": "Data Types Explained", "url": "https://www.youtube.com/watch?v=gCCVsvgR2KU", "duration": "18 min"}
                            ],
                            "practice_platforms": [
                                {"title": "CodingBat - Warmup", "url": "https://codingbat.com/python/Warmup-1", "problems": 12}
                            ]
                        },
                        "practice": [
                            "Create calculator with all operators",
                            "Type conversion exercises",
                            "Variable scope examples",
                            "10 coding problems on operators"
                        ],
                        "leetcode_problems": [
                            {"id": 2235, "title": "Add Two Integers", "difficulty": "Easy"},
                            {"id": 2413, "title": "Smallest Even Multiple", "difficulty": "Easy"}
                        ]
                    },
                    {
                        "day": 3,
                        "topic": "Input/Output Operations",
                        "subtopics": [
                            "Console input/output",
                            "String formatting",
                            "File I/O operations",
                            "Error handling basics",
                            "Command line arguments"
                        ],
                        "time_estimate": "2-3 hours",
                        "resources": {
                            "text": [
                                {"title": "Python Input/Output", "url": "https://www.w3schools.com/python/python_user_input.asp", "difficulty": "Beginner"},
                                {"title": "File Handling", "url": "https://www.programiz.com/python-programming/file-io", "difficulty": "Beginner"},
                                {"title": "String Formatting", "url": "https://www.w3schools.com/python/python_string_formatting.asp", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Input/Output in Python", "url": "https://www.youtube.com/watch?v=FhoASwgvZHk", "duration": "20 min"},
                                {"title": "File Operations", "url": "https://www.youtube.com/watch?v=Uh2ebFW8OYM", "duration": "30 min"}
                            ]
                        },
                        "practice": [
                            "Build input validator",
                            "Create file reader/writer",
                            "Format output tables",
                            "Handle different input types"
                        ]
                    },
                    {
                        "day": 4,
                        "topic": "Functions & Modular Programming",
                        "subtopics": [
                            "Function definition and calls",
                            "Parameters and return values",
                            "Local vs global scope",
                            "Lambda functions",
                            "Function documentation"
                        ],
                        "time_estimate": "2-3 hours",
                        "resources": {
                            "text": [
                                {"title": "Python Functions", "url": "https://www.w3schools.com/python/python_functions.asp", "difficulty": "Beginner"},
                                {"title": "Function Parameters", "url": "https://www.programiz.com/python-programming/function-argument", "difficulty": "Beginner"},
                                {"title": "Lambda Functions", "url": "https://www.w3schools.com/python/python_lambda.asp", "difficulty": "Intermediate"}
                            ],
                            "videos": [
                                {"title": "Functions Explained", "url": "https://www.youtube.com/watch?v=9Os0o3wzS_I", "duration": "35 min"},
                                {"title": "Advanced Functions", "url": "https://www.youtube.com/watch?v=BVfCWuca9nw", "duration": "25 min"}
                            ]
                        },
                        "practice": [
                            "Create function library",
                            "Build recursive functions",
                            "Practice scope problems",
                            "Document all functions"
                        ]
                    },
                    {
                        "day": 5,
                        "topic": "Arrays & Lists Fundamentals",
                        "subtopics": [
                            "Array/List creation and initialization",
                            "Indexing and slicing",
                            "Basic operations (append, insert, delete)",
                            "List comprehensions",
                            "Multi-dimensional arrays"
                        ],
                        "time_estimate": "3-4 hours",
                        "resources": {
                            "text": [
                                {"title": "Python Lists", "url": "https://www.w3schools.com/python/python_lists.asp", "difficulty": "Beginner"},
                                {"title": "List Comprehensions", "url": "https://www.programiz.com/python-programming/list-comprehension", "difficulty": "Intermediate"},
                                {"title": "Arrays in DSA", "url": "https://www.geeksforgeeks.org/introduction-to-arrays/", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Python Lists Tutorial", "url": "https://www.youtube.com/watch?v=ohCDWZgNIU0", "duration": "45 min"},
                                {"title": "List Operations", "url": "https://www.youtube.com/watch?v=1yUn-ydsgKk", "duration": "30 min"}
                            ],
                            "interactive": [
                                {"title": "Array Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Array.html", "type": "visualization"}
                            ]
                        },
                        "practice": [
                            "Implement dynamic array",
                            "Practice slicing operations",
                            "Create 2D array operations",
                            "Solve 15 array problems"
                        ]
                    },
                    {
                        "day": 6,
                        "topic": "Project Planning: Scientific Calculator",
                        "subtopics": [
                            "Requirements analysis",
                            "Algorithm design",
                            "Function breakdown",
                            "Error handling strategy",
                            "Testing plan"
                        ],
                        "time_estimate": "2-3 hours",
                        "resources": {
                            "text": [
                                {"title": "Software Design Principles", "url": "https://www.programiz.com/python-programming/modules", "difficulty": "Intermediate"},
                                {"title": "Error Handling", "url": "https://www.w3schools.com/python/python_try_except.asp", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Project Planning", "url": "https://www.youtube.com/watch?v=pEfrdAtAmqk", "duration": "20 min"}
                            ]
                        },
                        "project_requirements": [
                            "Basic arithmetic operations (+, -, *, /)",
                            "Advanced operations (power, sqrt, log)",
                            "Trigonometric functions",
                            "Memory functions (store, recall)",
                            "History of calculations",
                            "Error handling for edge cases"
                        ]
                    },
                    {
                        "day": 7,
                        "topic": "Project Implementation: Scientific Calculator",
                        "subtopics": [
                            "Core calculator functions",
                            "User interface design",
                            "Memory management",
                            "Testing and debugging",
                            "Code documentation"
                        ],
                        "time_estimate": "4-5 hours",
                        "implementation_steps": [
                            "Create basic arithmetic functions",
                            "Add scientific functions",
                            "Implement memory features",
                            "Build user interface",
                            "Add error handling",
                            "Test all features",
                            "Document the code"
                        ],
                        "bonus_features": [
                            "GUI with tkinter",
                            "Calculation history export",
                            "Unit conversions",
                            "Graph plotting"
                        ]
                    }
                ],
                "week_project": {
                    "name": "Scientific Calculator",
                    "description": "Build a comprehensive calculator with basic and advanced mathematical operations",
                    "skills_learned": ["Functions", "Error handling", "User input", "Mathematical operations", "Code organization"],
                    "github_repo": "scientific-calculator",
                    "demo_features": [
                        "Basic arithmetic (+, -, *, /)",
                        "Scientific operations (sin, cos, tan, log, sqrt)",
                        "Memory functions (store, recall, clear)",
                        "Calculation history",
                        "Error handling"
                    ]
                },
                "week_assessment": {
                    "quiz_topics": ["Variables", "Functions", "Arrays", "I/O Operations"],
                    "coding_problems": 10,
                    "project_evaluation": ["Functionality", "Code quality", "Error handling", "Documentation"]
                }
            },
            {
                "week": 2,
                "title": "Arrays & String Mastery",
                "description": "Master array operations, string manipulation, and fundamental algorithms",
                "difficulty": "Beginner-Intermediate",
                "estimated_hours": 18,
                "learning_objectives": [
                    "Master array traversal and manipulation",
                    "Learn two-pointer technique",
                    "Understand string processing algorithms",
                    "Implement sliding window technique",
                    "Solve real-world array/string problems"
                ],
                "days": [
                    {
                        "day": 1,
                        "topic": "Array Operations & Algorithms",
                        "subtopics": [
                            "Array traversal patterns",
                            "Search algorithms (linear, binary basics)",
                            "Array rotation and reversal",
                            "Finding maximum/minimum elements",
                            "Array manipulation operations"
                        ],
                        "time_estimate": "3-4 hours",
                        "resources": {
                            "text": [
                                {"title": "Array Operations - W3Schools", "url": "https://www.w3schools.com/dsa/dsa_arrays.php", "difficulty": "Beginner"},
                                {"title": "Array Algorithms - GeeksforGeeks", "url": "https://www.geeksforgeeks.org/array-data-structure/", "difficulty": "Intermediate"},
                                {"title": "Array Problems - Programiz", "url": "https://www.programiz.com/dsa/array", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Array Algorithms", "url": "https://www.youtube.com/watch?v=pmN9ExDf3yQ", "duration": "40 min"},
                                {"title": "Array Rotation Techniques", "url": "https://www.youtube.com/watch?v=BHr381Guz3Y", "duration": "25 min"}
                            ],
                            "interactive": [
                                {"title": "Array Visualization", "url": "https://www.cs.usfca.edu/~galles/visualization/Array.html", "type": "visualization"},
                                {"title": "Algorithm Visualizer", "url": "https://algorithm-visualizer.org/", "type": "interactive"}
                            ]
                        },
                        "leetcode_problems": [
                            {"id": 26, "title": "Remove Duplicates from Sorted Array", "difficulty": "Easy"},
                            {"id": 27, "title": "Remove Element", "difficulty": "Easy"},
                            {"id": 189, "title": "Rotate Array", "difficulty": "Medium"}
                        ],
                        "practice": [
                            "Implement array rotation (left and right)",
                            "Find second largest element",
                            "Remove duplicates in-place",
                            "Reverse array in segments"
                        ]
                    },
                    {
                        "day": 2,
                        "topic": "Two Pointers Technique",
                        "subtopics": [
                            "Two pointers concept and applications",
                            "Opposite direction pointers",
                            "Same direction pointers",
                            "Three pointers approach",
                            "Palindrome checking"
                        ],
                        "time_estimate": "3-4 hours",
                        "resources": {
                            "text": [
                                {"title": "Two Pointers Technique", "url": "https://www.geeksforgeeks.org/two-pointers-technique/", "difficulty": "Intermediate"},
                                {"title": "Two Pointers Problems", "url": "https://leetcode.com/tag/two-pointers/", "difficulty": "Mixed"}
                            ],
                            "videos": [
                                {"title": "Two Pointers Explained - NeetCode", "url": "https://www.youtube.com/watch?v=jzZsG8n2R9A", "duration": "35 min"},
                                {"title": "Two Pointers Patterns", "url": "https://www.youtube.com/watch?v=On03HWe2tZM", "duration": "45 min"}
                            ]
                        },
                        "leetcode_problems": [
                            {"id": 1, "title": "Two Sum", "difficulty": "Easy"},
                            {"id": 125, "title": "Valid Palindrome", "difficulty": "Easy"},
                            {"id": 167, "title": "Two Sum II - Input Array Is Sorted", "difficulty": "Medium"},
                            {"id": 15, "title": "3Sum", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 3,
                        "topic": "String Processing & Manipulation",
                        "subtopics": [
                            "String traversal and comparison",
                            "String building and concatenation",
                            "Character frequency counting",
                            "String reversal techniques",
                            "Pattern matching basics"
                        ],
                        "time_estimate": "3-4 hours",
                        "leetcode_problems": [
                            {"id": 242, "title": "Valid Anagram", "difficulty": "Easy"},
                            {"id": 409, "title": "Longest Palindrome", "difficulty": "Easy"},
                            {"id": 13, "title": "Roman to Integer", "difficulty": "Easy"}
                        ]
                    },
                    {
                        "day": 4,
                        "topic": "Sliding Window Technique",
                        "subtopics": [
                            "Fixed-size sliding window",
                            "Variable-size sliding window",
                            "Maximum/minimum in window",
                            "Substring problems",
                            "Window optimization"
                        ],
                        "time_estimate": "3-4 hours",
                        "leetcode_problems": [
                            {"id": 121, "title": "Best Time to Buy and Sell Stock", "difficulty": "Easy"},
                            {"id": 3, "title": "Longest Substring Without Repeating Characters", "difficulty": "Medium"},
                            {"id": 424, "title": "Longest Repeating Character Replacement", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 5,
                        "topic": "Key Array & String Problems",
                        "subtopics": [
                            "Problem-solving strategies",
                            "Time and space complexity analysis",
                            "Edge case handling",
                            "Optimization techniques",
                            "Interview-style problems"
                        ],
                        "time_estimate": "3-4 hours",
                        "leetcode_problems": [
                            {"id": 53, "title": "Maximum Subarray", "difficulty": "Medium"},
                            {"id": 49, "title": "Group Anagrams", "difficulty": "Medium"},
                            {"id": 347, "title": "Top K Frequent Elements", "difficulty": "Medium"}
                        ]
                    },
                    {"day": 6, "topic": "Project Planning: Text Analyzer"},
                    {"day": 7, "topic": "Project Implementation: Text Analyzer"}
                ],
                "week_project": {
                    "name": "Advanced Text Analyzer",
                    "description": "Build a comprehensive text analysis tool with multiple features",
                    "skills_learned": ["String processing", "Hash tables", "File I/O", "Statistical analysis", "Pattern matching"]
                }
            },
            {
                "week": 3,
                "title": "Linked Lists Deep Dive",
                "description": "Master linked list data structures and their applications",
                "difficulty": "Intermediate",
                "estimated_hours": 20,
                "days": [
                    {
                        "day": 1,
                        "topic": "Linked List Fundamentals",
                        "subtopics": [
                            "Node structure and memory allocation",
                            "Linked list vs array comparison",
                            "Types of linked lists overview",
                            "Basic traversal algorithms",
                            "Memory management concepts"
                        ],
                        "time_estimate": "3-4 hours",
                        "resources": {
                            "text": [
                                {"title": "Linked List Basics", "url": "https://www.w3schools.com/dsa/dsa_data_linkedlists.php", "difficulty": "Beginner"},
                                {"title": "Linked List Tutorial", "url": "https://www.javatpoint.com/singly-linked-list", "difficulty": "Beginner"}
                            ],
                            "videos": [
                                {"title": "Linked Lists Explained", "url": "https://www.youtube.com/watch?v=WwfhLC16bis", "duration": "30 min"}
                            ]
                        }
                    },
                    {
                        "day": 2,
                        "topic": "Singly Linked List Operations",
                        "leetcode_problems": [
                            {"id": 21, "title": "Merge Two Sorted Lists", "difficulty": "Easy"},
                            {"id": 83, "title": "Remove Duplicates from Sorted List", "difficulty": "Easy"},
                            {"id": 203, "title": "Remove Linked List Elements", "difficulty": "Easy"}
                        ]
                    },
                    {
                        "day": 3,
                        "topic": "Advanced Linked List Algorithms",
                        "leetcode_problems": [
                            {"id": 206, "title": "Reverse Linked List", "difficulty": "Easy"},
                            {"id": 141, "title": "Linked List Cycle", "difficulty": "Easy"},
                            {"id": 234, "title": "Palindrome Linked List", "difficulty": "Easy"},
                            {"id": 142, "title": "Linked List Cycle II", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 4,
                        "topic": "Doubly & Circular Linked Lists"
                    },
                    {
                        "day": 5,
                        "topic": "Complex Linked List Problems",
                        "leetcode_problems": [
                            {"id": 160, "title": "Intersection of Two Linked Lists", "difficulty": "Easy"},
                            {"id": 2, "title": "Add Two Numbers", "difficulty": "Medium"},
                            {"id": 138, "title": "Copy List with Random Pointer", "difficulty": "Medium"}
                        ]
                    },
                    {"day": 6, "topic": "Project Planning: Music Playlist Manager"},
                    {"day": 7, "topic": "Project Implementation: Music Playlist Manager"}
                ],
                "week_project": {
                    "name": "Music Playlist Manager",
                    "description": "Build a music player with playlist management using linked lists"
                }
            },
            {
                "week": 4,
                "title": "Stacks & Queues Applications",
                "description": "Master LIFO and FIFO data structures with real-world applications",
                "difficulty": "Intermediate",
                "estimated_hours": 18,
                "days": [
                    {
                        "day": 1,
                        "topic": "Stack Fundamentals & Implementation",
                        "leetcode_problems": [
                            {"id": 20, "title": "Valid Parentheses", "difficulty": "Easy"},
                            {"id": 155, "title": "Min Stack", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 2,
                        "topic": "Stack Applications & Algorithms",
                        "leetcode_problems": [
                            {"id": 150, "title": "Evaluate Reverse Polish Notation", "difficulty": "Medium"},
                            {"id": 394, "title": "Decode String", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 3,
                        "topic": "Queue Fundamentals & Implementation",
                        "leetcode_problems": [
                            {"id": 232, "title": "Implement Queue using Stacks", "difficulty": "Easy"},
                            {"id": 622, "title": "Design Circular Queue", "difficulty": "Medium"}
                        ]
                    },
                    {
                        "day": 4,
                        "topic": "Advanced Queue Variations",
                        "leetcode_problems": [
                            {"id": 641, "title": "Design Circular Deque", "difficulty": "Medium"},
                            {"id": 239, "title": "Sliding Window Maximum", "difficulty": "Hard"}
                        ]
                    },
                    {
                        "day": 5,
                        "topic": "Stack & Queue Problem Patterns",
                        "leetcode_problems": [
                            {"id": 496, "title": "Next Greater Element I", "difficulty": "Easy"},
                            {"id": 739, "title": "Daily Temperatures", "difficulty": "Medium"},
                            {"id": 84, "title": "Largest Rectangle in Histogram", "difficulty": "Hard"}
                        ]
                    },
                    {"day": 6, "topic": "Project Planning: Code Editor"},
                    {"day": 7, "topic": "Project Implementation: Code Editor"}
                ],
                "week_project": {
                    "name": "Code Editor with Undo/Redo",
                    "description": "Build a code editor with undo/redo functionality using stacks"
                }
            },
            {
                "week": 5,
                "title": "Binary Trees Foundation",
                "description": "Master tree data structures and traversal algorithms",
                "difficulty": "Intermediate",
                "estimated_hours": 20,
                "days": [
                    {"day": 1, "topic": "Tree Basics & Terminology"},
                    {"day": 2, "topic": "Tree Traversals - DFS Methods"},
                    {"day": 3, "topic": "Level Order Traversal - BFS"},
                    {"day": 4, "topic": "Tree Properties & Calculations"},
                    {"day": 5, "topic": "Tree Construction & Modification"},
                    {"day": 6, "topic": "Project Planning: Family Tree System"},
                    {"day": 7, "topic": "Project Implementation: Family Tree"}
                ],
                "week_project": {
                    "name": "Family Tree System",
                    "description": "Build a genealogy system with relationship queries"
                }
            },
            {
                "week": 6,
                "title": "Binary Search Trees",
                "description": "Master BST operations and balanced tree concepts",
                "difficulty": "Intermediate-Advanced",
                "estimated_hours": 22,
                "days": [
                    {"day": 1, "topic": "BST Properties & Structure"},
                    {"day": 2, "topic": "BST Core Operations"},
                    {"day": 3, "topic": "BST Validation & Analysis"},
                    {"day": 4, "topic": "Self-Balancing Trees Introduction"},
                    {"day": 5, "topic": "Advanced BST Problems"},
                    {"day": 6, "topic": "Project Planning: Student Database"},
                    {"day": 7, "topic": "Project Implementation: Student Database"}
                ],
                "week_project": {
                    "name": "Student Database System",
                    "description": "Build a student management system with BST indexing"
                }
            },
            {
                "week": 7,
                "title": "Heaps & Priority Queues",
                "description": "Master heap data structure and priority-based algorithms",
                "difficulty": "Intermediate-Advanced",
                "estimated_hours": 20,
                "days": [
                    {"day": 1, "topic": "Heap Fundamentals"},
                    {"day": 2, "topic": "Heap Operations"},
                    {"day": 3, "topic": "Priority Queue Implementation"},
                    {"day": 4, "topic": "Heap Applications"},
                    {"day": 5, "topic": "Advanced Heap Problems"},
                    {"day": 6, "topic": "Project Planning: Task Scheduler"},
                    {"day": 7, "topic": "Project Implementation: Task Scheduler"}
                ],
                "week_project": {
                    "name": "Task Scheduler",
                    "description": "Build a priority-based task scheduling system"
                }
            },
            {
                "week": 8,
                "title": "Hashing & Hash Tables",
                "description": "Master hash-based data structures for fast lookups",
                "difficulty": "Intermediate",
                "estimated_hours": 18,
                "days": [
                    {"day": 1, "topic": "Hashing Fundamentals"},
                    {"day": 2, "topic": "Hash Table Implementation"},
                    {"day": 3, "topic": "Hash-Based Problem Solving"},
                    {"day": 4, "topic": "Advanced Hashing Techniques"},
                    {"day": 5, "topic": "Hash Table Interview Problems"},
                    {"day": 6, "topic": "Project Planning: Spell Checker"},
                    {"day": 7, "topic": "Project Implementation: Spell Checker"}
                ],
                "week_project": {
                    "name": "Spell Checker",
                    "description": "Build a spell checker with suggestions using hash tables"
                }
            },
            {
                "week": 9,
                "title": "Graph Fundamentals",
                "description": "Master graph representations and basic algorithms",
                "difficulty": "Intermediate-Advanced",
                "estimated_hours": 22,
                "days": [
                    {"day": 1, "topic": "Graph Theory Basics"},
                    {"day": 2, "topic": "Depth-First Search (DFS)"},
                    {"day": 3, "topic": "Breadth-First Search (BFS)"},
                    {"day": 4, "topic": "Graph Applications"},
                    {"day": 5, "topic": "Graph Problem Patterns"},
                    {"day": 6, "topic": "Project Planning: Social Network"},
                    {"day": 7, "topic": "Project Implementation: Social Network"}
                ],
                "week_project": {
                    "name": "Social Network Analyzer",
                    "description": "Build a social network with friend recommendations"
                }
            },
            {
                "week": 10,
                "title": "Advanced Graph Algorithms",
                "description": "Master shortest path algorithms and advanced techniques",
                "difficulty": "Advanced",
                "estimated_hours": 24,
                "days": [
                    {"day": 1, "topic": "Dijkstra's Shortest Path Algorithm"},
                    {"day": 2, "topic": "Bellman-Ford Algorithm"},
                    {"day": 3, "topic": "Floyd-Warshall Algorithm"},
                    {"day": 4, "topic": "Minimum Spanning Tree"},
                    {"day": 5, "topic": "Advanced Graph Concepts"},
                    {"day": 6, "topic": "Project Planning: GPS Navigation"},
                    {"day": 7, "topic": "Project Implementation: GPS Navigation"}
                ],
                "week_project": {
                    "name": "GPS Navigation System",
                    "description": "Build a navigation system with shortest path finding"
                }
            },
            {
                "week": 11,
                "title": "Sorting & Searching Mastery",
                "description": "Master all sorting algorithms and advanced searching",
                "difficulty": "Intermediate-Advanced",
                "estimated_hours": 20,
                "days": [
                    {"day": 1, "topic": "Basic Sorting Algorithms"},
                    {"day": 2, "topic": "Divide & Conquer Sorting"},
                    {"day": 3, "topic": "Quick Sort & Optimizations"},
                    {"day": 4, "topic": "Binary Search Mastery"},
                    {"day": 5, "topic": "Advanced Searching Algorithms"},
                    {"day": 6, "topic": "Project Planning: Movie Database"},
                    {"day": 7, "topic": "Project Implementation: Movie Database"}
                ],
                "week_project": {
                    "name": "Movie Database",
                    "description": "Build a movie database with optimized search and sorting"
                }
            },
            {
                "week": 12,
                "title": "Recursion & Backtracking",
                "description": "Master recursive problem-solving and backtracking",
                "difficulty": "Advanced",
                "estimated_hours": 22,
                "days": [
                    {"day": 1, "topic": "Recursion Fundamentals"},
                    {"day": 2, "topic": "Classic Recursive Problems"},
                    {"day": 3, "topic": "Backtracking Introduction"},
                    {"day": 4, "topic": "Classic Backtracking Problems"},
                    {"day": 5, "topic": "Advanced Backtracking"},
                    {"day": 6, "topic": "Project Planning: Sudoku Solver"},
                    {"day": 7, "topic": "Project Implementation: Sudoku Solver"}
                ],
                "week_project": {
                    "name": "Sudoku Solver",
                    "description": "Build an interactive Sudoku solver with visualization"
                }
            },
            {
                "week": 13,
                "title": "Dynamic Programming",
                "description": "Master DP patterns and optimization problems",
                "difficulty": "Advanced",
                "estimated_hours": 24,
                "days": [
                    {"day": 1, "topic": "DP Fundamentals"},
                    {"day": 2, "topic": "Linear DP Problems"},
                    {"day": 3, "topic": "String DP Patterns"},
                    {"day": 4, "topic": "Knapsack Problem Variations"},
                    {"day": 5, "topic": "Advanced DP Patterns"},
                    {"day": 6, "topic": "Project Planning: Investment Calculator"},
                    {"day": 7, "topic": "Project Implementation: Investment Calculator"}
                ],
                "week_project": {
                    "name": "Investment Calculator",
                    "description": "Build an investment optimizer using dynamic programming"
                }
            },
            {
                "week": 14,
                "title": "Advanced Topics & System Design",
                "description": "Integrate all concepts and explore advanced structures",
                "difficulty": "Expert",
                "estimated_hours": 26,
                "days": [
                    {"day": 1, "topic": "Greedy Algorithms"},
                    {"day": 2, "topic": "Bit Manipulation"},
                    {"day": 3, "topic": "Trie Data Structure"},
                    {"day": 4, "topic": "Union-Find (Disjoint Set)"},
                    {"day": 5, "topic": "System Design with DSA"},
                    {"day": 6, "topic": "Final Project Planning: Mini Database"},
                    {"day": 7, "topic": "Final Project Implementation"}
                ],
                "week_project": {
                    "name": "Mini Database System",
                    "description": "Build a complete database system with all DSA concepts"
                }
            }
        ],
        "additional_resources": {
            "books": [
                {"title": "Introduction to Algorithms (CLRS)", "authors": "Cormen, Leiserson, Rivest, Stein", "difficulty": "Advanced"},
                {"title": "Algorithm Design Manual", "author": "Steven Skiena", "difficulty": "Intermediate"},
                {"title": "Cracking the Coding Interview", "author": "Gayle McDowell", "difficulty": "Interview Prep"},
                {"title": "Elements of Programming Interviews", "authors": "Aziz, Lee, Prakash", "difficulty": "Interview Prep"}
            ],
            "online_courses": [
                {"title": "Algorithms Specialization", "platform": "Coursera", "instructor": "Stanford University"},
                {"title": "Data Structures and Algorithms", "platform": "edX", "instructor": "MIT"},
                {"title": "Competitive Programming", "platform": "Udemy", "instructor": "Various"}
            ],
            "practice_platforms": [
                {"name": "LeetCode", "url": "https://leetcode.com", "problems": "2500+", "difficulty": "Easy to Hard"},
                {"name": "HackerRank", "url": "https://hackerrank.com", "problems": "1000+", "difficulty": "Easy to Expert"},
                {"name": "Codeforces", "url": "https://codeforces.com", "problems": "10000+", "difficulty": "Div 3 to Div 1"},
                {"name": "AtCoder", "url": "https://atcoder.jp", "problems": "3000+", "difficulty": "Beginner to Expert"}
            ],
            "youtube_channels": [
                {"name": "NeetCode", "url": "https://www.youtube.com/@NeetCode", "focus": "LeetCode Solutions"},
                {"name": "Abdul Bari", "url": "https://www.youtube.com/@abdul_bari", "focus": "Algorithm Analysis"},
                {"name": "Tushar Roy", "url": "https://www.youtube.com/user/tusharroy2525", "focus": "DP and Graphs"},
                {"name": "Back To Back SWE", "url": "https://www.youtube.com/c/BackToBackSWE", "focus": "Interview Prep"}
            ]
        },
        "assessment_strategy": {
            "daily_practice": "2-3 coding problems per day",
            "weekly_projects": "Complete project implementation",
            "weekly_assessments": "Quiz + coding challenges",
            "milestone_reviews": "Every 2 weeks comprehensive review",
            "final_assessment": "Capstone project + technical interview simulation"
        }
    }
    
    return jsonify(complete_roadmap), 200

# Basic roadmap route for backward compatibility
@app.route('/api/roadmap', methods=['GET'])
def get_basic_roadmap():
    """Get basic roadmap overview"""
    return jsonify({
        "weeks": [
            {"week": i, "title": f"Week {i}", "description": f"Week {i} content"} 
            for i in range(1, 15)
        ]
    }), 200

# User Profile Routes
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get user achievements
        achievements = UserAchievement.query.filter_by(user_id=user_id).join(
            Achievement
        ).all()
        
        user_achievements = []
        for ua in achievements:
            user_achievements.append({
                'title': ua.achievement.title,
                'description': ua.achievement.description,
                'badge_icon': ua.achievement.badge_icon,
                'points': ua.achievement.points,
                'earned_at': ua.earned_at.isoformat()
            })
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'bio': user.bio,
            'location': user.location,
            'github_username': user.github_username,
            'linkedin_url': user.linkedin_url,
            'avatar_url': user.avatar_url,
            'total_points': user.total_points,
            'current_streak': user.current_streak,
            'longest_streak': user.longest_streak,
            'level': user.level,
            'daily_goal_minutes': user.daily_goal_minutes,
            'preferred_study_time': user.preferred_study_time,
            'difficulty_preference': user.difficulty_preference,
            'achievements': user_achievements,
            'created_at': user.created_at.isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update profile fields
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.bio = data.get('bio', user.bio)
        user.location = data.get('location', user.location)
        user.github_username = data.get('github_username', user.github_username)
        user.linkedin_url = data.get('linkedin_url', user.linkedin_url)
        user.avatar_url = data.get('avatar_url', user.avatar_url)
        user.daily_goal_minutes = data.get('daily_goal_minutes', user.daily_goal_minutes)
        user.preferred_study_time = data.get('preferred_study_time', user.preferred_study_time)
        user.difficulty_preference = data.get('difficulty_preference', user.difficulty_preference)
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Analytics Routes
@app.route('/api/analytics/weekly', methods=['GET'])
@jwt_required()
def get_weekly_analytics():
    try:
        user_id = get_jwt_identity()
        weeks = request.args.get('weeks', 4, type=int)
        
        weekly_data = []
        for i in range(weeks):
            week_start = datetime.utcnow() - timedelta(weeks=i)
            week_end = week_start + timedelta(days=7)
            
            completed_topics = Progress.query.filter(
                Progress.user_id == user_id,
                Progress.completed == True,
                Progress.completion_date >= week_start,
                Progress.completion_date < week_end
            ).count()
            
            pomodoro_time = db.session.query(db.func.sum(PomodoroSession.duration)).filter(
                PomodoroSession.user_id == user_id,
                PomodoroSession.completed == True,
                PomodoroSession.created_at >= week_start,
                PomodoroSession.created_at < week_end
            ).scalar() or 0
            
            notes_created = Note.query.filter(
                Note.user_id == user_id,
                Note.created_at >= week_start,
                Note.created_at < week_end
            ).count()
            
            weekly_data.append({
                'week_start': week_start.date().isoformat(),
                'completed_topics': completed_topics,
                'study_time': pomodoro_time,
                'notes_created': notes_created
            })
        
        return jsonify(weekly_data), 200
        
    except Exception as e:
        logger.error(f"Get weekly analytics error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Health check route for Render
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'message': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'message': 'Bad request'}), 400

# Initialize database tables on startup
with app.app_context():
    create_tables()

if __name__ == '__main__':
    # For local development
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)