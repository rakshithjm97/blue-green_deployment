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
from sqlalchemy import text, bindparam
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
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

# Use the real old-data source table name
OLD_DATA_TABLE = "daily_activity"

# Control whether to query both sources or only the old_data_table
USE_BOTH_SOURCES = os.environ.get("USE_BOTH_SOURCES", "true").lower() in ("1", "true", "yes")

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
    If you switch TEAM_ACCESS keys to full emails,
    change this to: return (email or "").strip().lower()
    """
    return (email or "").split("@")[0].strip().lower()



from sqlalchemy import text, bindparam

def exec_text(sql: str, params: dict | None = None):
    """
    Execute raw SQL safely using Flask-SQLAlchemy session.
    Fixes: NameError: engine is not defined
    Also supports IN (...) lists via expanding bindparam.
    """
    params = params or {}

    stmt = text(sql)

    # ✅ Important for: pod_name IN :allowed_pods
    for k, v in params.items():
        if isinstance(v, (list, tuple, set)):
            stmt = stmt.bindparams(bindparam(k, expanding=True))

    return db.session.execute(stmt, params)

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
    benchmark_for_task = db.Column(db.String(255), nullable=True)
    line_miles = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)
    dedicated_hours_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)

    # Vendor POC specific fields
    tracker_updating = db.Column(db.Boolean, nullable=True)
    data_quality_checking = db.Column(db.Boolean, nullable=True)
    training_feedback = db.Column(db.Boolean, nullable=True)
    trn_remarks = db.Column(db.Text, nullable=True)
    documentation = db.Column(db.Boolean, nullable=True)
    doc_remark = db.Column(db.Text, nullable=True)
    others_misc = db.Column(db.Text, nullable=True)
    updated_in_prod_qc_tracker = db.Column(db.Boolean, nullable=True)

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

class ResourcePlanning(db.Model):
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

class OldData(db.Model):
    __tablename__ = "daily_activity"

    id = db.Column(db.Text, primary_key=True)

    email = db.Column(db.Text, nullable=False)
    name = db.Column(db.Text)

    mode_of_functioning = db.Column(db.Text)
    pod_name = db.Column(db.Text)
    product = db.Column(db.Text)

    project_name = db.Column(db.Text)
    nature_of_work = db.Column(db.Text)
    task = db.Column(db.Text)

    dedicated_hours = db.Column(db.Float)
    dedicated_hours_h1v1 = db.Column(db.Float)
    dedicated_hours_h1v0 = db.Column(db.Float)

    line_miles = db.Column(db.Float)
    line_miles_h1v1 = db.Column(db.Text)
    line_miles_h1v0 = db.Column(db.Text)

    benchmark_for_task = db.Column(db.Text)
    remarks = db.Column(db.Text)

    activity_date = db.Column(db.DateTime)
    submitted_at = db.Column(db.DateTime)
    created_at = db.Column(db.Text)

    less_worked_hours = db.Column(db.Text)

class DailyActivityNew(db.Model):
    __tablename__ = "daily_activity_new"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(150), nullable=True)
    mode_of_functioning = db.Column(db.String(100), nullable=True)
    pod_name = db.Column(db.String(100), nullable=True)

    project_name = db.Column(db.String(255), nullable=True)
    nature_of_work = db.Column(db.String(255), nullable=True)
    task = db.Column(db.Text, nullable=True)

    dedicated_hours = db.Column(db.Numeric(5, 2), nullable=True)
    dedicated_hours_h1v1 = db.Column(db.Numeric(5, 2), nullable=True)
    dedicated_hours_h1v0 = db.Column(db.Numeric(5, 2), nullable=True)

    line_miles = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v1 = db.Column(db.Numeric(10, 2), nullable=True)
    line_miles_h1v0 = db.Column(db.Numeric(10, 2), nullable=True)

    benchmark_for_task = db.Column(db.String(255), nullable=True)
    remarks = db.Column(db.Text, nullable=True)

    activity_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("email", "activity_date", name="uix_email_activity_date"),)

class ResourceTable(db.Model):
    __tablename__ = "resource_table"
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
    return jsonify(
        {
            "status": "success",
            "access_token": access_token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        }
    ), 200

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
    if not require_admin():
        return jsonify({"status": "error", "message": "Admin only"}), 403

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(
        {
            "status": "success",
            "data": [{"id": u.id, "email": u.email, "name": u.name, "role": u.role} for u in users],
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

        if not email:
            return jsonify({"status": "error", "message": "email is required"}), 400
        if not raw_password:
            return jsonify({"status": "error", "message": "password is required"}), 400
        if not name:
            return jsonify({"status": "error", "message": "name is required"}), 400
        if not role:
            return jsonify({"status": "error", "message": "role is required"}), 400

        hashed = generate_password_hash(raw_password)
        new_user = User(id=str(uuid.uuid4()), email=email, password=hashed, name=name, role=role)
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

    q = DailyTracker.query

    if role == "User":
        q = q.filter(DailyTracker.email == identity)

    elif role in ["Manager", "Team Lead"]:
        key = user_key_from_email(identity)
        allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
        if not allowed_pods:
            return jsonify({"status": "success", "data": []}), 200
        q = q.filter(DailyTracker.pod_name.in_(allowed_pods))

    elif role == "Admin":
        pass

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

    first = projects[0] if isinstance(projects, list) and len(projects) > 0 else {}
    project_name = first.get("projectName")
    nature_of_work = first.get("natureOfWork")
    task = first.get("task") or first.get("subTask")
    dedicated_hours = first.get("dedicatedHours")
    remarks = first.get("remarks")

    entry = DailyTracker(
        id=str(uuid.uuid4()),
        email=email,
        date=tracker_date or "",
        mode_of_functioning=mode,
        pod_name=pod,
        product=product,
        project_name=project_name,
        nature_of_work=nature_of_work,
        task=task,
        dedicated_hours=dedicated_hours,
        remarks=remarks,

        # AIMS
        conductor_lines=first.get("conductorLines"),
        number_of_points=first.get("numberOfPoints"),

        # IVMS
        benchmark_for_task=first.get("benchmarkForTask"),
        line_miles=first.get("lineMiles"),
        line_miles_h1v1=first.get("lineMilesH1V1"),
        dedicated_hours_h1v1=first.get("dedicatedHoursH1V1"),
        line_miles_h1v0=first.get("lineMilesH1V0"),
        dedicated_hours_h1v0=first.get("dedicatedHoursH1V0"),

        # Vendor POC
        tracker_updating=first.get("trackerUpdating"),
        data_quality_checking=first.get("dataQualityChecking"),
        training_feedback=first.get("trainingFeedback"),
        trn_remarks=first.get("trnRemarks"),
        documentation=first.get("documentation"),
        doc_remark=first.get("docRemark"),
        others_misc=first.get("othersMisc"),
        updated_in_prod_qc_tracker=first.get("updatedInProdQCTracker"),

        # ISMS
        site_name=first.get("siteName"),
        area_hectares=first.get("areaHectares"),
        polygon_feature_count=first.get("polygonFeatureCount"),
        polyline_feature_count=first.get("polylineFeatureCount"),
        point_feature_count=first.get("pointFeatureCount"),
        spent_hours_on_above_task=first.get("spentHoursOnAboveTask"),
        density=first.get("density"),

        # RSMS
        time_field=first.get("time"),

        metadata_json=json.dumps(data),
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"status": "success", "id": entry.id}), 201

# -----------------------
# Resource planning (JWT protected) ✅ force email from token
# -----------------------
@app.route("/api/resource-planning", methods=["POST"])
@jwt_required()
def submit_resource_planning():
    initialize_rds()
    data = request.json or {}

    identity = get_jwt_identity()
    email = identity  # ✅ lock submitter
    date = data.get("date")

    if not date:
        return jsonify({"status": "error", "message": "date is required"}), 400

    entry = ResourcePlanning(
        id=str(uuid.uuid4()),
        email=email,
        date=date,
        pod_name=data.get("podName"),
        mode_of_functioning=data.get("modeOfFunctioning"),
        product=data.get("product"),
        project_name=data.get("projectName"),
        nature_of_work=data.get("natureOfWork"),
        task=data.get("task"),
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"status": "success", "id": entry.id}), 201

# -----------------------
# Daily Activity New (JWT protected create + public list)
# -----------------------
@app.route("/api/daily-activity-new", methods=["POST"])
@jwt_required()
def create_daily_activity_new():
    try:
        initialize_rds()
        data = request.json or {}

        identity = get_jwt_identity()
        email = identity  # ✅ lock submitter

        activity_date = data.get("activityDate") or data.get("activity_date")
        if not activity_date:
            return jsonify({"status": "error", "message": "activityDate is required"}), 400

        entry = DailyActivityNew(
            email=email,
            name=data.get("name"),
            mode_of_functioning=data.get("modeOfFunctioning") or data.get("mode_of_functioning"),
            pod_name=data.get("podName") or data.get("pod_name"),
            project_name=data.get("projectName") or data.get("project_name"),
            nature_of_work=data.get("natureOfWork") or data.get("nature_of_work"),
            task=data.get("task"),
            dedicated_hours=data.get("dedicatedHours"),
            dedicated_hours_h1v1=data.get("dedicatedHoursH1V1"),
            dedicated_hours_h1v0=data.get("dedicatedHoursH1V0"),
            line_miles=data.get("lineMiles"),
            line_miles_h1v1=data.get("lineMilesH1V1"),
            line_miles_h1v0=data.get("lineMilesH1V0"),
            benchmark_for_task=data.get("benchmarkForTask"),
            remarks=data.get("remarks"),
            activity_date=datetime.fromisoformat(activity_date).date() if isinstance(activity_date, str) else activity_date,
        )

        db.session.add(entry)
        db.session.commit()
        return jsonify({"status": "success", "message": "Daily activity entry created successfully", "id": entry.id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "An entry for this email and date already exists"}), 409
    except ValueError as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Invalid date format: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Error creating daily_activity_new entry: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/daily-activity-new", methods=["GET"])
def list_daily_activity_new():
    try:
        initialize_rds()
        email = request.args.get("email")
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        pod_name = request.args.get("pod_name")

        query = DailyActivityNew.query
        if email:
            query = query.filter_by(email=email)
        if pod_name:
            query = query.filter_by(pod_name=pod_name)
        if date_from:
            df = datetime.fromisoformat(date_from).date()
            query = query.filter(DailyActivityNew.activity_date >= df)
        if date_to:
            dt = datetime.fromisoformat(date_to).date()
            query = query.filter(DailyActivityNew.activity_date <= dt)

        entries = query.order_by(DailyActivityNew.activity_date.desc()).limit(500).all()
        data = []
        for e in entries:
            data.append(
                {
                    "id": e.id,
                    "email": e.email,
                    "name": e.name,
                    "modeOfFunctioning": e.mode_of_functioning,
                    "podName": e.pod_name,
                    "projectName": e.project_name,
                    "natureOfWork": e.nature_of_work,
                    "task": e.task,
                    "dedicatedHours": float(e.dedicated_hours) if e.dedicated_hours is not None else None,
                    "dedicatedHoursH1V1": float(e.dedicated_hours_h1v1) if e.dedicated_hours_h1v1 is not None else None,
                    "dedicatedHoursH1V0": float(e.dedicated_hours_h1v0) if e.dedicated_hours_h1v0 is not None else None,
                    "lineMiles": float(e.line_miles) if e.line_miles is not None else None,
                    "lineMilesH1V1": float(e.line_miles_h1v1) if e.line_miles_h1v1 is not None else None,
                    "lineMilesH1V0": float(e.line_miles_h1v0) if e.line_miles_h1v0 is not None else None,
                    "benchmarkForTask": e.benchmark_for_task,
                    "remarks": e.remarks,
                    "activityDate": e.activity_date.isoformat() if e.activity_date else None,
                    "createdAt": e.created_at.isoformat() if e.created_at else None,
                }
            )

        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        logger.error(f"Error listing daily_activity_new: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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
# Old Data + Filters (combined sources) ✅ JWT + RBAC + safe IN list expansion
# -----------------------
@app.route("/api/daily_activity", methods=["GET"])
@jwt_required()
def get_daily_activity():
    try:
        initialize_rds()

        identity = get_jwt_identity()
        role = (get_jwt() or {}).get("role", "User")

        # frontend optional filters
        pod_name = request.args.get("pod_name")
        product = request.args.get("product")
        project_name = request.args.get("project_name")
        nature_of_work = request.args.get("nature_of_work")
        task = request.args.get("task")

        where_clauses = ["1=1"]
        params = {}

        # ✅ ROLE BASED ACCESS
        if role == "User":
            where_clauses.append("email = :email")
            params["email"] = identity

        elif role in ["Manager", "Team Lead"]:
            key = user_key_from_email(identity)
            allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
            if not allowed_pods:
                return jsonify({"status": "success", "data": []}), 200

            # ✅ use IN :allowed_pods + bindparam(expanding=True)
            where_clauses.append("pod_name IN (:allowed_pods)")

            params["allowed_pods"] = allowed_pods

            # optional: if user chooses a pod filter, allow only within allowed pods
            if pod_name:
                if pod_name not in allowed_pods:
                    return jsonify({"status": "success", "data": []}), 200
                where_clauses.append("pod_name = :pod_name")
                params["pod_name"] = pod_name

        elif role in ["Admin", "Internal Admin"]:
            if pod_name:
                where_clauses.append("pod_name = :pod_name")
                params["pod_name"] = pod_name

        # other filters
        if product:
            where_clauses.append("product = :product")
            params["product"] = product
        if project_name:
            where_clauses.append("project_name = :project_name")
            params["project_name"] = project_name
        if nature_of_work:
            where_clauses.append("nature_of_work = :nature_of_work")
            params["nature_of_work"] = nature_of_work
        if task:
            where_clauses.append("task = :task")
            params["task"] = task

        where_sql = " AND ".join(where_clauses)

        if USE_BOTH_SOURCES:
            sql_query = (
                f"SELECT id, email, pod_name, mode_of_functioning, product, project_name, nature_of_work, task, dedicated_hours, remarks, submitted_at "
                f"FROM {OLD_DATA_TABLE} WHERE {where_sql} "
                f"UNION ALL "
                f"SELECT id, email, pod_name, mode_of_functioning, product, project_name, nature_of_work, task, dedicated_hours, remarks, submitted_at "
                f"FROM daily_tracker_table WHERE {where_sql} "
                f"ORDER BY submitted_at DESC NULLS LAST"
            )
        else:
            sql_query = (
                f"SELECT id, email, pod_name, mode_of_functioning, product, project_name, nature_of_work, task, dedicated_hours, remarks, submitted_at "
                f"FROM {OLD_DATA_TABLE} WHERE {where_sql} ORDER BY submitted_at DESC NULLS LAST"
            )

        rows = exec_text(sql_query, params).fetchall()

        result_data = []
        for row in rows:
            row_dict = dict(row._mapping)
            result_data.append({
                "id": row_dict.get("id"),
                "email": row_dict.get("email"),
                "podName": row_dict.get("pod_name"),
                "modeOfFunctioning": row_dict.get("mode_of_functioning"),
                "product": row_dict.get("product"),
                "projectName": row_dict.get("project_name"),
                "natureOfWork": row_dict.get("nature_of_work"),
                "task": row_dict.get("task"),
                "dedicatedHours": float(row_dict.get("dedicated_hours")) if row_dict.get("dedicated_hours") is not None else None,
                "remarks": row_dict.get("remarks"),
                "submittedAt": row_dict.get("submitted_at").isoformat() if row_dict.get("submitted_at") else None,
            })

        return jsonify({"status": "success", "data": result_data}), 200

    except Exception as e:
        logger.error(f"Error fetching old data: {str(e)}")
        return jsonify({"status": "error", "message": f"Error fetching old data: {str(e)}"}), 500

@app.route("/api/daily_activity/filters", methods=["GET"])
@jwt_required()
def get_daily_activity_filters():
    """
    ✅ JWT + RBAC-protected filter values.
    Users only see their own values.
    Managers/Team Leads only see values within allowed pods.
    Admin sees all.
    """
    try:
        

        identity = get_jwt_identity()
        role = (get_jwt() or {}).get("role", "User")
        key = user_key_from_email(identity)

        products = []
        project_names = []
        nature_of_work = []
        tasks = []
        pod_names = []

        where_clauses = ["1=1"]
        params = {}

        allowed_pods = []

        if role == "User":
            where_clauses.append("email = :email")
            params["email"] = identity

        elif role in ["Manager", "Team Lead"]:
            allowed_pods = TEAM_ACCESS.get(role, {}).get(key, [])
            if not allowed_pods:
                return jsonify(
                    {"status": "success",
                     "data": {"products": [], "projectNames": [], "natureOfWork": [], "tasks": [], "podNames": []}}
                ), 200
            where_clauses.append("pod_name IN (:allowed_pods)")

            params["allowed_pods"] = allowed_pods

        # Admin: no additional restriction

        where_sql = " AND ".join(where_clauses)

        # products
        try:
            if USE_BOTH_SOURCES:
                query = (
                    f"SELECT DISTINCT product FROM ("
                    f"SELECT product FROM {OLD_DATA_TABLE} WHERE {where_sql} UNION ALL "
                    f"SELECT product FROM daily_tracker_table WHERE {where_sql} ) as prod "
                    f"WHERE product IS NOT NULL AND product != '' ORDER BY product"
                )
            else:
                query = (
                    f"SELECT DISTINCT product FROM {OLD_DATA_TABLE} "
                    f"WHERE {where_sql} AND product IS NOT NULL AND product != '' ORDER BY product"
                )

            result = exec_text(query, params)
            products = [row[0] for row in result.fetchall()]
        except Exception as e:
            logger.warning(f"Error fetching products: {e}")
            products = []

        # project names
        try:
            if USE_BOTH_SOURCES:
                query = (
                    f"SELECT DISTINCT project_name FROM ("
                    f"SELECT project_name FROM {OLD_DATA_TABLE} WHERE {where_sql} UNION ALL "
                    f"SELECT project_name FROM daily_tracker_table WHERE {where_sql} ) as proj "
                    f"WHERE project_name IS NOT NULL AND project_name != '' ORDER BY project_name"
                )
            else:
                query = (
                    f"SELECT DISTINCT project_name FROM {OLD_DATA_TABLE} "
                    f"WHERE {where_sql} AND project_name IS NOT NULL AND project_name != '' ORDER BY project_name"
                )

            result = exec_text(query, params)
            project_names = [row[0] for row in result.fetchall()]
        except Exception as e:
            logger.warning(f"Error fetching project_names: {e}")
            project_names = []

        # nature of work
        try:
            if USE_BOTH_SOURCES:
                query = (
                    f"SELECT DISTINCT nature_of_work FROM ("
                    f"SELECT nature_of_work FROM {OLD_DATA_TABLE} WHERE {where_sql} UNION ALL "
                    f"SELECT nature_of_work FROM daily_tracker_table WHERE {where_sql} ) as nat "
                    f"WHERE nature_of_work IS NOT NULL AND nature_of_work != '' ORDER BY nature_of_work"
                )
            else:
                query = (
                    f"SELECT DISTINCT nature_of_work FROM {OLD_DATA_TABLE} "
                    f"WHERE {where_sql} AND nature_of_work IS NOT NULL AND nature_of_work != '' ORDER BY nature_of_work"
                )

            result = exec_text(query, params)
            nature_of_work = [row[0] for row in result.fetchall()]
        except Exception as e:
            logger.warning(f"Error fetching nature_of_work: {e}")
            nature_of_work = []

        # tasks
        try:
            if USE_BOTH_SOURCES:
                query = (
                    f"SELECT DISTINCT task FROM ("
                    f"SELECT task FROM {OLD_DATA_TABLE} WHERE {where_sql} UNION ALL "
                    f"SELECT task FROM daily_tracker_table WHERE {where_sql} ) as t "
                    f"WHERE task IS NOT NULL AND task != '' ORDER BY task"
                )
            else:
                query = (
                    f"SELECT DISTINCT task FROM {OLD_DATA_TABLE} "
                    f"WHERE {where_sql} AND task IS NOT NULL AND task != '' ORDER BY task"
                )

            result = exec_text(query, params)
            tasks = [row[0] for row in result.fetchall()]
        except Exception as e:
            logger.warning(f"Error fetching tasks: {e}")
            tasks = []

        # pod names dropdown
        if role in ["Admin", "Internal Admin"]:

            try:
                if USE_BOTH_SOURCES:
                    query = (
                        f"SELECT DISTINCT pod_name FROM ("
                        f"SELECT pod_name FROM {OLD_DATA_TABLE} WHERE pod_name IS NOT NULL AND pod_name != '' UNION ALL "
                        f"SELECT pod_name FROM daily_tracker_table WHERE pod_name IS NOT NULL AND pod_name != '' ) as p "
                        f"ORDER BY pod_name"
                    )
                else:
                    query = (
                        f"SELECT DISTINCT pod_name FROM {OLD_DATA_TABLE} "
                        f"WHERE pod_name IS NOT NULL AND pod_name != '' ORDER BY pod_name"
                    )
                result = exec_text(query, {})
                pod_names = [row[0] for row in result.fetchall()]
            except Exception as e:
                logger.warning(f"Error fetching pod_names: {e}")
                pod_names = []
            pod_names_out = sorted(filter(None, pod_names))

        elif role in ["Manager", "Team Lead"]:
            pod_names_out = allowed_pods

        else:
            pod_names_out = []

        return jsonify(
            {
                "status": "success",
                "data": {
                    "products": sorted(filter(None, products)),
                    "projectNames": sorted(filter(None, project_names)),
                    "natureOfWork": sorted(filter(None, nature_of_work)),
                    "tasks": sorted(filter(None, tasks)),
                    "podNames": pod_names_out,
                },
            }
        ), 200

    except Exception as e:
        logger.error(f"Error fetching old data filters: {str(e)}")
        return jsonify(
            {
                "status": "success",
                "data": {"products": [], "projectNames": [], "natureOfWork": [], "tasks": [], "podNames": []},
            }
        ), 200

@app.route("/api/daily_activity/edit", methods=["PUT"])
@jwt_required()
def edit_daily_activity_by_keys():
    role = (get_jwt() or {}).get("role", "User")
    if role not in ["Admin", "Internal Admin"]:
        return jsonify({"status": "error", "message": "Forbidden"}), 403

    data = request.json or {}

    required = ["email", "project_name", "submitted_at"]
    for r in required:
        if not data.get(r):
            return jsonify({"status": "error", "message": f"{r} is required"}), 400

    allowed_fields = [
        "pod_name",
        "mode_of_functioning",
        "product",
        "nature_of_work",
        "task",
        "dedicated_hours",
        "remarks",
    ]

    updates = {k: data[k] for k in allowed_fields if k in data}
    if not updates:
        return jsonify({"status": "error", "message": "No fields to update"}), 400

    set_sql = ", ".join([f"{k} = :{k}" for k in updates])
    updates.update({
        "email": data["email"],
        "project_name": data["project_name"],
        "submitted_at": data["submitted_at"],
    })

    sql = f"""
      UPDATE {OLD_DATA_TABLE}
      SET {set_sql}
      WHERE email = :email
        AND project_name = :project_name
        AND DATE(submitted_at) = DATE(:submitted_at)
    """

    exec_text(sql, updates)
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
# API: Performance (supports date filters + role/email scoping)
# -----------------------
@app.route("/api/performance", methods=["GET"])
def api_performance():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        role = request.args.get("role", "")
        email = request.args.get("email", "")

        q = DailyActivityNew.query

        start_dt = _parse_date(start_date)
        end_dt = _parse_date(end_date)
        if start_dt:
            q = q.filter(DailyActivityNew.submitted_at >= start_dt)
        if end_dt:
            # include full day
            q = q.filter(DailyActivityNew.submitted_at <= (end_dt + timedelta(days=1) - timedelta(seconds=1)))

        # restrict regular users to their own data
        if role not in ("Manager", "Admin", "Internal Admin", "Team Lead"):
            if email:
                q = q.filter(DailyActivityNew.email == email)
            else:
                return jsonify({"status": "error", "message": "email required for user scope"}), 400

        rows = q.order_by(DailyActivityNew.submitted_at.desc()).limit(5000).all()

        out = []
        for r in rows:
            out.append({
                "id": getattr(r, "id", None),
                "email": getattr(r, "email", None),
                "name": getattr(r, "name", None),
                "product": getattr(r, "product", None),
                "projectName": getattr(r, "project_name", None),
                "natureOfWork": getattr(r, "nature_of_work", None),
                "task": getattr(r, "task", None),
                "hours": getattr(r, "dedicated_hours", None) or getattr(r, "hours", None),
                "podName": getattr(r, "pod_name", None),
                "submitted_at": (getattr(r, "submitted_at", None).isoformat() if getattr(r, "submitted_at", None) else None)
            })

        return jsonify({"status": "success", "data": out})

    except Exception as e:
        logger.exception("performance API error")
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------
# API: Team report (aggregated per-user) — uses same date/role/email scoping
# -----------------------
@app.route("/api/team-report", methods=["GET"])
def api_team_report():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        role = request.args.get("role", "")
        email = request.args.get("email", "")

        q = DailyActivityNew.query

        start_dt = _parse_date(start_date)
        end_dt = _parse_date(end_date)
        if start_dt:
            q = q.filter(DailyActivityNew.submitted_at >= start_dt)
        if end_dt:
            q = q.filter(DailyActivityNew.submitted_at <= (end_dt + timedelta(days=1) - timedelta(seconds=1)))

        # regular users only see their own aggregated report
        if role not in ("Manager", "Admin", "Internal Admin", "Team Lead"):
            if email:
                q = q.filter(DailyActivityNew.email == email)
            else:
                return jsonify({"status": "error", "message": "email required for user scope"}), 400

        rows = q.order_by(DailyActivityNew.submitted_at.desc()).all()

        agg = {}
        for r in rows:
            em = getattr(r, "email", None) or getattr(r, "name", None) or "unknown"
            if em not in agg:
                agg[em] = {"email": em, "name": getattr(r, "name", None), "entries": 0, "totalHours": 0.0}
            try:
                h = float(getattr(r, "dedicated_hours", None) or getattr(r, "hours", 0) or 0)
            except Exception:
                h = 0.0
            agg[em]["entries"] += 1
            agg[em]["totalHours"] += h

        out = []
        for v in agg.values():
            out.append({
                "email": v["email"],
                "name": v.get("name"),
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
