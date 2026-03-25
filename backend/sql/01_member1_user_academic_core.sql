BEGIN;

-- 1) UUID generator
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Hàm tự cập nhật updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Hàm kiểm tra user phải có đúng role PRIMARY tương ứng trước khi tạo profile
CREATE OR REPLACE FUNCTION ensure_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  required_role TEXT := TG_ARGV[0];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
      AND r.code = required_role
      AND ur.is_primary = TRUE
  ) THEN
    RAISE EXCEPTION 'User % must have primary role % before creating profile', NEW.user_id, required_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 4) roles
-- =========================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 5) users
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_users_status
    CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- =========================================================
-- 6) user_roles
-- =========================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT uq_user_roles_user_role
    UNIQUE (user_id, role_id)
);

-- Mỗi user tối đa 1 role chính
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_primary_per_user
ON user_roles(user_id)
WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
ON user_roles(role_id);

-- =========================================================
-- 7) teacher_profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  teacher_code VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(255) NULL,
  title VARCHAR(100) NULL,
  bio TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_teacher_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================================
-- 8) student_profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  student_code VARCHAR(50) NOT NULL UNIQUE,
  major VARCHAR(255) NULL,
  cohort_year INT NULL,
  class_name VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT ck_student_profiles_cohort_year
    CHECK (cohort_year IS NULL OR cohort_year > 0)
);

-- =========================================================
-- 9) subjects
-- =========================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  credits INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_subjects_credits
    CHECK (credits IS NULL OR credits >= 0)
);

CREATE INDEX IF NOT EXISTS idx_subjects_is_active
ON subjects(is_active);

-- =========================================================
-- 10) class_sections
-- =========================================================
CREATE TABLE IF NOT EXISTS class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  section_code VARCHAR(50) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  section_name VARCHAR(255) NULL,
  starts_at DATE NULL,
  ends_at DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_class_sections_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT uq_class_sections_unique_semester
    UNIQUE (subject_id, semester, academic_year, section_code),
  CONSTRAINT ck_class_sections_status
    CHECK (status IN ('active', 'closed', 'archived')),
  CONSTRAINT ck_class_sections_dates
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE INDEX IF NOT EXISTS idx_class_sections_subject_id
ON class_sections(subject_id);

-- =========================================================
-- 11) teaching_assignments
-- 1 lớp = 1 giáo viên chính duy nhất
-- =========================================================
CREATE TABLE IF NOT EXISTS teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_teaching_assignments_class_section
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id),
  CONSTRAINT fk_teaching_assignments_teacher
    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id),
  CONSTRAINT uq_teaching_assignments_one_teacher_per_class
    UNIQUE (class_section_id)
);

CREATE INDEX IF NOT EXISTS idx_teaching_assignments_teacher_id
ON teaching_assignments(teacher_id);

-- =========================================================
-- 12) enrollments
-- =========================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dropped_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_enrollments_class_section
    FOREIGN KEY (class_section_id) REFERENCES class_sections(id),
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_id) REFERENCES student_profiles(id),
  CONSTRAINT uq_enrollments_class_student
    UNIQUE (class_section_id, student_id),
  CONSTRAINT ck_enrollments_status
    CHECK (status IN ('enrolled', 'dropped', 'completed')),
  CONSTRAINT ck_enrollments_dropped_at
    CHECK (
      status <> 'dropped'
      OR dropped_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id
ON enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_class_section_id
ON enrollments(class_section_id);

-- =========================================================
-- 13) import_batches
-- =========================================================
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by_user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_rows INT NOT NULL DEFAULT 0,
  success_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_import_batches_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
  CONSTRAINT ck_import_batches_entity_type
    CHECK (entity_type IN (
      'students',
      'teachers',
      'subjects',
      'class_sections',
      'enrollments',
      'teaching_assignments'
    )),
  CONSTRAINT ck_import_batches_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT ck_import_batches_total_rows
    CHECK (total_rows >= 0),
  CONSTRAINT ck_import_batches_success_rows
    CHECK (success_rows >= 0),
  CONSTRAINT ck_import_batches_failed_rows
    CHECK (failed_rows >= 0),
  CONSTRAINT ck_import_batches_row_sum
    CHECK (success_rows + failed_rows <= total_rows),
  CONSTRAINT ck_import_batches_time_range
    CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_uploaded_by_user_id
ON import_batches(uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_entity_type
ON import_batches(entity_type);

-- =========================================================
-- 14) import_batch_errors
-- =========================================================
CREATE TABLE IF NOT EXISTS import_batch_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  row_number INT NOT NULL,
  raw_payload JSONB NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_import_batch_errors_batch
    FOREIGN KEY (batch_id) REFERENCES import_batches(id),
  CONSTRAINT ck_import_batch_errors_row_number
    CHECK (row_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_import_batch_errors_batch_id
ON import_batch_errors(batch_id);

-- =========================================================
-- 15) Trigger updated_at cho các bảng có updated_at
-- =========================================================
DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON roles;
CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_roles_set_updated_at ON user_roles;
CREATE TRIGGER trg_user_roles_set_updated_at
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_profiles_set_updated_at ON teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_set_updated_at
BEFORE UPDATE ON teacher_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_student_profiles_set_updated_at ON student_profiles;
CREATE TRIGGER trg_student_profiles_set_updated_at
BEFORE UPDATE ON student_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subjects_set_updated_at ON subjects;
CREATE TRIGGER trg_subjects_set_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_class_sections_set_updated_at ON class_sections;
CREATE TRIGGER trg_class_sections_set_updated_at
BEFORE UPDATE ON class_sections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_teaching_assignments_set_updated_at ON teaching_assignments;
CREATE TRIGGER trg_teaching_assignments_set_updated_at
BEFORE UPDATE ON teaching_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_enrollments_set_updated_at ON enrollments;
CREATE TRIGGER trg_enrollments_set_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_import_batches_set_updated_at ON import_batches;
CREATE TRIGGER trg_import_batches_set_updated_at
BEFORE UPDATE ON import_batches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 16) Trigger kiểm tra PRIMARY role đúng trước khi tạo profile
-- =========================================================
DROP TRIGGER IF EXISTS trg_teacher_profiles_require_teacher_role ON teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_require_teacher_role
BEFORE INSERT OR UPDATE OF user_id ON teacher_profiles
FOR EACH ROW EXECUTE FUNCTION ensure_profile_role('teacher');

DROP TRIGGER IF EXISTS trg_student_profiles_require_student_role ON student_profiles;
CREATE TRIGGER trg_student_profiles_require_student_role
BEFORE INSERT OR UPDATE OF user_id ON student_profiles
FOR EACH ROW EXECUTE FUNCTION ensure_profile_role('student');

COMMIT;
