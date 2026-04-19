import os
import django
import json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import RequestFactory
from core.views_admin_announcements_exams import admin_announcements, admin_exam_schedules
from core.models import User
from core.auth_utils import create_jwt_token

admin = User.objects.get(role='admin')
token = create_jwt_token(admin)

factory = RequestFactory()
req = factory.get('/api/admin/announcements/', HTTP_AUTHORIZATION=f'Bearer {token}')
res = admin_announcements(req)
print("Announcements:", json.loads(res.content))

req2 = factory.get('/api/admin/exam-schedules/', HTTP_AUTHORIZATION=f'Bearer {token}')
res2 = admin_exam_schedules(req2)
print("Exams:", json.loads(res2.content))
