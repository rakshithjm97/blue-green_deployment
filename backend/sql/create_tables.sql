-- Daily Activity Tracker Database Schema
-- PostgreSQL 17.6+
-- Run with psql: psql "postgresql://user:pass@host:port/dbname" -f create_tables.sql

BEGIN;

-- ============================================================================
-- users_table: Stores registered users (authentication & roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users_table (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_table_email ON users_table(email);
CREATE INDEX IF NOT EXISTS idx_users_table_created_at ON users_table(created_at DESC);

-- ============================================================================
-- password_reset_tokens: Password reset token storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- daily_tracker_table: Primary daily activity log (from /api/tracker)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_tracker_table (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  mode_of_functioning VARCHAR(50),
  pod_name VARCHAR(100),
  product VARCHAR(100),
  project_name VARCHAR(255),
  nature_of_work VARCHAR(255),
  task VARCHAR(255),
  dedicated_hours NUMERIC(10, 2),
  remarks TEXT,

  -- AIMS specific fields
  conductor_lines NUMERIC(10, 2),
  number_of_points NUMERIC(10, 2),

  -- IVMS specific fields
  benchmark_for_task NUMERIC(10, 2),
  line_miles NUMERIC(10, 2),
  line_miles_h1v1 NUMERIC(10, 2),
  dedicated_hours_h1v1 NUMERIC(10, 2),
  line_miles_h1v0 NUMERIC(10, 2),
  dedicated_hours_h1v0 NUMERIC(10, 2),

  -- Vendor POC specific fields
  tracker_updating NUMERIC(10, 2),
  data_quality_checking NUMERIC(10, 2),
  training_feedback NUMERIC(10, 2),
  trn_remarks TEXT,
  documentation NUMERIC(10, 2),
  doc_remark TEXT,
  others_misc TEXT,
  updated_in_prod_qc_tracker NUMERIC(10, 2),

  -- ISMS specific fields
  site_name VARCHAR(255),
  area_hectares NUMERIC(10, 2),
  polygon_feature_count NUMERIC(10, 2),
  polyline_feature_count NUMERIC(10, 2),
  point_feature_count NUMERIC(10, 2),
  spent_hours_on_above_task NUMERIC(10, 2),
  density NUMERIC(10, 2),

  -- RSMS specific fields
  time_field NUMERIC(10, 2),

  metadata_json TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_tracker_email ON daily_tracker_table(email);
CREATE INDEX IF NOT EXISTS idx_daily_tracker_product ON daily_tracker_table(product);
CREATE INDEX IF NOT EXISTS idx_daily_tracker_pod_name ON daily_tracker_table(pod_name);
CREATE INDEX IF NOT EXISTS idx_daily_tracker_submitted_at ON daily_tracker_table(submitted_at DESC);


-- ============================================================================
-- resource_planning_table: Resource planning entries (from /api/resource-planning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS resource_planning_table (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  pod_name VARCHAR(100),
  mode_of_functioning VARCHAR(100),
  product VARCHAR(100),
  project_name VARCHAR(255),
  nature_of_work VARCHAR(255),
  task VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_planning_email ON resource_planning_table(email);
CREATE INDEX IF NOT EXISTS idx_resource_planning_date ON resource_planning_table(date);
CREATE INDEX IF NOT EXISTS idx_resource_planning_pod_name ON resource_planning_table(pod_name);


-- ============================================================================
-- daily_activity: Old data archive (for /api/old-data queries and OldData page)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_activity (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  mode_of_functioning VARCHAR(50),
  pod_name VARCHAR(100),
  product VARCHAR(100),
  project_name VARCHAR(255),
  nature_of_work VARCHAR(255),
  task VARCHAR(255),
  dedicated_hours NUMERIC(10, 2),
  remarks TEXT,

  -- AIMS specific fields
  conductor_lines NUMERIC(10, 2),
  number_of_points NUMERIC(10, 2),

  -- IVMS specific fields
  benchmark_for_task NUMERIC(10, 2),
  line_miles NUMERIC(10, 2),
  line_miles_h1v1 NUMERIC(10, 2),
  dedicated_hours_h1v1 NUMERIC(10, 2),
  line_miles_h1v0 NUMERIC(10, 2),
  dedicated_hours_h1v0 NUMERIC(10, 2),

  -- Vendor POC specific fields
  tracker_updating NUMERIC(10, 2),
  data_quality_checking NUMERIC(10, 2),
  training_feedback NUMERIC(10, 2),
  trn_remarks TEXT,
  documentation NUMERIC(10, 2),
  doc_remark TEXT,
  others_misc TEXT,
  updated_in_prod_qc_tracker NUMERIC(10, 2),

  -- ISMS specific fields
  site_name VARCHAR(255),
  area_hectares NUMERIC(10, 2),
  polygon_feature_count NUMERIC(10, 2),
  polyline_feature_count NUMERIC(10, 2),
  point_feature_count NUMERIC(10, 2),
  spent_hours_on_above_task NUMERIC(10, 2),
  density NUMERIC(10, 2),

  -- RSMS specific fields
  time_field NUMERIC(10, 2),

  metadata_json TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_email ON daily_activity(email);
CREATE INDEX IF NOT EXISTS idx_daily_activity_product ON daily_activity(product);
CREATE INDEX IF NOT EXISTS idx_daily_activity_pod_name ON daily_activity(pod_name);
CREATE INDEX IF NOT EXISTS idx_daily_activity_submitted_at ON daily_activity(submitted_at DESC);


-- ============================================================================
-- old_data_table: Historical data archive (for /api/old-data queries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS old_data_table (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  pod_name VARCHAR(100),
  mode_of_functioning VARCHAR(100),
  product VARCHAR(100),
  project_name VARCHAR(255),
  nature_of_work VARCHAR(255),
  task VARCHAR(255),
  dedicated_hours NUMERIC(10, 2),
  remarks TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_old_data_email ON old_data_table(email);
CREATE INDEX IF NOT EXISTS idx_old_data_product ON old_data_table(product);
CREATE INDEX IF NOT EXISTS idx_old_data_submitted_at ON old_data_table(submitted_at DESC);

COMMIT;

-- ============================================================================
-- Notes:
-- 1. All tables use UTC timestamps (TIMESTAMP WITH TIME ZONE)
-- 2. Primary keys are UUID strings (VARCHAR(50)) or auto-incrementing integers
-- 3. Foreign keys not enforced; rely on app-level referential integrity
-- 4. Metadata/remarks fields use TEXT for unlimited length
-- 5. Numeric fields use NUMERIC(precision, scale) for financial/precise values
-- 6. For production: enable row-level security (RLS), add audit triggers
-- 7. Backup strategy: pg_dump daily; archive old_data_table quarterly
-- ============================================================================
