BEGIN;

TRUNCATE TABLE
  import_batch_errors,
  import_batches,
  enrollments,
  teaching_assignments,
  class_sections,
  subjects,
  student_profiles,
  teacher_profiles,
  user_roles,
  users,
  roles
CASCADE;

COMMIT;
