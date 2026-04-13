import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .models import User
from .auth_utils import check_password, create_jwt_token, hash_password, decode_jwt_token


@csrf_exempt
def register_user(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
        name = body.get("name", "").strip()
        username = body.get("username", "").strip()
        email = body.get("email", "").strip()
        password = body.get("password", "").strip()
        role = body.get("role", "student").strip()

        if not name or not email or not password:
            return JsonResponse({"error": "Name, email, and password are required"}, status=400)

        if role not in ["student", "teacher", "admin"]:
            return JsonResponse({"error": "Invalid role"}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already exists"}, status=400)

        if username and User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already exists"}, status=400)

        user = User.objects.create(
            name=name,
            username=username if username else None,
            email=email,
            password=hash_password(password),
            role=role,
            is_active=True,
        )

        return JsonResponse({
            "message": "User registered successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            }
        }, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def login_user(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
        identifier = body.get("identifier", "").strip()   # email or username
        password = body.get("password", "").strip()

        if not identifier or not password:
            return JsonResponse({"error": "Identifier and password are required"}, status=400)

        user = User.objects.filter(email=identifier).first()
        if not user:
            user = User.objects.filter(username=identifier).first()

        if not user:
            return JsonResponse({"error": "Invalid credentials"}, status=401)

        if not user.is_active:
            return JsonResponse({"error": "Account is inactive"}, status=403)

        if not check_password(password, user.password):
            return JsonResponse({"error": "Invalid credentials"}, status=401)

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        token = create_jwt_token(user)

        return JsonResponse({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def get_me(request):
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return JsonResponse({"error": "Authorization token required"}, status=401)

    token = auth_header.split(" ")[1]
    payload = decode_jwt_token(token)

    if not payload:
        return JsonResponse({"error": "Invalid or expired token"}, status=401)

    user = User.objects.filter(id=payload["user_id"]).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    return JsonResponse({
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }
    }, status=200)


def get_users(request):
    users = User.objects.all()

    data = []
    for user in users:
        data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        })

    return JsonResponse(data, safe=False)