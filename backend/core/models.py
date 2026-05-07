from django.db import models


# 1.  USERS
class User(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    ]

    name = models.CharField(max_length=100)
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    email = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=255)
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    is_active = models.BooleanField(default=True)
    avatar = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return self.name


# 2.  TEACHER PROFILES
class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id', related_name='teacher_profile')
    teacher_code = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=150, null=True, blank=True)
    title = models.CharField(max_length=100, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher_profiles'
        managed = False

    def __str__(self):
        return f"{self.teacher_code} – {self.user.name}"


# 3.  STUDENT PROFILES
class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id', related_name='student_profile')
    student_code = models.CharField(max_length=50, unique=True)
    major = models.CharField(max_length=150, null=True, blank=True)
    cohort_year = models.IntegerField(null=True, blank=True)
    class_name = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        managed = False

    def __str__(self):
        return f"{self.student_code} – {self.user.name}"


# 4.  SUBJECTS
class Subject(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    credits = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subjects'
        managed = False

    def __str__(self):
        return f"{self.code} – {self.name}"


# 5.  CLASS SECTIONS
class ClassSection(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')
    section_code = models.CharField(max_length=50)
    semester = models.CharField(max_length=20)
    academic_year = models.CharField(max_length=20)
    section_name = models.CharField(max_length=255, null=True, blank=True)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'class_sections'
        managed = False

    def __str__(self):
        return f"{self.section_name or self.section_code} ({self.semester}/{self.academic_year})"


# 6.  TEACHING ASSIGNMENTS
class TeachingAssignment(models.Model):
    class_section = models.OneToOneField(ClassSection, on_delete=models.CASCADE, db_column='class_section_id', related_name='assignment')
    teacher_profile = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, db_column='teacher_profile_id')
    assigned_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teaching_assignments'
        managed = False


# 7.  ENROLLMENTS
class Enrollment(models.Model):
    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('dropped', 'Dropped'),
        ('completed', 'Completed'),
    ]

    class_section = models.ForeignKey(ClassSection, on_delete=models.CASCADE, db_column='class_section_id')
    student_profile = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='student_profile_id')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='enrolled')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    dropped_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enrollments'
        managed = False
        unique_together = [('class_section', 'student_profile')]


# 8.  IMPORT BATCHES
class ImportBatch(models.Model):
    ENTITY_CHOICES = [
        ('users', 'Users (mixed roles)'),
        ('students', 'Students'), ('teachers', 'Teachers'), ('subjects', 'Subjects'),
        ('class_sections', 'Class Sections'), ('enrollments', 'Enrollments'),
        ('teaching_assignments', 'Teaching Assignments'),
    ]
    STATUS_CHOICES = [('pending','Pending'), ('processing','Processing'), ('completed','Completed'), ('failed','Failed')]

    entity_type = models.CharField(max_length=30, choices=ENTITY_CHOICES)
    file_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, db_column='uploaded_by')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    total_rows = models.IntegerField(default=0)
    success_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'import_batches'
        managed = False


# 9.  IMPORT BATCH ERRORS
class ImportBatchError(models.Model):
    batch = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, db_column='batch_id', related_name='errors')
    row_number = models.IntegerField(db_column='row_number')
    raw_payload = models.JSONField(null=True, blank=True)
    error_message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'import_batch_errors'
        managed = False


# 10. DOCUMENTS
class Document(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20)
    file_size = models.BigIntegerField(null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, db_column='subject_id', null=True, blank=True)
    class_section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, db_column='class_section_id', null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, db_column='uploaded_by')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'
        managed = False

    def __str__(self):
        return self.name


# 11. CONVERSATIONS
class Conversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    title = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        managed = False


# 12. MESSAGES
class Message(models.Model):
    ROLE_CHOICES = [('user', 'User'), ('assistant', 'Assistant')]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, db_column='conversation_id')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    sources_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        managed = False


# 13. QUIZZES
class Quiz(models.Model):
    SOURCE_CHOICES = [('teacher_created', 'Teacher Created'), ('ai_generated', 'AI Generated')]

    title = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, db_column='subject_id', null=True, blank=True)
    class_section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, db_column='class_section_id', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, db_column='created_by')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='teacher_created')
    description = models.TextField(null=True, blank=True)
    chapter_label = models.CharField(max_length=255, null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quizzes'
        managed = False


# 14. QUIZ QUESTIONS
class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_column='quiz_id')
    question = models.TextField()
    option_a = models.TextField()
    option_b = models.TextField()
    option_c = models.TextField()
    option_d = models.TextField()
    correct_answer = models.CharField(max_length=1)
    explanation = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'quiz_questions'
        managed = False


# 15. QUIZ ATTEMPTS
class QuizAttempt(models.Model):
    STATUS_CHOICES = [('in_progress','In Progress'), ('submitted','Submitted'), ('graded','Graded')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, db_column='quiz_id')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='submitted')
    score = models.IntegerField(default=0)
    correct_count = models.IntegerField(null=True, blank=True)
    total_questions = models.IntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'quiz_attempts'
        managed = False
        unique_together = [('user', 'quiz')]


# 16. QUIZ ANSWERS
class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, db_column='attempt_id')
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, db_column='question_id')
    selected_answer = models.CharField(max_length=1, null=True, blank=True)
    is_correct = models.BooleanField(null=True)

    class Meta:
        db_table = 'quiz_answers'
        managed = False


# 17. EXAM SCHEDULES
class ExamSchedule(models.Model):
    EXAM_TYPE_CHOICES = [
        ('midterm', 'Midterm'), ('final', 'Final'),
        ('makeup', 'Makeup'), ('other', 'Other'),
    ]

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')
    class_section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, db_column='class_section_id', null=True, blank=True)
    exam_type = models.CharField(max_length=10, choices=EXAM_TYPE_CHOICES, default='final')
    exam_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_schedules'
        managed = False


# 18. SYSTEM SETTINGS
class SystemSetting(models.Model):
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.TextField()
    description = models.CharField(max_length=255, null=True, blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, db_column='updated_by', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_settings'
        managed = False

    def __str__(self):
        return f"{self.setting_key} = {self.setting_value}"


# 19. ANNOUNCEMENTS
class Announcement(models.Model):
    TARGET_CHOICES = [('all','All'), ('student','Student'), ('teacher','Teacher'), ('admin','Admin')]

    title = models.CharField(max_length=255)
    content = models.TextField()
    target_role = models.CharField(max_length=10, choices=TARGET_CHOICES, default='all')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, db_column='subject_id', null=True, blank=True)
    class_section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, db_column='class_section_id', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, db_column='created_by')
    is_active = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        managed = False


# 20. ANNOUNCEMENT READS
class AnnouncementRead(models.Model):
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, db_column='announcement_id', related_name='reads')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_reads'
        managed = False
        unique_together = [('announcement', 'user')]


# 21. PASSWORD RESETS
class PasswordReset(models.Model):
    email = models.CharField(max_length=150)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'password_resets'
        managed = False

