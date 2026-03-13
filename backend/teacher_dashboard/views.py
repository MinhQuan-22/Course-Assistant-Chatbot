from rest_framework.views import APIView
from rest_framework.response import Response

class TeacherDashboardView(APIView):
    def get(self, request):
        data = {
            "summary": {
                "recent_uploads": 12,
                "uploaded_files": 32,
                "students": 126,
                "quizzes": 8
            },
            "classes": [
                {
                    "code": "21020105",
                    "name": "Intro to Programming",
                    "progress": 0.55,
                    "students": 32,
                    "img": ""
                },
                {
                    "code": "21020106",
                    "name": "Web Fundamentals",
                    "progress": 0.65,
                    "students": 28,
                    "img": ""
                }
            ],
            "top_students": [
                {
                    "name": "Nguyen Van A",
                    "score": 95,
                    "avatar": "https://i.pravatar.cc/80?img=12",
                    "class_code": "21020105"
                },
                {
                    "name": "Tran Thi B",
                    "score": 91,
                    "avatar": "https://i.pravatar.cc/80?img=32",
                    "class_code": "21020106"
                }
            ],
            "activity": [
                {
                    "title": "New upload added",
                    "meta": "Lecture_Week3.pdf • 21020105",
                    "time": "2h ago"
                },
                {
                    "title": "Quiz submitted",
                    "meta": "Quiz 1 • 21020106",
                    "time": "5h ago"
                }
            ]
        }
        return Response(data)