import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import User, TeacherProfile, StudentProfile

admin = User.objects.get(role='admin')
if not hasattr(admin, 'teacher_profile') and not hasattr(admin, 'student_profile'):
    print("Admin profile ok")
