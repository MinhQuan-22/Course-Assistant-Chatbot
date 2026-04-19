from django.urls import path
from .views import (
    register_user, login_user, google_login, get_me, get_users,
    send_chat_message, send_chat_message_stream, get_conversations, get_conversation_messages,
    delete_conversation, get_documents, upload_document, generate_quiz_api,
    forgot_password, verify_otp, reset_password, get_stats,
)
from .views_admin import (
    admin_users, admin_user_detail, admin_stats,
    admin_audit_profiles, admin_audit_fix_profiles,
)
from .views_admin_import import admin_import_excel
from .views_admin_academic import (
    # subjects
    admin_subjects, admin_subject_detail,
    # class sections
    admin_class_sections, admin_class_section_detail,
    # teaching assignments
    admin_teaching_assignments, admin_teaching_assignment_detail,
    # enrollments
    admin_enrollments, admin_enrollment_detail,
    # profiles (dropdown helpers)
    admin_teacher_profiles, admin_student_profiles,
    # documents (JWT-based admin flow)
    admin_documents, admin_document_upload, admin_document_detail,
    # settings
    admin_settings,
    # exam schedules
    admin_exam_schedules, admin_exam_schedule_detail,
    # announcements
    admin_announcements, admin_announcement_detail,
    admin_announcement_mark_read, admin_announcements_mark_all_read,
    admin_announcements_sse,
)
from .views_teacher import (
    teacher_stats, teacher_quizzes, teacher_quiz_detail,
    teacher_quiz_questions, teacher_quiz_question_detail,
    teacher_quizzes_generate_ai
)
from .views_student import (
    student_subjects, student_quizzes, student_quiz_detail
)

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/register/', register_user),
    path('auth/signup/', register_user),
    path('auth/login/',    login_user),
    path('auth/google/',   google_login),
    path('auth/me/',       get_me),
    path('auth/forgot-password/', forgot_password),
    path('auth/verify-otp/', verify_otp),
    path('auth/reset-password/', reset_password),

    # ── Users (generic, public for chat) ──────────────────────────────────────
    path('users/', get_users),

    # ── Admin: User management ────────────────────────────────────────────────
    path('admin/users/',               admin_users),
    path('admin/users/<int:user_id>/', admin_user_detail),
    path('admin/import-excel/<str:entity_type>/', admin_import_excel),
    path('admin/stats/',               admin_stats),

    # ── Admin: Profile audit ──────────────────────────────────────────────────
    path('admin/audit/profiles/',     admin_audit_profiles),
    path('admin/audit/fix-profiles/', admin_audit_fix_profiles),

    # ── Admin: Subjects ───────────────────────────────────────────────────────
    path('admin/subjects/',                   admin_subjects),
    path('admin/subjects/<int:subject_id>/',  admin_subject_detail),

    # ── Admin: Class Sections ─────────────────────────────────────────────────
    path('admin/class-sections/',                     admin_class_sections),
    path('admin/class-sections/<int:section_id>/',    admin_class_section_detail),

    # ── Admin: Teaching Assignments ───────────────────────────────────────────
    path('admin/teaching-assignments/',                         admin_teaching_assignments),
    path('admin/teaching-assignments/<int:assignment_id>/',     admin_teaching_assignment_detail),

    # ── Admin: Enrollments ────────────────────────────────────────────────────
    path('admin/enrollments/',                      admin_enrollments),
    path('admin/enrollments/<int:enrollment_id>/',  admin_enrollment_detail),

    # ── Admin: Profiles (dropdown helpers) ────────────────────────────────────
    path('admin/teacher-profiles/', admin_teacher_profiles),
    path('admin/student-profiles/', admin_student_profiles),

    # ── Admin: Documents (JWT-secured, enhanced) ─────────────────────────────────────────
    path('admin/documents/',                  admin_documents),
    path('admin/documents/upload/',           admin_document_upload),
    path('admin/documents/<int:doc_id>/',     admin_document_detail),

    # ── Admin: System settings ────────────────────────────────────────────────
    path('admin/settings/', admin_settings),

    # ── Admin: Exam Schedules ─────────────────────────────────────────────────
    path('admin/exam-schedules/',                  admin_exam_schedules),
    path('admin/exam-schedules/<int:exam_id>/',    admin_exam_schedule_detail),

    # ── Admin: Announcements (SSE + read tracking) ─────────────────────────────────────
    path('admin/announcements/',                         admin_announcements),
    path('admin/announcements/read-all/',                admin_announcements_mark_all_read),
    path('admin/announcements/stream/',                  admin_announcements_sse),
    path('admin/announcements/<int:ann_id>/',            admin_announcement_detail),
    path('admin/announcements/<int:ann_id>/read/',       admin_announcement_mark_read),

    # ── Chat ──────────────────────────────────────────────────────────────────
    path('chat/send/',             send_chat_message),
    path('chat/send-stream/',      send_chat_message_stream),
    path('chat/conversations/',    get_conversations),
    path('chat/conversations/<int:conversation_id>/', get_conversation_messages),
    path('chat/conversations/<int:conversation_id>/delete/', delete_conversation),

    # ── Documents (public/legacy)  ────────────────────────────────────────────
    path('documents/',         get_documents),
    path('documents/upload/',  upload_document),

    # ── Teacher ───────────────────────────────────────────────────────────────
    path('teacher/stats/', teacher_stats),
    path('teacher/quizzes/', teacher_quizzes),
    path('teacher/quizzes/generate-ai/', teacher_quizzes_generate_ai),
    path('teacher/quizzes/<int:quiz_id>/', teacher_quiz_detail),
    path('teacher/quizzes/<int:quiz_id>/questions/', teacher_quiz_questions),
    path('teacher/quizzes/<int:quiz_id>/questions/<int:question_id>/', teacher_quiz_question_detail),

    # ── Student ───────────────────────────────────────────────────────────────
    path('student/subjects/', student_subjects),
    path('student/quizzes/', student_quizzes),
    path('student/quizzes/<int:quiz_id>/', student_quiz_detail),

    # ── Quiz (legacy) ─────────────────────────────────────────────────────────
    path('quiz/generate/', generate_quiz_api),
    
    # ── Stats (generic) ───────────────────────────────────────────────────────
    path('stats/', get_stats),
]