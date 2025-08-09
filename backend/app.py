from flask import Flask, request, jsonify, send_file
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
import secrets
import io
import csv
from sqlalchemy import func, desc, asc, or_
import calendar
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

# Initialize Flask app
app = Flask(__name__)

# Enhanced Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

# Email Service Configuration
# Priority: SendGrid > Mailgun > Gmail SMTP > Console Log

# SendGrid Configuration (FREE - 100 emails/day)
app.config['SENDGRID_API_KEY'] = os.environ.get('SENDGRID_API_KEY')
app.config['SENDGRID_FROM_EMAIL'] = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@dsadashboard.com')

# Mailgun Configuration (FREE - 5000 emails/month for 3 months)
app.config['MAILGUN_API_KEY'] = os.environ.get('MAILGUN_API_KEY')
app.config['MAILGUN_DOMAIN'] = os.environ.get('MAILGUN_DOMAIN')
app.config['MAILGUN_FROM_EMAIL'] = os.environ.get('MAILGUN_FROM_EMAIL', 'noreply@yourdomain.com')

# Gmail SMTP Configuration (FREE - Gmail account required)
app.config['GMAIL_USERNAME'] = os.environ.get('GMAIL_USERNAME')
app.config['GMAIL_PASSWORD'] = os.environ.get('GMAIL_PASSWORD')  # App Password
app.config['GMAIL_FROM_EMAIL'] = os.environ.get('GMAIL_FROM_EMAIL')

# Frontend URL for email links
app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Database configuration
if os.environ.get('DATABASE_URL'):
    database_url = os.environ.get('DATABASE_URL')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
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
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
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
    
    # Email verification
    email_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100))
    verification_token_expires = db.Column(db.DateTime)
    
    # Password reset
    reset_token = db.Column(db.String(100))
    reset_token_expires = db.Column(db.DateTime)
    
    # Enhanced Profile data
    avatar_url = db.Column(db.String(500))
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    github_username = db.Column(db.String(100))
    linkedin_url = db.Column(db.String(500))
    website_url = db.Column(db.String(500))
    
    # Gamification
    total_points = db.Column(db.Integer, default=0)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    level = db.Column(db.Integer, default=1)
    experience_points = db.Column(db.Integer, default=0)
    
    # Study preferences
    daily_goal_minutes = db.Column(db.Integer, default=60)
    preferred_study_time = db.Column(db.String(20), default='morning')
    difficulty_preference = db.Column(db.String(20), default='medium')
    notification_preferences = db.Column(db.Text)  # JSON
    theme_preference = db.Column(db.String(20), default='light')
    
    # Privacy settings
    profile_public = db.Column(db.Boolean, default=True)
    show_progress = db.Column(db.Boolean, default=True)
    show_achievements = db.Column(db.Boolean, default=True)
    
    # Email preferences
    email_notifications = db.Column(db.Boolean, default=True)
    email_achievements = db.Column(db.Boolean, default=True)
    email_reminders = db.Column(db.Boolean, default=True)
    
    # Relationships
    progress = db.relationship('Progress', backref='user', lazy=True, cascade='all, delete-orphan')
    notes = db.relationship('Note', backref='user', lazy=True, cascade='all, delete-orphan')
    pomodoro_sessions = db.relationship('PomodoroSession', backref='user', lazy=True, cascade='all, delete-orphan')
    achievements = db.relationship('UserAchievement', backref='user', lazy=True, cascade='all, delete-orphan')
    daily_goals = db.relationship('DailyGoal', backref='user', lazy=True, cascade='all, delete-orphan')
    study_sessions = db.relationship('StudySession', backref='user', lazy=True, cascade='all, delete-orphan')
    calendar_events = db.relationship('CalendarEvent', backref='user', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')

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
    review_needed = db.Column(db.Boolean, default=False)
    last_reviewed = db.Column(db.DateTime)
    
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
    day_number = db.Column(db.Integer)
    tags = db.Column(db.Text)  # JSON string of tags
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_favorite = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=False)
    note_type = db.Column(db.String(50), default='general')  # general, code_snippet, algorithm, concept
    code_language = db.Column(db.String(50))  # for code snippets
    view_count = db.Column(db.Integer, default=0)
    color = db.Column(db.String(7), default='#ffffff')  # hex color
    folder = db.Column(db.String(100))  # organization

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
    session_type = db.Column(db.String(20), default='work')  # work, short_break, long_break
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
    rarity = db.Column(db.String(20), default='common')  # common, rare, epic, legendary

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

class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False)
    event_type = db.Column(db.String(50), default='study')  # study, deadline, review, exam
    week_number = db.Column(db.Integer)
    day_number = db.Column(db.Integer)
    topic = db.Column(db.String(200))
    color = db.Column(db.String(7), default='#3788d8')
    reminder_minutes = db.Column(db.Integer, default=15)
    recurring = db.Column(db.Boolean, default=False)
    recurring_pattern = db.Column(db.String(20))  # daily, weekly, monthly
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info')  # info, achievement, reminder, warning
    read = db.Column(db.Boolean, default=False, index=True)
    action_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

class EmailLog(db.Model):
    __tablename__ = 'email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    to_email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    email_type = db.Column(db.String(50), nullable=False)  # welcome, reset, achievement, reminder
    service_used = db.Column(db.String(50))  # sendgrid, mailgun, gmail, console
    status = db.Column(db.String(20), default='sent')  # sent, failed, pending
    error_message = db.Column(db.Text)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)

# ==================== EMAIL SERVICE FUNCTIONS ====================

class EmailService:
    """Unified email service with multiple provider support"""
    
    @staticmethod
    def send_email(to_email, subject, html_content, text_content=None, email_type='general', user_id=None):
        """Send email using available service with fallback"""
        
        # Try SendGrid first
        if app.config.get('SENDGRID_API_KEY'):
            success = EmailService._send_via_sendgrid(to_email, subject, html_content, text_content)
            if success:
                EmailService._log_email(user_id, to_email, subject, email_type, 'sendgrid', 'sent')
                return True
        
        # Try Mailgun second
        if app.config.get('MAILGUN_API_KEY') and app.config.get('MAILGUN_DOMAIN'):
            success = EmailService._send_via_mailgun(to_email, subject, html_content, text_content)
            if success:
                EmailService._log_email(user_id, to_email, subject, email_type, 'mailgun', 'sent')
                return True
        
        # Try Gmail SMTP third
        if app.config.get('GMAIL_USERNAME') and app.config.get('GMAIL_PASSWORD'):
            success = EmailService._send_via_gmail(to_email, subject, html_content, text_content)
            if success:
                EmailService._log_email(user_id, to_email, subject, email_type, 'gmail', 'sent')
                return True
        
        # Fallback to console logging
        EmailService._send_via_console(to_email, subject, html_content, text_content)
        EmailService._log_email(user_id, to_email, subject, email_type, 'console', 'sent')
        return True

    @staticmethod
    def _send_via_sendgrid(to_email, subject, html_content, text_content=None):
        """Send email via SendGrid API"""
        try:
            api_key = app.config.get('SENDGRID_API_KEY')
            from_email = app.config.get('SENDGRID_FROM_EMAIL')
            
            url = "https://api.sendgrid.com/v3/mail/send"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            content = [{"type": "text/html", "value": html_content}]
            if text_content:
                content.append({"type": "text/plain", "value": text_content})
            
            data = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": from_email},
                "subject": subject,
                "content": content
            }
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 202:
                logger.info(f"SendGrid: Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"SendGrid failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return False

    @staticmethod
    def _send_via_mailgun(to_email, subject, html_content, text_content=None):
        """Send email via Mailgun API"""
        try:
            api_key = app.config.get('MAILGUN_API_KEY')
            domain = app.config.get('MAILGUN_DOMAIN')
            from_email = app.config.get('MAILGUN_FROM_EMAIL')
            
            url = f"https://api.mailgun.net/v3/{domain}/messages"
            
            data = {
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_content
            }
            
            if text_content:
                data["text"] = text_content
            
            response = requests.post(
                url,
                auth=("api", api_key),
                data=data
            )
            
            if response.status_code == 200:
                logger.info(f"Mailgun: Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Mailgun failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Mailgun error: {str(e)}")
            return False

    @staticmethod
    def _send_via_gmail(to_email, subject, html_content, text_content=None):
        """Send email via Gmail SMTP"""
        try:
            gmail_user = app.config.get('GMAIL_USERNAME')
            gmail_password = app.config.get('GMAIL_PASSWORD')
            from_email = app.config.get('GMAIL_FROM_EMAIL', gmail_user)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = from_email
            msg['To'] = to_email
            
            # Create the plain-text and HTML version of your message
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)
            
            # Send the message via Gmail SMTP server
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(gmail_user, gmail_password)
            text = msg.as_string()
            server.sendmail(from_email, to_email, text)
            server.quit()
            
            logger.info(f"Gmail: Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail SMTP error: {str(e)}")
            return False

    @staticmethod
    def _send_via_console(to_email, subject, html_content, text_content=None):
        """Log email to console (development fallback)"""
        logger.info("=" * 50)
        logger.info("EMAIL CONSOLE LOG")
        logger.info("=" * 50)
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info("-" * 30)
        logger.info("HTML Content:")
        logger.info(html_content)
        if text_content:
            logger.info("-" * 30)
            logger.info("Text Content:")
            logger.info(text_content)
        logger.info("=" * 50)

    @staticmethod
    def _log_email(user_id, to_email, subject, email_type, service_used, status, error_message=None):
        """Log email to database"""
        try:
            email_log = EmailLog(
                user_id=user_id,
                to_email=to_email,
                subject=subject,
                email_type=email_type,
                service_used=service_used,
                status=status,
                error_message=error_message
            )
            db.session.add(email_log)
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to log email: {str(e)}")

# ==================== EMAIL TEMPLATES ====================

class EmailTemplates:
    """HTML email templates"""
    
    @staticmethod
    def get_base_template():
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DSA Dashboard</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f5f5f5;
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 40px 30px; 
                    text-align: center; 
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .header p {
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.9;
                }
                .content { 
                    padding: 40px 30px; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    margin: 20px 0;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                .button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .feature { 
                    background: #f8f9ff; 
                    padding: 20px; 
                    margin: 15px 0; 
                    border-radius: 8px; 
                    border-left: 4px solid #667eea; 
                }
                .feature h3 {
                    margin: 0 0 8px 0;
                    color: #333;
                    font-size: 18px;
                }
                .feature p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }
                .achievement { 
                    background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); 
                    color: white;
                    padding: 25px; 
                    border-radius: 12px; 
                    text-align: center; 
                    margin: 25px 0; 
                    box-shadow: 0 4px 15px rgba(255, 216, 155, 0.3);
                }
                .achievement h2 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                .achievement p {
                    margin: 0;
                    font-size: 16px;
                    opacity: 0.9;
                }
                .warning { 
                    background: #fff8e1; 
                    border: 1px solid #ffb74d; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin: 20px 0; 
                }
                .footer {
                    background: #f8f9fa;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e9ecef;
                    color: #666;
                    font-size: 14px;
                }
                .footer a {
                    color: #667eea;
                    text-decoration: none;
                }
                .social-links {
                    margin: 20px 0;
                }
                .social-links a {
                    display: inline-block;
                    margin: 0 10px;
                    padding: 8px 16px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 12px;
                }
                @media (max-width: 600px) {
                    .container { margin: 10px; }
                    .header, .content { padding: 20px; }
                    .button { display: block; text-align: center; }
                }
            </style>
        </head>
        <body>
            {content}
            <div class="footer">
                <p><strong>DSA Dashboard</strong> - Your Data Structures & Algorithms Learning Companion</p>
                <div class="social-links">
                    <a href="{frontend_url}">Dashboard</a>
                    <a href="{frontend_url}/roadmap">Roadmap</a>
                    <a href="{frontend_url}/profile">Profile</a>
                </div>
                <p>
                    <a href="{frontend_url}/settings">Unsubscribe</a> | 
                    <a href="{frontend_url}/support">Support</a> | 
                    <a href="{frontend_url}/privacy">Privacy Policy</a>
                </p>
                <p>© 2024 DSA Dashboard. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def welcome_email(username):
        content = f"""
        <div class="container">
            <div class="header">
                <h1>Welcome to DSA Dashboard! 🎉</h1>
                <p>Your personalized Data Structures & Algorithms learning journey starts here</p>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>Welcome to DSA Dashboard! We're excited to have you on board for your Data Structures & Algorithms learning journey.</p>
                
                <div class="feature">
                    <h3>🗺️ 14-Week Structured Roadmap</h3>
                    <p>Follow our comprehensive roadmap from beginner to advanced concepts with daily topics and practice problems.</p>
                </div>
                
                <div class="feature">
                    <h3>📊 Progress Tracking</h3>
                    <p>Track your daily progress, maintain study streaks, and earn achievements as you learn.</p>
                </div>
                
                <div class="feature">
                    <h3>📝 Smart Notes System</h3>
                    <p>Create, organize, and search through your study notes with syntax highlighting for code.</p>
                </div>
                
                <div class="feature">
                    <h3>🍅 Pomodoro Timer</h3>
                    <p>Focus on your studies with built-in productivity tools and session tracking.</p>
                </div>
                
                <div class="feature">
                    <h3>📅 Calendar & Scheduling</h3>
                    <p>Plan your study sessions, set deadlines, and never miss important topics.</p>
                </div>
                
                <a href="{app.config['FRONTEND_URL']}/roadmap" class="button">Start Your Journey →</a>
                
                <p>Ready to begin? Start with <strong>Week 1: Foundation & Environment Setup</strong> and work your way through our carefully designed curriculum.</p>
                
                <p><strong>Quick Tips to Get Started:</strong></p>
                <ul>
                    <li>Set your daily study goal in settings</li>
                    <li>Complete the environment setup on Day 1</li>
                    <li>Take notes as you learn new concepts</li>
                    <li>Use the Pomodoro timer for focused study sessions</li>
                    <li>Track your progress daily to build momentum</li>
                </ul>
                
                <p>If you have any questions or need help getting started, our support team is here to help!</p>
                
                <p>Happy learning! 🚀<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

    @staticmethod
    def password_reset_email(username, reset_token):
        reset_url = f"{app.config['FRONTEND_URL']}/auth/reset-password?token={reset_token}"
        
        content = f"""
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset Request</h1>
                <p>Secure access to your DSA learning journey</p>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>We received a request to reset your password for your DSA Dashboard account.</p>
                
                <a href="{reset_url}" class="button">Reset Password →</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; border: 1px solid #e9ecef;">
                    {reset_url}
                </p>
                
                <div class="warning">
                    <strong>⚠️ Important Security Information:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>This password reset link will expire in <strong>1 hour</strong></li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you create a new one</li>
                        <li>For security, we recommend using a strong, unique password</li>
                    </ul>
                </div>
                
                <p>If you continue to have problems accessing your account, please contact our support team.</p>
                
                <p>Stay secure and keep learning! 🛡️<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

    @staticmethod
    def achievement_email(username, achievement_title, achievement_description, achievement_icon, points):
        content = f"""
        <div class="container">
            <div class="header">
                <h1>🏆 Achievement Unlocked!</h1>
                <p>Congratulations on reaching a new milestone</p>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <div class="achievement">
                    <h2>{achievement_icon} {achievement_title}</h2>
                    <p>{achievement_description}</p>
                    <p style="margin-top: 15px; font-size: 18px;"><strong>+{points} Points Earned!</strong></p>
                </div>
                
                <p>You're making fantastic progress on your DSA learning journey! This achievement shows your dedication and consistency in mastering these important concepts.</p>
                
                <a href="{app.config['FRONTEND_URL']}/profile/achievements" class="button">View All Achievements →</a>
                
                <p><strong>Keep up the momentum:</strong></p>
                <ul>
                    <li>Continue your daily study streak</li>
                    <li>Challenge yourself with harder problems</li>
                    <li>Share your progress with the community</li>
                    <li>Help others learn by taking detailed notes</li>
                </ul>
                
                <p>Every achievement unlocked is a step closer to mastering Data Structures & Algorithms. Keep pushing forward!</p>
                
                <p>Congratulations again! 🎉<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

    @staticmethod
    def streak_milestone_email(username, streak_days):
        content = f"""
        <div class="container">
            <div class="header">
                <h1>🔥 {streak_days} Day Streak!</h1>
                <p>Your consistency is paying off</p>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <div class="achievement">
                    <h2>🔥 {streak_days} Days of Consistent Learning!</h2>
                    <p>You've maintained your study streak for {streak_days} consecutive days. That's incredible dedication!</p>
                </div>
                
                <p>Consistency is the key to mastering Data Structures & Algorithms, and you're proving that every single day. Your commitment to learning is truly inspiring!</p>
                
                <div class="feature">
                    <h3>💡 Streak Benefits</h3>
                    <p>Consistent daily practice helps you retain concepts better and build strong problem-solving skills.</p>
                </div>
                
                <div class="feature">
                    <h3>🎯 Keep Going</h3>
                    <p>The longer your streak, the more bonus points you earn and the stronger your foundation becomes.</p>
                </div>
                
                <a href="{app.config['FRONTEND_URL']}/dashboard" class="button">Continue Your Streak →</a>
                
                <p><strong>Tips to maintain your streak:</strong></p>
                <ul>
                    <li>Set a specific time each day for learning</li>
                    <li>Start with easier topics if you're short on time</li>
                    <li>Use the Pomodoro timer for focused 25-minute sessions</li>
                    <li>Review previous notes to reinforce learning</li>
                </ul>
                
                <p>Don't break the chain! Every day counts towards your mastery of DSA concepts.</p>
                
                <p>Keep up the amazing work! 🚀<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

    @staticmethod
    def weekly_summary_email(username, completed_topics, study_time, notes_created, current_streak):
        content = f"""
        <div class="container">
            <div class="header">
                <h1>📊 Your Weekly Summary</h1>
                <p>Here's how you performed this week</p>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>Here's a summary of your learning progress this week:</p>
                
                <div class="feature">
                    <h3>📚 Topics Completed</h3>
                    <p><strong>{completed_topics}</strong> topics mastered this week</p>
                </div>
                
                <div class="feature">
                    <h3>⏱️ Study Time</h3>
                    <p><strong>{study_time}</strong> minutes of focused learning</p>
                </div>
                
                <div class="feature">
                    <h3>📝 Notes Created</h3>
                    <p><strong>{notes_created}</strong> notes added to your knowledge base</p>
                </div>
                
                <div class="feature">
                    <h3>🔥 Current Streak</h3>
                    <p><strong>{current_streak}</strong> days of consistent learning</p>
                </div>
                
                <a href="{app.config['FRONTEND_URL']}/analytics" class="button">View Detailed Analytics →</a>
                
                <p><strong>For next week, consider:</strong></p>
                <ul>
                    <li>Setting higher daily goals if you're consistently meeting them</li>
                    <li>Focusing on topics you found challenging</li>
                    <li>Practicing more coding problems</li>
                    <li>Reviewing and organizing your notes</li>
                </ul>
                
                <p>Keep up the excellent progress! Every week of consistent learning brings you closer to DSA mastery.</p>
                
                <p>Happy learning! 📈<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

    @staticmethod
    def reminder_email(username, reminder_type, content_data):
        if reminder_type == 'daily_goal':
            subject_content = "⏰ Daily Goal Reminder"
            main_content = f"""
                <p>Hi <strong>{username}</strong>,</p>
                <p>Just a friendly reminder that you haven't completed your daily study goal yet today.</p>
                <div class="feature">
                    <h3>🎯 Today's Goals</h3>
                    <p>Study Time: {content_data.get('study_time_goal', 60)} minutes<br>
                    Topics: {content_data.get('topics_goal', 3)} topics<br>
                    Pomodoros: {content_data.get('pomodoro_goal', 4)} sessions</p>
                </div>
                <p>Even a 25-minute Pomodoro session can help maintain your streak and keep the momentum going!</p>
            """
        elif reminder_type == 'upcoming_deadline':
            subject_content = "📅 Upcoming Deadline"
            main_content = f"""
                <p>Hi <strong>{username}</strong>,</p>
                <p>You have an upcoming deadline that needs your attention:</p>
                <div class="warning">
                    <strong>{content_data.get('title', 'Important Deadline')}</strong><br>
                    Due: {content_data.get('due_date', 'Soon')}<br>
                    {content_data.get('description', '')}
                </div>
                <p>Make sure to allocate time in your schedule to meet this deadline!</p>
            """
        else:
            subject_content = "🔔 Reminder"
            main_content = f"""
                <p>Hi <strong>{username}</strong>,</p>
                <p>This is a reminder about your DSA learning journey.</p>
                <p>{content_data.get('message', 'Keep up the great work!')}</p>
            """
        
        content = f"""
        <div class="container">
            <div class="header">
                <h1>{subject_content}</h1>
                <p>Stay on track with your learning goals</p>
            </div>
            <div class="content">
                {main_content}
                
                <a href="{app.config['FRONTEND_URL']}/dashboard" class="button">Continue Learning →</a>
                
                <p>Remember, consistency is key to mastering Data Structures & Algorithms. Every small step counts!</p>
                
                <p>You've got this! 💪<br>
                <strong>The DSA Dashboard Team</strong></p>
            </div>
        </div>
        """
        
        return EmailTemplates.get_base_template().format(
            content=content,
            frontend_url=app.config['FRONTEND_URL']
        )

# ==================== EMAIL HELPER FUNCTIONS ====================

def send_welcome_email(user_email, username, user_id=None):
    """Send welcome email to new users"""
    subject = "Welcome to DSA Dashboard! 🎉"
    html_content = EmailTemplates.welcome_email(username)
    text_content = f"""
    Welcome to DSA Dashboard!
    
    Hi {username},
    
    Welcome to DSA Dashboard! We're excited to have you on board for your Data Structures & Algorithms learning journey.
    
    Features you can explore:
    • 14-Week Structured Roadmap
    • Progress Tracking with streaks and achievements  
    • Smart Notes System with syntax highlighting
    • Pomodoro Timer for focused study sessions
    • Calendar & Scheduling for better organization
    
    Start your journey: {app.config['FRONTEND_URL']}/roadmap
    
    Happy learning!
    The DSA Dashboard Team
    """
    
    return EmailService.send_email(user_email, subject, html_content, text_content, 'welcome', user_id)

def send_password_reset_email(user_email, reset_token, username, user_id=None):
    """Send password reset email"""
    subject = "Reset Your DSA Dashboard Password 🔒"
    html_content = EmailTemplates.password_reset_email(username, reset_token)
    text_content = f"""
    Password Reset Request
    
    Hi {username},
    
    We received a request to reset your password for your DSA Dashboard account.
    
    Reset your password: {app.config['FRONTEND_URL']}/auth/reset-password?token={reset_token}
    
    Important:
    • This link will expire in 1 hour
    • If you didn't request this reset, please ignore this email
    • Your password will remain unchanged until you create a new one
    
    Stay secure!
    The DSA Dashboard Team
    """
    
    return EmailService.send_email(user_email, subject, html_content, text_content, 'reset', user_id)

def send_achievement_email(user_email, username, achievement_title, achievement_description, achievement_icon="🏆", points=0, user_id=None):
    """Send achievement notification email"""
    subject = f"🏆 Achievement Unlocked: {achievement_title}"
    html_content = EmailTemplates.achievement_email(username, achievement_title, achievement_description, achievement_icon, points)
    text_content = f"""
    Achievement Unlocked!
    
    Hi {username},
    
    Congratulations! You've unlocked a new achievement:
    
    {achievement_icon} {achievement_title}
    {achievement_description}
    
    Points earned: +{points}
    
    Keep up the excellent work on your DSA learning journey!
    
    View all achievements: {app.config['FRONTEND_URL']}/profile/achievements
    
    The DSA Dashboard Team
    """
    
    return EmailService.send_email(user_email, subject, html_content, text_content, 'achievement', user_id)

def send_streak_milestone_email(user_email, username, streak_days, user_id=None):
    """Send streak milestone email"""
    subject = f"🔥 {streak_days} Day Learning Streak!"
    html_content = EmailTemplates.streak_milestone_email(username, streak_days)
    
    return EmailService.send_email(user_email, subject, html_content, email_type='streak', user_id=user_id)

def send_weekly_summary_email(user_email, username, stats, user_id=None):
    """Send weekly summary email"""
    subject = "📊 Your Weekly Learning Summary"
    html_content = EmailTemplates.weekly_summary_email(
        username, 
        stats.get('completed_topics', 0),
        stats.get('study_time', 0),
        stats.get('notes_created', 0),
        stats.get('current_streak', 0)
    )
    
    return EmailService.send_email(user_email, subject, html_content, email_type='summary', user_id=user_id)

def send_reminder_email(user_email, username, reminder_type, content_data, user_id=None):
    """Send reminder email"""
    subject = f"⏰ Reminder: {reminder_type.replace('_', ' ').title()}"
    html_content = EmailTemplates.reminder_email(username, reminder_type, content_data)
    
    return EmailService.send_email(user_email, subject, html_content, email_type='reminder', user_id=user_id)

# ==================== UTILITY FUNCTIONS ====================

def create_notification(user_id, title, message, notification_type='info', action_url=None):
    """Create a new notification for user"""
    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            action_url=action_url
        )
        db.session.add(notification)
        db.session.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to create notification: {str(e)}")
        return False

def update_user_streak(user):
    """Enhanced streak calculation with timezone awareness"""
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # Check if user was active today
    today_activity = Progress.query.filter_by(
        user_id=user.id,
        completed=True
    ).filter(func.date(Progress.completion_date) == today).first()
    
    # Check if user was active yesterday
    yesterday_activity = Progress.query.filter_by(
        user_id=user.id,
        completed=True
    ).filter(func.date(Progress.completion_date) == yesterday).first()
    
    if today_activity:
        if yesterday_activity or user.current_streak == 0:
            if user.last_activity.date() != today:
                user.current_streak += 1
                # Check for streak milestones and send emails
                if user.current_streak in [7, 30, 100] and user.email_notifications:
                    send_streak_milestone_email(user.email, user.username, user.current_streak, user.id)
                    create_notification(
                        user.id,
                        f"🔥 {user.current_streak} Day Streak!",
                        f"Congratulations! You've maintained a {user.current_streak} day study streak!",
                        'achievement'
                    )
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
        old_level = user.level
        user.level = new_level
        create_notification(
            user.id,
            f"🎉 Level Up!",
            f"Congratulations! You've reached level {new_level}!",
            'achievement'
        )
    
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
                        
                        # Send achievement email notification if user has email notifications enabled
                        if user.email_achievements:
                            send_achievement_email(
                                user.email,
                                user.username,
                                achievement.title,
                                achievement.description,
                                achievement.badge_icon,
                                achievement.points,
                                user.id
                            )
        
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
            'category': 'milestone',
            'rarity': 'common'
        },
        {
            'name': 'first_topic',
            'title': 'First Steps',
            'description': 'Completed your first topic',
            'badge_icon': '👶',
            'points': 25,
            'category': 'completion',
            'rarity': 'common'
        },
        {
            'name': 'week_warrior',
            'title': 'Week Warrior',
            'description': 'Maintained a 7-day study streak',
            'badge_icon': '⚔️',
            'points': 100,
            'category': 'streak',
            'rarity': 'rare'
        },
        {
            'name': 'month_master',
            'title': 'Month Master',
            'description': 'Maintained a 30-day study streak',
            'badge_icon': '👑',
            'points': 500,
            'category': 'streak',
            'rarity': 'epic'
        },
        {
            'name': 'century_club',
            'title': 'Century Club',
            'description': 'Achieved a 100-day study streak',
            'badge_icon': '💯',
            'points': 1000,
            'category': 'streak',
            'rarity': 'legendary'
        },
        {
            'name': 'note_taker',
            'title': 'Note Taker',
            'description': 'Created 10 study notes',
            'badge_icon': '📝',
            'points': 50,
            'category': 'productivity',
            'rarity': 'common'
        },
        {
            'name': 'pomodoro_pro',
            'title': 'Pomodoro Pro',
            'description': 'Completed 25 pomodoro sessions',
            'badge_icon': '🍅',
            'points': 75,
            'category': 'time',
            'rarity': 'rare'
        },
        {
            'name': 'week_completionist',
            'title': 'Week Completionist',
            'description': 'Completed an entire week of study topics',
            'badge_icon': '✅',
            'points': 200,
            'category': 'completion',
            'rarity': 'rare'
        },
        {
            'name': 'early_bird',
            'title': 'Early Bird',
            'description': 'Consistently study in the morning',
            'badge_icon': '🌅',
            'points': 100,
            'category': 'habit',
            'rarity': 'rare'
        },
        {
            'name': 'night_owl',
            'title': 'Night Owl',
            'description': 'Consistently study at night',
            'badge_icon': '🦉',
            'points': 100,
            'category': 'habit',
            'rarity': 'rare'
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

# ==================== API ROUTES ====================

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
            last_name=data.get('last_name', ''),
            email_notifications=data.get('email_notifications', True),
            email_achievements=data.get('email_achievements', True),
            email_reminders=data.get('email_reminders', True)
        )
        
        db.session.add(user)
        db.session.flush()  # Get user.id before commit
        
        # Create welcome notification
        create_notification(
            user.id,
            "Welcome to DSA Dashboard! 🎉",
            "Welcome to your personalized Data Structures & Algorithms learning journey! Start with Week 1 to begin your path to mastery.",
            'info',
            '/roadmap/week/1'
        )
        
        # Award first achievement
        check_and_award_achievements(user.id, 'first_signup')
        
        db.session.commit()
        
        # Send welcome email
        if user.email_notifications:
            send_welcome_email(user.email, user.username, user.id)
        
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
                    'level': user.level,
                    'theme_preference': user.theme_preference
                }
            }), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed. Please try again.'}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
            
            # Send email
            if send_password_reset_email(user.email, reset_token, user.username, user.id):
                db.session.commit()
                return jsonify({'message': 'Password reset email sent'}), 200
            else:
                return jsonify({'message': 'Failed to send email'}), 500
        else:
            # Don't reveal if email exists
            return jsonify({'message': 'If that email exists, a reset link has been sent'}), 200
            
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        user = User.query.filter_by(reset_token=data['token']).first()
        
        if user and user.reset_token_expires > datetime.utcnow():
            user.password_hash = generate_password_hash(data['password'])
            user.reset_token = None
            user.reset_token_expires = None
            
            db.session.commit()
            
            return jsonify({'message': 'Password reset successfully'}), 200
        else:
            return jsonify({'message': 'Invalid or expired token'}), 400
            
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({'message': 'An error occurred'}), 500

# Progress Routes
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
                'practice_problems_solved': p.practice_problems_solved,
                'review_needed': p.review_needed
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
        progress.review_needed = data.get('review_needed', False)
        
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

# Notes Routes
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
        folder = request.args.get('folder', '')
        
        query = Note.query.filter_by(user_id=user_id)
        
        if search:
            query = query.filter(
                or_(
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
            
        if folder:
            query = query.filter_by(folder=folder)
        
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
                'day_number': note.day_number,
                'tags': json.loads(note.tags) if note.tags else [],
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
                'is_favorite': note.is_favorite,
                'is_public': note.is_public,
                'note_type': note.note_type,
                'code_language': note.code_language,
                'view_count': note.view_count,
                'color': note.color,
                'folder': note.folder
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
            day_number=data.get('day_number'),
            tags=json.dumps(data.get('tags', [])),
            is_favorite=data.get('is_favorite', False),
            is_public=data.get('is_public', False),
            note_type=data.get('note_type', 'general'),
            code_language=data.get('code_language'),
            color=data.get('color', '#ffffff'),
            folder=data.get('folder', '')
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
        note.day_number = data.get('day_number', note.day_number)
        note.tags = json.dumps(data.get('tags', json.loads(note.tags) if note.tags else []))
        note.is_favorite = data.get('is_favorite', note.is_favorite)
        note.is_public = data.get('is_public', note.is_public)
        note.note_type = data.get('note_type', note.note_type)
        note.code_language = data.get('code_language', note.code_language)
        note.color = data.get('color', note.color)
        note.folder = data.get('folder', note.folder)
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

# Pomodoro Routes
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
            focus_rating=data.get('focus_rating'),
            session_type=data.get('session_type', 'work')
        )
        
        db.session.add(session)
        
        # Update user points and check achievements
        user = User.query.get(user_id)
        calculate_user_points(user)
        check_and_award_achievements(user_id, 'pomodoro_pro')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Pomodoro session saved',
            'session_id': session.id
        }), 201
        
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
        
        # Session type breakdown
        session_types = defaultdict(int)
        for session in sessions:
            session_types[session.session_type] += 1
        
        return jsonify({
            'total_sessions': total_sessions,
            'total_time': total_time,
            'average_per_day': total_time / days if days > 0 else 0,
            'average_focus_rating': round(avg_focus, 1),
            'session_types': dict(session_types),
            'daily_breakdown': dict(daily_stats)
        }), 200
        
    except Exception as e:
        logger.error(f"Get pomodoro stats error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Dashboard Routes
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
        today = datetime.utcnow()
        week_start = today - timedelta(days=today.weekday())
        week_progress = Progress.query.filter_by(user_id=user_id).filter(
            Progress.completion_date >= week_start,
            Progress.completed == True
        ).count() if week_start else 0
        
        # Get recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_notes = Note.query.filter_by(user_id=user_id).filter(
            Note.created_at >= week_ago
        ).count()
        
        recent_pomodoros = PomodoroSession.query.filter_by(
            user_id=user_id,
            completed=True
        ).filter(PomodoroSession.created_at >= week_ago).count()
        
        # Get total study time
        total_study_time = db.session.query(func.sum(PomodoroSession.duration)).filter_by(
            user_id=user_id, completed=True
        ).scalar() or 0
        
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
                'earned_at': ua.earned_at.isoformat(),
                'rarity': ua.achievement.rarity
            })
        
        # Get upcoming deadlines (calendar events)
        upcoming_deadlines = CalendarEvent.query.filter_by(
            user_id=user_id,
            event_type='deadline'
        ).filter(
            CalendarEvent.start_time >= datetime.utcnow()
        ).order_by(CalendarEvent.start_time).limit(3).all()
        
        deadlines = []
        for event in upcoming_deadlines:
            deadlines.append({
                'title': event.title,
                'date': event.start_time.date().isoformat(),
                'days_left': (event.start_time.date() - datetime.utcnow().date()).days
            })
        
        db.session.commit()
        
        return jsonify({
            'user': {
                'username': user.username,
                'total_points': user.total_points,
                'current_streak': user.current_streak,
                'longest_streak': user.longest_streak,
                'level': user.level,
                'daily_goal_minutes': user.daily_goal_minutes,
                'total_study_time': total_study_time
            },
            'progress': {
                'total_topics': total_topics,
                'completed_topics': completed_topics,
                'completion_percentage': (completed_topics / total_topics * 100) if total_topics > 0 else 0,
                'week_progress': week_progress
            },
            'recent_activity': {
                'notes_created': recent_notes,
                'pomodoros_completed': recent_pomodoros
            },
            'recent_achievements': recent_achievements,
            'upcoming_deadlines': deadlines
        }), 200
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Calendar Routes
@app.route('/api/calendar/events', methods=['GET'])
@jwt_required()
def get_calendar_events():
    try:
        user_id = get_jwt_identity()
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        query = CalendarEvent.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(CalendarEvent.start_time >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(CalendarEvent.end_time <= datetime.fromisoformat(end_date))
        
        events = query.order_by(CalendarEvent.start_time).all()
        
        result = []
        for event in events:
            result.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'start': event.start_time.isoformat(),
                'end': event.end_time.isoformat(),
                'type': event.event_type,
                'color': event.color,
                'week_number': event.week_number,
                'day_number': event.day_number,
                'topic': event.topic,
                'reminder_minutes': event.reminder_minutes
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get calendar events error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/calendar/events', methods=['POST'])
@jwt_required()
def create_calendar_event():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        event = CalendarEvent(
            user_id=user_id,
            title=data['title'],
            description=data.get('description', ''),
            start_time=datetime.fromisoformat(data['start_time']),
            end_time=datetime.fromisoformat(data['end_time']),
            event_type=data.get('event_type', 'study'),
            week_number=data.get('week_number'),
            day_number=data.get('day_number'),
            topic=data.get('topic', ''),
            color=data.get('color', '#3788d8'),
            reminder_minutes=data.get('reminder_minutes', 15)
        )
        
        db.session.add(event)
        db.session.commit()
        
        return jsonify({
            'message': 'Event created successfully',
            'event_id': event.id
        }), 201
        
    except Exception as e:
        logger.error(f"Create calendar event error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Global Search Route
@app.route('/api/search', methods=['GET'])
@jwt_required()
def global_search():
    try:
        user_id = get_jwt_identity()
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'all')  # all, notes, progress, events
        
        if not query:
            return jsonify({'message': 'Search query is required'}), 400
        
        results = {'notes': [], 'progress': [], 'events': []}
        
        if search_type in ['all', 'notes']:
            # Search notes
            notes = Note.query.filter_by(user_id=user_id).filter(
                or_(
                    Note.title.contains(query),
                    Note.content.contains(query),
                    Note.tags.contains(query)
                )
            ).order_by(Note.updated_at.desc()).limit(10).all()
            
            for note in notes:
                results['notes'].append({
                    'id': note.id,
                    'title': note.title,
                    'content': note.content[:200] + '...' if len(note.content) > 200 else note.content,
                    'type': 'note',
                    'url': f'/notes/{note.id}',
                    'created_at': note.created_at.isoformat()
                })
        
        if search_type in ['all', 'progress']:
            # Search progress
            progress = Progress.query.filter_by(user_id=user_id).filter(
                or_(
                    Progress.topic.contains(query),
                    Progress.notes.contains(query)
                )
            ).order_by(Progress.completion_date.desc()).limit(10).all()
            
            for p in progress:
                results['progress'].append({
                    'id': p.id,
                    'topic': p.topic,
                    'week': p.week_number,
                    'day': p.day_number,
                    'completed': p.completed,
                    'type': 'progress',
                    'url': f'/roadmap/week/{p.week_number}/day/{p.day_number}'
                })
        
        if search_type in ['all', 'events']:
            # Search calendar events
            events = CalendarEvent.query.filter_by(user_id=user_id).filter(
                or_(
                    CalendarEvent.title.contains(query),
                    CalendarEvent.description.contains(query),
                    CalendarEvent.topic.contains(query)
                )
            ).order_by(CalendarEvent.start_time.desc()).limit(10).all()
            
            for event in events:
                results['events'].append({
                    'id': event.id,
                    'title': event.title,
                    'description': event.description,
                    'type': 'event',
                    'event_type': event.event_type,
                    'start_time': event.start_time.isoformat(),
                    'url': f'/calendar'
                })
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"Global search error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Notifications Routes
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(read=False)
        
        notifications = query.order_by(Notification.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = []
        for notification in notifications.items:
            result.append({
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type,
                'read': notification.read,
                'action_url': notification.action_url,
                'created_at': notification.created_at.isoformat()
            })
        
        return jsonify({
            'notifications': result,
            'pagination': {
                'page': notifications.page,
                'pages': notifications.pages,
                'per_page': notifications.per_page,
                'total': notifications.total
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        user_id = get_jwt_identity()
        notification = Notification.query.filter_by(
            id=notification_id, user_id=user_id
        ).first()
        
        if not notification:
            return jsonify({'message': 'Notification not found'}), 404
        
        notification.read = True
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        logger.error(f"Mark notification read error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Profile Routes
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
                'rarity': ua.achievement.rarity,
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
            'website_url': user.website_url,
            'avatar_url': user.avatar_url,
            'total_points': user.total_points,
            'current_streak': user.current_streak,
            'longest_streak': user.longest_streak,
            'level': user.level,
            'daily_goal_minutes': user.daily_goal_minutes,
            'preferred_study_time': user.preferred_study_time,
            'difficulty_preference': user.difficulty_preference,
            'theme_preference': user.theme_preference,
            'profile_public': user.profile_public,
            'show_progress': user.show_progress,
            'show_achievements': user.show_achievements,
            'email_notifications': user.email_notifications,
            'email_achievements': user.email_achievements,
            'email_reminders': user.email_reminders,
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
        user.website_url = data.get('website_url', user.website_url)
        user.avatar_url = data.get('avatar_url', user.avatar_url)
        user.daily_goal_minutes = data.get('daily_goal_minutes', user.daily_goal_minutes)
        user.preferred_study_time = data.get('preferred_study_time', user.preferred_study_time)
        user.difficulty_preference = data.get('difficulty_preference', user.difficulty_preference)
        user.theme_preference = data.get('theme_preference', user.theme_preference)
        user.profile_public = data.get('profile_public', user.profile_public)
        user.show_progress = data.get('show_progress', user.show_progress)
        user.show_achievements = data.get('show_achievements', user.show_achievements)
        user.email_notifications = data.get('email_notifications', user.email_notifications)
        user.email_achievements = data.get('email_achievements', user.email_achievements)
        user.email_reminders = data.get('email_reminders', user.email_reminders)
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

# Analytics Routes
@app.route('/api/analytics/export', methods=['GET'])
@jwt_required()
def export_analytics():
    try:
        user_id = get_jwt_identity()
        export_type = request.args.get('type', 'progress')  # progress, notes, pomodoro, all
        
        if export_type == 'progress':
            data = Progress.query.filter_by(user_id=user_id).all()
            
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Week', 'Day', 'Topic', 'Completed', 'Completion Date', 
                           'Time Spent', 'Difficulty Rating', 'Confidence Level'])
            
            for item in data:
                writer.writerow([
                    item.week_number, item.day_number, item.topic, item.completed,
                    item.completion_date.isoformat() if item.completion_date else '',
                    item.time_spent, item.difficulty_rating, item.confidence_level
                ])
            
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'progress_export_{datetime.utcnow().strftime("%Y%m%d")}.csv'
            )
        
        return jsonify({'message': 'Export type not supported'}), 400
        
    except Exception as e:
        logger.error(f"Export analytics error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Leaderboard Route
@app.route('/api/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    try:
        leaderboard_type = request.args.get('type', 'points')
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

# Complete DSA Roadmap Route
@app.route('/api/roadmap/complete', methods=['GET'])
def get_complete_roadmap():
    """Get the complete detailed DSA roadmap"""
    
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
                        "leetcode_problems": []
                    },
                    {
                        "day": 2,
                        "topic": "Basic Syntax & Data Types", 
                        "time_estimate": "2-3 hours",
                        "leetcode_problems": [
                            {"id": 2235, "title": "Add Two Integers", "difficulty": "Easy"}
                        ]
                    },
                    {
                        "day": 3,
                        "topic": "Input/Output Operations",
                        "time_estimate": "2-3 hours",
                        "leetcode_problems": []
                    },
                    {
                        "day": 4,
                        "topic": "Functions & Modular Programming",
                        "time_estimate": "2-3 hours",
                        "leetcode_problems": []
                    },
                    {
                        "day": 5,
                        "topic": "Arrays & Lists Fundamentals",
                        "time_estimate": "3-4 hours",
                        "leetcode_problems": []
                    },
                    {
                        "day": 6,
                        "topic": "Project Planning: Scientific Calculator",
                        "time_estimate": "2-3 hours",
                        "leetcode_problems": []
                    },
                    {
                        "day": 7,
                        "topic": "Project Implementation: Scientific Calculator", 
                        "time_estimate": "4-5 hours",
                        "leetcode_problems": []
                    }
                ]
            }
            # Add more weeks here as needed
        ]
    }
    
    return jsonify(complete_roadmap), 200

# Email Service Status Route
@app.route('/api/email/status', methods=['GET'])
@jwt_required()
def get_email_service_status():
    """Get email service configuration status"""
    try:
        services = {}
        
        # Check SendGrid
        services['sendgrid'] = {
            'available': bool(app.config.get('SENDGRID_API_KEY')),
            'priority': 1,
            'name': 'SendGrid',
            'limit': '100 emails/day (free)'
        }
        
        # Check Mailgun
        services['mailgun'] = {
            'available': bool(app.config.get('MAILGUN_API_KEY') and app.config.get('MAILGUN_DOMAIN')),
            'priority': 2,
            'name': 'Mailgun',
            'limit': '5000 emails/month (free)'
        }
        
        # Check Gmail
        services['gmail'] = {
            'available': bool(app.config.get('GMAIL_USERNAME') and app.config.get('GMAIL_PASSWORD')),
            'priority': 3,
            'name': 'Gmail SMTP',
            'limit': 'Gmail account limits'
        }
        
        # Determine active service
        active_service = None
        for service_name, service_info in services.items():
            if service_info['available']:
                active_service = service_name
                break
        
        if not active_service:
            active_service = 'console'
        
        return jsonify({
            'active_service': active_service,
            'services': services,
            'fallback': 'console logging'
        }), 200
        
    except Exception as e:
        logger.error(f"Get email service status error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Test Email Route (for development)
@app.route('/api/email/test', methods=['POST'])
@jwt_required()
def test_email():
    """Test email functionality"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.get_json()
        email_type = data.get('type', 'welcome')
        
        success = False
        
        if email_type == 'welcome':
            success = send_welcome_email(user.email, user.username, user.id)
        elif email_type == 'achievement':
            success = send_achievement_email(
                user.email, 
                user.username, 
                "Test Achievement", 
                "This is a test achievement email",
                "🏆",
                100,
                user.id
            )
        elif email_type == 'streak':
            success = send_streak_milestone_email(user.email, user.username, 7, user.id)
        
        if success:
            return jsonify({'message': f'Test {email_type} email sent successfully'}), 200
        else:
            return jsonify({'message': 'Failed to send test email'}), 500
            
    except Exception as e:
        logger.error(f"Test email error: {str(e)}")
        return jsonify({'message': str(e)}), 500

# Health check route
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'email_service': 'configured' if any([
            app.config.get('SENDGRID_API_KEY'),
            app.config.get('MAILGUN_API_KEY'),
            app.config.get('GMAIL_USERNAME')
        ]) else 'console'
    }), 200

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

# Initialize database
with app.app_context():
    create_tables()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)