from flask import Flask, request, jsonify, make_response, send_from_directory, has_app_context
from datetime import datetime, timezone, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import json
import uuid
import logging
import secrets
import hashlib
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    decode_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

# -----------------------
# Logging
# -----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------
# App + CORS
# -----------------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# -----------------------
# Database config
# -----------------------
# NOTE: In production, DO NOT hardcode credentials in code.
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "Admin1234")
DB_HOST = os.environ.get("DB_HOST", "database-1.cdoe0oi2s7w4.ap-south-1.rds.amazonaws.com")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "postgres")

RDS_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=prefer"

DATABASE_URL = os.environ.get("DATABASE_URL", RDS_URL)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Build engine options based on database type
engine_options = {
    "pool_pre_ping": True,
    "pool_recycle": 1200,
    "pool_size": 10,
    "max_overflow": 20,
}

# SQLite does not support connect_timeout; only add for postgres
if not DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"connect_timeout": 3}

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = engine_options

# -----------------------
# JWT config
# -----------------------
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "change-this-secret-in-prod")
jwt = JWTManager(app)

# Password reset expiry
RESET_TOKEN_MINUTES = int(os.environ.get("RESET_TOKEN_MINUTES", "30"))

db = SQLAlchemy(app)

# All data consolidated into single database

# -----------------------
# Helpers
# -----------------------
def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def require_admin() -> bool:
    claims = get_jwt()
    return claims.get("role") == "Admin"

# ✅ RBAC map: keys must match user_key_from_email()
# Recommended: use full emails as keys (more reliable than prefix).
TEAM_ACCESS = {
    "Manager": {
        # "manager1@aidash.com": ["POD-1 (Aryabhatta)", "POD-2 (Crawlers)"],
        # "manager2@aidash.com": ["POD-3 (Marte)", "POD-4 (Gaganyan)"],
        # "manager3@aidash.com": ["POD-5 (Swift)", "POD-6 (Imagery)"],
        "manager1": ["POD-1 (Aryabhatta)", "POD-2 (Crawlers)"],
        "manager2": ["POD-3 (Marte)", "POD-4 (Gaganyan)"],
        "manager3": ["POD-5 (Swift)", "POD-6 (Imagery)"],
    },
    "Team Lead": {
        "team_lead1": ["POD-1 (Aryabhatta)"],
        "team_lead2": ["POD-2 (Crawlers)"],
        "team_lead3": ["POD-3 (Marte)"],
        "team_lead4": ["POD-4 (Gaganyan)"],
        "team_lead5": ["POD-5 (Swift)"],
        "team_lead6": ["POD-6 (Imagery)"],
    }
}

def user_key_from_email(email: str) -> str:
    """
    Extract user key from email (before @ symbol).
    """
    return (email or "").split("@")[0].strip().lower()

# -----------------------
# Models
# -----------------------
class User(db.Model):
    __tablename__ = "users_table"
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # hashed
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    pod_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey("users_table.id"), nullable=False)

    token_hash = db.Column(db.String(64), unique=True, nullable=False)  # sha256 hex length 64
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", backref=db.backref("reset_tokens", lazy=True))

class DailyTracker(db.Model):
    __tablename__ = "daily_tracker_table"
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    mode_of_functioning = db.Column(db.String(50), nullable=True)
    pod_name = db.Column(db.String(100), nullable=True)
    product = db.Column(db.String(100), nullable=True)
    project_name = db.Column(db.String(255), nullable=True)
    nature_of_work = db.Column(db.String(255), nullable=True)
    task = db.Column(db.String(255), nullable=True)
    dedicated_hours = db.Column(db.Numeric(10, 2), nullable=True)
    remarks = db.Column(db.Text, nullable=True)

    # AIMS specific fields
    conductor_lines = db.Column(db.Numeric(10, 2), nullable=True)
    number_of_points = db.Column(db.Numeric(10, 2), nullable=True)

    # IVMS specific fields
    benchmark_for_task = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)

    # Vendor POC specific fields (stored as NUMERIC: 0 or 1)
    tracker_updating = db.Column(db.Numeric(10, 2), nullable=True)
    data_quality_checking = db.Column(db.Numeric(10, 2), nullable=True)
    training_feedback = db.Column(db.Numeric(10, 2), nullable=True)
    trn_remarks = db.Column(db.Text, nullable=True)
    documentation = db.Column(db.Numeric(10, 2), nullable=True)
    doc_remark = db.Column(db.Text, nullable=True)
    others_misc = db.Column(db.Text, nullable=True)
    updated_in_prod_qc_tracker = db.Column(db.Numeric(10, 2), nullable=True)

    # ISMS specific fields
    site_name = db.Column(db.String(255), nullable=True)
    area_hectares = db.Column(db.Numeric(10, 2), nullable=True)
    polygon_feature_count = db.Column(db.Numeric(10, 2), nullable=True)
    polyline_feature_count = db.Column(db.Numeric(10, 2), nullable=True)
    point_feature_count = db.Column(db.Numeric(10, 2), nullable=True)
    spent_hours_on_above_task = db.Column(db.Numeric(10, 2), nullable=True)
    density = db.Column(db.Numeric(10, 2), nullable=True)

    # RSMS specific fields
    time_field = db.Column(db.Numeric(10, 2), nullable=True)

    metadata_json = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))



class ResourceTable(db.Model):
    __tablename__ = "resource_planning_table"
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    pod_name = db.Column(db.String(100), nullable=True)
    mode_of_functioning = db.Column(db.String(100), nullable=True)
    product = db.Column(db.String(100), nullable=True)
    project_name = db.Column(db.String(255), nullable=True)
    nature_of_work = db.Column(db.String(255), nullable=True)
    task = db.Column(db.String(255), nullable=True)
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class DailyActivity(db.Model):
    __tablename__ = "daily_activity"
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.Text, nullable=True)
    mode_of_functioning = db.Column(db.Text, nullable=True)
    pod_name = db.Column(db.Text, nullable=True)
    product = db.Column(db.Text, nullable=True)
    project_name = db.Column(db.Text, nullable=True)
    nature_of_work = db.Column(db.Text, nullable=True)
    task = db.Column(db.Text, nullable=True)
    dedicated_hours = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v1 = db.Column(db.Text, nullable=True)
    line_miles_h1v0 = db.Column(db.Text, nullable=True)
    benchmark_for_task = db.Column(db.Text, nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    activity_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.Text, nullable=True)
    less_worked_hours = db.Column(db.Text, nullable=True)


# -----------------------
# DB init
# -----------------------
_tables_verified = False

def initialize_rds():
    global _tables_verified
    if _tables_verified:
        return True

    try:
        # ✅ Ensure we have an application context
        if not has_app_context():
            with app.app_context():
                return initialize_rds()

        db.create_all()

        # Ensure default admin exists
        if not User.query.filter_by(email="admin@aidash.com").first():
            admin = User(
                id=str(uuid.uuid4()),
                email="admin@aidash.com",
                password=generate_password_hash("password123"),
                name="System Admin",
                role="Admin",
            )
            db.session.add(admin)
            db.session.commit()

        # Seed sample users if none exist
        if User.query.count() == 1:  # Only admin exists
            sample_users = [
                User(id=str(uuid.uuid4()), email="user1@aidash.com", password=generate_password_hash("password123"), name="User One", role="User"),
                User(id=str(uuid.uuid4()), email="user2@aidash.com", password=generate_password_hash("password123"), name="User Two", role="User"),
                User(id=str(uuid.uuid4()), email="manager1@aidash.com", password=generate_password_hash("password123"), name="Manager One", role="Manager"),
                User(id=str(uuid.uuid4()), email="lead1@aidash.com", password=generate_password_hash("password123"), name="Team Lead One", role="Team Lead"),
            ]
            db.session.add_all(sample_users)
            db.session.commit()

        _tables_verified = True
        return True

    except Exception as e:
        logger.error(f"DB Init Error: {e}")
        return False
# -----------------------
# Static routes (React build)
# -----------------------
@app.route("/", methods=["GET"])
def index():
    resp = make_response(send_from_directory("dist", "index.html"))
    resp.headers["Cache-Control"] = "no-store, max-age=0"
    return resp

@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory("dist/assets", filename)

# -----------------------
# API
# -----------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "connected", "timestamp": datetime.now(timezone.utc).isoformat()}), 200

@app.route("/api/debug/daily-activity-count", methods=["GET"])
def debug_daily_activity_count():
    """Debug endpoint to check data in database"""
    try:
        initialize_rds()
        count = DailyTracker.query.count()
        return jsonify({"status": "success", "daily_tracker_count": count}), 200
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/ui-options", methods=["GET"])
def ui_options():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        metadata_path = os.path.join(base_dir, "metadata.json")
        with open(metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        return jsonify({"status": "success", "data": meta.get("uiOptions", {})}), 200
    except Exception as e:
        logger.error(f"UI options load error: {e}")
        return jsonify({"status": "error", "message": "Could not load uiOptions"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    initialize_rds()
    data = request.json or {}
    email = (data.get("email") or "").strip()
    password = data.get("password")

    if not email or not password:
        return jsonify({"status": "error", "message": "email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

    access_token = create_access_token(
        identity=user.email,
        additional_claims={"role": user.role, "id": user.id},
    )
    refresh_token = create_refresh_token(identity=user.email)
    return jsonify(
        {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        }
    ), 200


@app.route("/api/refresh", methods=["POST"])
def refresh_token_route():
    """Accepts a refresh token (in JSON body or Authorization header) and returns a new access token."""
    initialize_rds()
    token = None
    auth = request.headers.get("Authorization", "")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
    else:
        data = request.json or {}
        token = data.get("refresh_token")

    if not token:
        return jsonify({"status": "error", "message": "Refresh token required"}), 401

    try:
        decoded = decode_token(token)
        identity = decoded.get("sub") or decoded.get("identity")
        if not identity:
            return jsonify({"status": "error", "message": "Invalid refresh token"}), 401

        user = User.query.filter_by(email=identity).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 401

        new_access = create_access_token(identity=identity, additional_claims={"role": user.role, "id": user.id})
        return jsonify({"status": "success", "access_token": new_access}), 200

    except Exception as e:
        logger.warning(f"Refresh token decode failed: {e}")
        return jsonify({"status": "error", "message": "Invalid refresh token"}), 401

# -----------------------
# Forgot / Reset Password
# -----------------------
@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    """
    Generates a reset token and stores only its hash with expiry.
    Always returns a generic message to prevent email enumeration.
    """
    initialize_rds()
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()

    generic_msg = "If this email exists, a reset link has been sent."

    if not email:
        return jsonify({"status": "success", "message": generic_msg}), 200

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"status": "success", "message": generic_msg}), 200

    raw_token = secrets.token_urlsafe(32)
    token_hash = sha256_hex(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_MINUTES)

    # Invalidate previous unused tokens (optional)
    PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).update(
        {"used_at": datetime.now(timezone.utc)}
    )
    db.session.commit()

    prt = PasswordResetToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.session.add(prt)
    db.session.commit()

    # In production: send email. For dev: log token.
    logger.info(f"[DEV] Password reset token for {email}: {raw_token} (expires {expires_at.isoformat()})")

    return jsonify({"status": "success", "message": generic_msg}), 200

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    """
    Resets password using token. Checks: exists, not used, not expired.
    """
    initialize_rds()
    data = request.json or {}
    token = (data.get("token") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not token or not new_password:
        return jsonify({"status": "error", "message": "token and new_password required"}), 400

    if len(new_password) < 8:
        return jsonify({"status": "error", "message": "Password must be at least 8 characters"}), 400

    token_hash = sha256_hex(token)
    now = datetime.now(timezone.utc)

    prt = PasswordResetToken.query.filter_by(token_hash=token_hash).first()
    if not prt or prt.used_at is not None or prt.expires_at < now:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 400

    user = User.query.get(prt.user_id)
    if not user:
        return jsonify({"status": "error", "message": "Invalid token"}), 400

    user.password = generate_password_hash(new_password)
    prt.used_at = now
    db.session.commit()

    return jsonify({"status": "success", "message": "Password updated successfully. Please login."}), 200

# -----------------------
# Users (Admin only)
# -----------------------
@app.route("/api/users", methods=["GET"])
@jwt_required()


def get_users():
    initialize_rds()
    # Allow Admins, Managers and Team Leads to list users (Admin gets full access)
    identity = get_jwt_identity()
    role = (get_jwt() or {}).get("role", "User")

    if role not in ("Admin", "Manager", "Team Lead"):
        return jsonify({"status": "error", "message": "Admin/Manager only"}), 403

    q = User.query
    # Managers/Team Leads should only see users from their allowed PODs
    if role in ("Manager", "Team Lead"):
        key = user_key_from_email(identity)
        allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
        if not allowed_pods:
            return jsonify({"status": "success", "data": []}), 200
        q = q.filter(User.pod_name.in_(allowed_pods))

    users = q.order_by(User.created_at.desc()).all()
    return jsonify(
        {
            "status": "success",
            "data": [{"id": u.id, "email": u.email, "name": u.name, "role": u.role, "pod": u.pod_name} for u in users],
        }
    ), 200

@app.route("/api/users", methods=["POST"])
@jwt_required()
def create_user():
    try:
        initialize_rds()
        if not require_admin():
            return jsonify({"status": "error", "message": "Admin only"}), 403

        data = request.json or {}
        email = (data.get("email") or "").strip()
        raw_password = data.get("password")
        name = (data.get("name") or "").strip()
        role = (data.get("role") or "").strip()
        pod = (data.get("pod") or data.get("pod_name") or "").strip() or None

        if not email:
            return jsonify({"status": "error", "message": "email is required"}), 400
        if not raw_password:
            return jsonify({"status": "error", "message": "password is required"}), 400
        if not name:
            return jsonify({"status": "error", "message": "name is required"}), 400
        if not role:
            return jsonify({"status": "error", "message": "role is required"}), 400

        hashed = generate_password_hash(raw_password)
        new_user = User(id=str(uuid.uuid4()), email=email, password=hashed, name=name, role=role, pod_name=pod)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"status": "success", "message": "User created successfully"}), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Email already exists"}), 409
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/users/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    initialize_rds()
    if not require_admin():
        return jsonify({"status": "error", "message": "Admin only"}), 403

    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()

    return jsonify({"status": "success"}), 200

# -----------------------
# Performance (RBAC)
# -----------------------
@app.route("/api/performance", methods=["GET"])
@jwt_required()
def get_performance():
    initialize_rds()

    identity = get_jwt_identity()          # email from token
    role = (get_jwt() or {}).get("role", "User")

    # optional email query param (frontend may pass current user's email)
    req_email = request.args.get('email')

    q = DailyTracker.query

    # Server-side enforcement of visibility
    if role == "User":
        # Always honor JWT identity for regular users
        q = q.filter(DailyTracker.email == identity)

    elif role in ["Manager", "Team Lead"]:
        key = user_key_from_email(identity)
        allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
        if not allowed_pods:
            return jsonify({"status": "success", "data": []}), 200
        q = q.filter(DailyTracker.pod_name.in_(allowed_pods))
        # Managers/Team Leads may optionally request a specific user's data, but still restricted to their PODs
        if req_email:
            q = q.filter(DailyTracker.email == req_email)

    elif role == "Admin":
        # Admins may optionally filter by email
        if req_email:
            q = q.filter(DailyTracker.email == req_email)

    entries = q.order_by(DailyTracker.submitted_at.desc()).limit(500).all()

    return jsonify(
        {
            "status": "success",
            "data": [
                {
                    "id": e.id,
                    "email": e.email,
                    "podName": e.pod_name,
                    "product": e.product,
                    "projectName": e.project_name,
                    "hours": float(e.dedicated_hours) if e.dedicated_hours is not None else None,
                    "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
                }
                for e in entries
            ],
        }
    ), 200

# -----------------------
# Tracker submit (JWT protected) ✅ force email from token
# -----------------------
@app.route("/api/tracker", methods=["POST"])
@jwt_required()
def submit_tracker():
    initialize_rds()
    data = request.json or {}

    identity = get_jwt_identity()
    email = identity  # ✅ lock submitter

    mode = data.get("modeOfFunctioning")
    pod = data.get("podName")
    product = data.get("product")
    tracker_date = data.get("date")
    projects = data.get("projects") or []

    # Create an entry for EACH project
    created_ids = []
    for proj in projects:
        # Helper to convert empty strings to None for numeric fields
        def to_numeric(val):
            if val is None or val == '' or val == 'undefined':
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None
        
        def to_text(val):
            if val is None or val == '' or val == 'undefined':
                return None
            return str(val).strip() if str(val).strip() else None
        
        def to_int(val):
            """Convert boolean to int (0 or 1) for numeric columns"""
            # Handle boolean first (before None check, since None is also falsy)
            if isinstance(val, bool):
                return 1 if val else 0
            # Handle None, empty strings, undefined
            if val is None or val == '' or val == 'undefined':
                return 0  # Default to 0 for false values
            # Try to convert to int
            try:
                result = int(val)
                return result
            except (ValueError, TypeError):
                return 0  # Default to 0 on error
        
        entry = DailyTracker(
            id=str(uuid.uuid4()),
            email=email,
            date=tracker_date or "",
            mode_of_functioning=mode,
            pod_name=pod,
            product=product,
            project_name=proj.get("projectName"),
            nature_of_work=proj.get("natureOfWork"),
            task=proj.get("task") or proj.get("subTask"),
            dedicated_hours=to_numeric(proj.get("dedicatedHours")),
            remarks=to_text(proj.get("remarks")),

            # AIMS
            conductor_lines=to_numeric(proj.get("conductorLines")),
            number_of_points=to_numeric(proj.get("numberOfPoints")),

            # IVMS
            benchmark_for_task=to_numeric(proj.get("benchmarkForTask")),
            line_miles=to_numeric(proj.get("lineMiles")),
            line_miles_h1v1=to_numeric(proj.get("lineMilesH1V1")),
            dedicated_hours_h1v1=to_numeric(proj.get("dedicatedHoursH1V1")),
            line_miles_h1v0=to_numeric(proj.get("lineMilesH1V0")),
            dedicated_hours_h1v0=to_numeric(proj.get("dedicatedHoursH1V0")),

            # Vendor POC (numeric booleans: 0 or 1)
            tracker_updating=to_int(proj.get("trackerUpdating")),
            data_quality_checking=to_int(proj.get("dataQualityChecking")),
            training_feedback=to_int(proj.get("trainingFeedback")),
            trn_remarks=to_text(proj.get("trnRemarks")),
            documentation=to_int(proj.get("documentation")),
            doc_remark=to_text(proj.get("docRemark")),
            others_misc=to_text(proj.get("othersMisc")),
            updated_in_prod_qc_tracker=proj.get("updatedInProdQCTracker"),

            # ISMS
            site_name=to_text(proj.get("siteName")),
            area_hectares=to_numeric(proj.get("areaHectares")),
            polygon_feature_count=to_numeric(proj.get("polygonFeatureCount")),
            polyline_feature_count=to_numeric(proj.get("polylineFeatureCount")),
            point_feature_count=to_numeric(proj.get("pointFeatureCount")),
            spent_hours_on_above_task=to_numeric(proj.get("spentHoursOnAboveTask")),
            density=to_numeric(proj.get("density")),

            # RSMS
            time_field=to_numeric(proj.get("timeField")),

            metadata_json=json.dumps(data),
        )
        db.session.add(entry)
        created_ids.append(entry.id)
    
    db.session.commit()
    return jsonify({"status": "success", "count": len(created_ids), "ids": created_ids}), 201



# -----------------------
# Resource table (JWT create + public list)
# -----------------------
@app.route("/api/resource", methods=["POST"])
@jwt_required()
def create_resource():
    try:
        initialize_rds()
        data = request.json or {}

        identity = get_jwt_identity()
        email = identity  # ✅ lock submitter

        date = data.get("date")
        if not date:
            return jsonify({"status": "error", "message": "date is required"}), 400

        entry = ResourceTable(
            id=str(uuid.uuid4()),
            email=email,
            date=date,
            pod_name=data.get("podName") or data.get("pod_name"),
            mode_of_functioning=data.get("modeOfFunctioning") or data.get("mode_of_functioning"),
            product=data.get("product"),
            project_name=data.get("projectName") or data.get("project_name"),
            nature_of_work=data.get("natureOfWork") or data.get("nature_of_work"),
            task=data.get("task"),
        )

        db.session.add(entry)
        db.session.commit()
        return jsonify({"status": "success", "id": entry.id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Duplicate entry or constraint error"}), 409
    except Exception as e:
        logger.error(f"Error creating resource entry: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/resource", methods=["GET"])
def list_resources():
    try:
        initialize_rds()
        email = request.args.get("email")
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        pod_name = request.args.get("pod_name")

        query = ResourceTable.query
        if email:
            query = query.filter_by(email=email)
        if pod_name:
            query = query.filter_by(pod_name=pod_name)
        if date_from:
            query = query.filter(ResourceTable.date >= date_from)
        if date_to:
            query = query.filter(ResourceTable.date <= date_to)

        entries = query.order_by(ResourceTable.date.desc()).limit(500).all()
        data = [
            {
                "id": e.id,
                "email": e.email,
                "date": e.date,
                "podName": e.pod_name,
                "modeOfFunctioning": e.mode_of_functioning,
                "product": e.product,
                "projectName": e.project_name,
                "natureOfWork": e.nature_of_work,
                "task": e.task,
                "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
            }
            for e in entries
        ]

        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        logger.error(f"Error listing resources: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------
# Old Data + Filters (combined sources) ✅ Public access for now
# -----------------------
@app.route("/api/daily_activity", methods=["GET"])
@jwt_required()
def get_daily_activity():
    try:
        initialize_rds()

        # Get role and email from JWT claims
        identity = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "User")

        # Allow role/email override via query params for testing (remove in production)
        role = request.args.get("role", role)
        identity = request.args.get("email", identity)

        # Optional filters
        pod_name = request.args.get("pod_name")
        product = request.args.get("product")
        project_name = request.args.get("project_name")
        nature_of_work = request.args.get("nature_of_work")
        task = request.args.get("task")

        # Build query from DailyActivity (old data) table
        q = DailyActivity.query

        # ✅ ROLE BASED ACCESS
        if role == "User":
            q = q.filter(DailyActivity.email == identity)

        elif role in ["Manager", "Team Lead"]:
            key = user_key_from_email(identity)
            allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
            if not allowed_pods:
                return jsonify({"status": "success", "data": []}), 200
            q = q.filter(DailyActivity.pod_name.in_(allowed_pods))

            # Optional: if user chooses a pod filter, allow only within allowed pods
            if pod_name:
                if pod_name not in allowed_pods:
                    return jsonify({"status": "success", "data": []}), 200
                q = q.filter(DailyActivity.pod_name == pod_name)

        elif role in ["Admin", "Internal Admin"]:
            if pod_name:
                q = q.filter(DailyActivity.pod_name == pod_name)

        # Apply other filters
        if product:
            q = q.filter(DailyActivity.product == product)
        if project_name:
            q = q.filter(DailyActivity.project_name == project_name)
        if nature_of_work:
            q = q.filter(DailyActivity.nature_of_work == nature_of_work)
        if task:
            q = q.filter(DailyActivity.task == task)

        # Date range filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            q = q.filter(DailyActivity.activity_date >= start_date)
        if end_date:
            q = q.filter(DailyActivity.activity_date <= end_date)

        entries = q.order_by(DailyActivity.activity_date.desc()).limit(50).all()

        result_data = []
        for e in entries:
            result_data.append({
                "id": e.id,
                "email": e.email,
                "name": e.name,
                "podName": e.pod_name,
                "modeOfFunctioning": e.mode_of_functioning,
                "product": e.product,
                "projectName": e.project_name,
                "natureOfWork": e.nature_of_work,
                "task": e.task,
                "dedicatedHours": float(e.dedicated_hours) if e.dedicated_hours is not None else None,
                "remarks": e.remarks,
                "activityDate": e.activity_date.isoformat() if e.activity_date else None,
            })

        return jsonify({"status": "success", "data": result_data}), 200

    except Exception as e:
        logger.error(f"Error fetching daily_activity: {str(e)}")
        return jsonify({"status": "error", "message": f"Error fetching data: {str(e)}"}), 500

@app.route("/api/daily_activity/filters", methods=["GET"])
def get_daily_activity_filters():
    """Get filter values from metadata.json with role-based filtering."""
    try:
        initialize_rds()

        # Load metadata
        base_dir = os.path.dirname(os.path.abspath(__file__))
        metadata_path = os.path.join(base_dir, "metadata.json")
        
        ui_options = {}
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
                ui_options = metadata.get("uiOptions", {})
        except Exception as e:
            logger.warning(f"Could not load metadata.json: {e}")

        # Get from metadata or empty
        all_products = ui_options.get("products", [])
        all_project_names = ui_options.get("projectNames", [])
        all_nature_of_work = ui_options.get("natureOfWork", [])
        all_tasks = ui_options.get("tasks", [])
        all_pod_names = ui_options.get("podNames", [])

        # Get user info
        identity = request.args.get("email", "admin@aidash.com")
        role = request.args.get("role", "Admin")
        key = user_key_from_email(identity)

        # Filter POD names based on role
        pod_names = all_pod_names
        if role in ["Manager", "Team Lead"]:
            allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
            if not allowed_pods:
                return jsonify(
                    {"status": "success",
                     "data": {"products": [], "projectNames": [], "natureOfWork": [], "tasks": [], "podNames": []}}
                ), 200
            pod_names = allowed_pods

        return jsonify(
            {
                "products": all_products,
                "projectNames": all_project_names,
                "natureOfWork": all_nature_of_work,
                "tasks": all_tasks,
                "podNames": pod_names,
            }
        ), 200

    except Exception as e:
        logger.error(f"Error fetching filters: {str(e)}")
        return jsonify(
            {
                "products": [], 
                "projectNames": [], 
                "natureOfWork": [], 
                "tasks": [], 
                "podNames": []
            }
        ), 200

@app.route("/api/daily_activity/edit", methods=["PUT"])
@jwt_required()
def edit_daily_activity_by_keys():
    role = (get_jwt() or {}).get("role", "User")
    if role not in ["Admin", "Internal Admin"]:
        return jsonify({"status": "error", "message": "Forbidden"}), 403

    data = request.json or {}

    required = ["id"]
    for r in required:
        if not data.get(r):
            return jsonify({"status": "error", "message": f"{r} is required"}), 400

    # Allow all editable fields for Admin/Internal Admin
    all_editable_fields = [
        "pod_name",
        "mode_of_functioning",
        "product",
        "project_name",
        "nature_of_work",
        "task",
        "dedicated_hours",
        "remarks",
    ]

    updates = {k: data[k] for k in all_editable_fields if k in data}
    if not updates:
        return jsonify({"status": "error", "message": "No fields to update"}), 400

    # Try DailyActivity first (old data), then DailyTracker (current data)
    entry = DailyActivity.query.get(data["id"])
    if not entry:
        entry = DailyTracker.query.get(data["id"])
    
    if not entry:
        return jsonify({"status": "error", "message": "Entry not found"}), 404

    for field, value in updates.items():
        setattr(entry, field, value)

    db.session.commit()
    return jsonify({"status": "success", "message": "Row updated"}), 200

# --- helpers ---
def _parse_date(d: str):
    if not d:
        return None
    try:
        # accept YYYY-MM-DD or full ISO
        if len(d) == 10:
            return datetime.fromisoformat(d).replace(tzinfo=timezone.utc)
        return datetime.fromisoformat(d)
    except Exception:
        try:
            return datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return None

# -----------------------
# API: Performance (with date filters + role/email scoping)
# -----------------------
@app.route("/api/performance", methods=["GET"])
def api_performance():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        role = request.args.get("role", "")
        email = request.args.get("email", "")

        q = DailyTracker.query

        start_dt = _parse_date(start_date)
        end_dt = _parse_date(end_date)
        if start_dt:
            q = q.filter(DailyTracker.submitted_at >= start_dt)
        if end_dt:
            q = q.filter(DailyTracker.submitted_at <= (end_dt + timedelta(days=1) - timedelta(seconds=1)))

        # Restrict regular users to their own data
        if role not in ("Manager", "Admin", "Internal Admin", "Team Lead"):
            if email:
                q = q.filter(DailyTracker.email == email)
            else:
                return jsonify({"status": "error", "message": "email required for user scope"}), 400

        rows = q.order_by(DailyTracker.submitted_at.desc()).limit(5000).all()

        out = []
        for r in rows:
            out.append({
                "id": r.id,
                "email": r.email,
                "product": r.product,
                "projectName": r.project_name,
                "natureOfWork": r.nature_of_work,
                "task": r.task,
                "hours": float(r.dedicated_hours) if r.dedicated_hours else None,
                "podName": r.pod_name,
                "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
            })

        return jsonify({"status": "success", "data": out})

    except Exception as e:
        logger.exception("performance API error")
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------
# API: Team report (aggregated per-user)
# -----------------------
@app.route("/api/team-report", methods=["GET"])
def api_team_report():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        role = request.args.get("role", "")
        email = request.args.get("email", "")

        q = DailyTracker.query

        start_dt = _parse_date(start_date)
        end_dt = _parse_date(end_date)
        if start_dt:
            q = q.filter(DailyTracker.submitted_at >= start_dt)
        if end_dt:
            q = q.filter(DailyTracker.submitted_at <= (end_dt + timedelta(days=1) - timedelta(seconds=1)))

        # Regular users only see their own aggregated report
        if role not in ("Manager", "Admin", "Internal Admin", "Team Lead"):
            if email:
                q = q.filter(DailyTracker.email == email)
            else:
                return jsonify({"status": "error", "message": "email required for user scope"}), 400

        rows = q.order_by(DailyTracker.submitted_at.desc()).all()

        agg = {}
        for r in rows:
            em = r.email or "unknown"
            if em not in agg:
                agg[em] = {"email": em, "entries": 0, "totalHours": 0.0}
            try:
                h = float(r.dedicated_hours or 0)
            except Exception:
                h = 0.0
            agg[em]["entries"] += 1
            agg[em]["totalHours"] += h

        out = []
        for v in agg.values():
            out.append({
                "email": v["email"],
                "entries": v["entries"],
                "totalHours": round(v["totalHours"], 2),
                "avgDaily": round((v["totalHours"] / v["entries"]) if v["entries"] else 0, 2)
            })

        return jsonify({"status": "success", "data": out})

    except Exception as e:
        logger.exception("team-report API error")
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------
# CORS headers
# -----------------------
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS,PUT,DELETE"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# -----------------------
# Run
# -----------------------
if __name__ == "__main__":
    with app.app_context():
        initialize_rds()
    app.run(host="0.0.0.0", port=5000, debug=True)
