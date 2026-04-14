import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Conversation, Message
import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.views.decorators.http import require_http_methods
from .models import Document
from .services.document_ingestion import ingest_document
import threading
from .models import User
from .auth_utils import check_password, create_jwt_token, hash_password, decode_jwt_token
from .services.rag_service import generate_answer


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


@csrf_exempt
def send_chat_message(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
        user_id = body.get("user_id")
        conversation_id = body.get("conversation_id")
        content = body.get("content", "").strip()

        if not user_id or not content:
            return JsonResponse({"error": "user_id and content are required"}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)

        conversation = None

        if conversation_id:
            conversation = Conversation.objects.filter(id=conversation_id, user=user).first()

        if not conversation:
            title = content[:60]
            conversation = Conversation.objects.create(
                user=user,
                title=title
            )

        user_message = Message.objects.create(
            conversation=conversation,
            role="user",
            content=content
        )

        rag_result = generate_answer(content)

        assistant_message = Message.objects.create(
            conversation=conversation,
            role="assistant",
            content=rag_result["answer"],
            sources_json=rag_result["sources"]
        )

        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])

        return JsonResponse({
            "message": "Chat message processed successfully",
            "conversation_id": conversation.id,
            "user_message": {
                "id": user_message.id,
                "role": user_message.role,
                "content": user_message.content,
                "created_at": user_message.created_at.isoformat(),
            },
            "assistant_message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "sources_json": assistant_message.sources_json,
                "created_at": assistant_message.created_at.isoformat(),
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def get_conversations(request):
    user_id = request.GET.get("user_id")

    if not user_id:
        return JsonResponse({"error": "user_id is required"}, status=400)

    try:
        conversations = Conversation.objects.filter(user_id=user_id).order_by("-updated_at")

        data = []
        for conv in conversations:
            last_message = Message.objects.filter(conversation=conv).order_by("-created_at").first()
            message_count = Message.objects.filter(conversation=conv).count()

            data.append({
                "id": conv.id,
                "title": conv.title,
                "user_id": conv.user_id,
                "last_message": last_message.content if last_message else "",
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "message_count": message_count,
            })

        return JsonResponse(data, safe=False, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def get_conversation_messages(request, conversation_id):
    try:
        conversation = Conversation.objects.filter(id=conversation_id).first()

        if not conversation:
            return JsonResponse({"error": "Conversation not found"}, status=404)

        messages = Message.objects.filter(conversation=conversation).order_by("created_at")

        data = {
            "conversation": {
                "id": conversation.id,
                "title": conversation.title,
                "user_id": conversation.user_id,
                "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
                "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
            },
            "messages": []
        }

        for msg in messages:
            data["messages"].append({
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "sources_json": msg.sources_json,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            })

        return JsonResponse(data, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

@csrf_exempt
@require_http_methods(["GET"])
def get_documents(request):
    try:
        documents = Document.objects.all().order_by("-uploaded_at")

        data = []
        for doc in documents:
            data.append({
                "id": doc.id,
                "name": doc.name,
                "file_path": doc.file_path,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "uploaded_by": doc.uploaded_by_id,
                "status": doc.status,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            })

        return JsonResponse(data, safe=False, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def process_document_ingestion(document_id):
    try:
        document = Document.objects.filter(id=document_id).first()
        if not document:
            return

        ingestion_result = ingest_document(document)
        document.status = "ready"
        document.save(update_fields=["status"])

        print(f"Ingestion completed for document {document.id}: {ingestion_result}")

    except Exception as ingest_error:
        document = Document.objects.filter(id=document_id).first()
        if document:
            document.status = "error"
            document.save(update_fields=["status"])

        print(f"Ingestion error for document {document_id}: {str(ingest_error)}")

@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request):
    try:
        uploaded_file = request.FILES.get("file")
        uploaded_by = request.POST.get("uploaded_by")

        if not uploaded_file:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        if not uploaded_by:
            return JsonResponse({"error": "uploaded_by is required"}, status=400)

        user = User.objects.filter(id=uploaded_by).first()
        if not user:
            return JsonResponse({"error": "Uploader not found"}, status=404)

        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

        fs = FileSystemStorage(location=settings.MEDIA_ROOT)
        saved_name = fs.save(uploaded_file.name, uploaded_file)
        saved_path = fs.path(saved_name)

        ext = os.path.splitext(uploaded_file.name)[1].replace(".", "").upper()

        document = Document.objects.create(
            name=uploaded_file.name,
            file_path=saved_path,
            file_type=ext if ext else "UNKNOWN",
            file_size=uploaded_file.size,
            uploaded_by=user,
            status="processing",
        )

        thread = threading.Thread(
            target=process_document_ingestion,
            args=(document.id,),
            daemon=True,
        )
        thread.start()

        return JsonResponse({
            "message": "Document uploaded successfully. Processing started.",
            "document": {
                "id": document.id,
                "name": document.name,
                "file_path": document.file_path,
                "file_type": document.file_type,
                "file_size": document.file_size,
                "uploaded_by": document.uploaded_by_id,
                "status": document.status,
                "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
            }
        }, status=201)

    except Exception as e:
        print("Upload error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)