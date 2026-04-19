import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import User, StudentProfile, Enrollment

user = User.objects.filter(name="Nguyen Van An").first()
print(f"User: {user.name}, ID: {user.id}")

sp = StudentProfile.objects.filter(user=user).first()
if sp:
    print(f"StudentProfile: {sp.student_code}")
    enrollments = Enrollment.objects.filter(student_profile=sp)
    for e in enrollments:
        print(f"Enrolled in: {e.class_section.subject.name} (Status: {e.status})")
else:
    print("No StudentProfile found!")

