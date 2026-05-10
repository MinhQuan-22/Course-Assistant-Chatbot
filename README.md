# Course Assistant Chatbot - 3N

## 📋 Giới thiệu tổng quan

**Course Assistant Chatbot (3N)** là hệ thống quản trị học tập (Learning Management System - LMS) kết hợp công nghệ trí tuệ nhân tạo RAG (Retrieval Augmented Generation) nhằm tự động hóa quá trình hỏi đáp của sinh viên dựa trên tài liệu học thuật được cung cấp bởi giảng viên.

Hệ thống được thiết kế để hỗ trợ ba vai trò chính:

- **Admin (Quản trị viên)**: Quản lý toàn bộ hệ thống, người dùng, môn học, lớp học
- **Teacher (Giảng viên)**: Quản lý tài liệu, tạo bài thi, theo dõi tiến độ sinh viên
- **Student (Sinh viên)**: Sử dụng Chat AI để học tập, làm bài thi, xem thông báo

---

## 🎯 Mục tiêu của hệ thống

1. **Tự động hóa hỗ trợ học tập**: Sinh viên có thể hỏi đáp với AI 24/7 về nội dung môn học
2. **Tăng hiệu quả giảng dạy**: Giảng viên có thể tập trung vào giảng dạy thay vì trả lời các câu hỏi lặp lại
3. **Quản lý tập trung**: Admin có thể quản lý toàn bộ hệ thống từ một nơi duy nhất
4. **Cá nhân hóa học tập**: Mỗi sinh viên có lịch sử hội thoại riêng và bài thi được gợi ý phù hợp

---

## ✨ Các tính năng chính

### 🔐 Dành cho Admin (Quản trị viên)

- **Dashboard tổng quan**: Xem thống kê tổng quan về số lượng người dùng, môn học, lớp học, tài liệu
- **Quản lý người dùng**: Thêm, sửa, xóa tài khoản sinh viên, giảng viên, admin
- **Quản lý môn học (Subjects)**: Tạo và quản lý các môn học trong hệ thống
- **Quản lý lớp học (Classes)**: Tạo và quản lý các lớp học theo môn, học kỳ, năm học
- **Phân công giảng dạy (Teaching Assignments)**: Phân công giảng viên dạy các lớp học
- **Ghi danh sinh viên (Enrollments)**: Ghi danh sinh viên vào các lớp học
- **Quản lý thông báo (Announcements)**: Tạo và gửi thông báo đến sinh viên/giảng viên
- **Quản lý lịch thi (Exam Schedules)**: Tạo và quản lý lịch thi giữa kỳ, cuối kỳ
- **Import dữ liệu hàng loạt**: Import người dùng, môn học, lớp học từ file Excel
- **Cấu hình AI Settings**: Cấu hình model AI, API key, chunk size, top-k results

### 👨‍🏫 Dành cho Teacher (Giảng viên)

- **Dashboard giảng viên**: Xem thống kê về lớp học được phân công
- **Quản lý tài liệu (Documents)**: Upload tài liệu môn học (PDF, DOCX) để hỗ trợ RAG
- **Quản lý lớp học**: Xem danh sách lớp học được phân công
- **Quản lý sinh viên**: Xem danh sách sinh viên trong lớp, theo dõi tiến độ
- **Tạo bài thi (Quizzes)**: Tạo bài thi trắc nghiệm cho sinh viên
- **Xem thống kê**: Xem thống kê về số lượng sinh viên, điểm trung bình, tỷ lệ hoàn thành

### 👨‍🎓 Dành cho Student (Sinh viên)

- **Chat AI với RAG**: Hỏi đáp với AI về nội dung môn học dựa trên tài liệu giảng viên cung cấp
- **Làm bài thi (Quizzes)**: Làm bài thi trắc nghiệm và xem kết quả ngay lập tức
- **Xem điểm số**: Xem điểm số các bài thi đã làm
- **Xem lịch thi**: Xem lịch thi sắp tới (giữa kỳ, cuối kỳ)
- **Xem thông báo**: Xem thông báo từ giảng viên và admin
- **Lịch sử hội thoại**: Xem lại các cuộc hội thoại với AI trước đó

---

## 🤖 Công nghệ RAG (Retrieval Augmented Generation)

Hệ thống sử dụng công nghệ RAG để cung cấp câu trả lời chính xác dựa trên tài liệu học thuật:

### Quy trình hoạt động:

1. **Upload tài liệu**: Giảng viên upload tài liệu (PDF, DOCX) vào hệ thống
2. **Xử lý tài liệu tự động**:
   - Parse nội dung tài liệu (text extraction)
   - Chia nhỏ thành các chunks (chunking)
   - Tạo embeddings (vector hóa) bằng Sentence Transformers
   - Lưu vào ChromaDB (Vector Store)
3. **Truy vấn thông minh**:
   - Khi sinh viên hỏi, hệ thống tìm kiếm các chunks liên quan nhất
   - Sử dụng Hybrid Search (Semantic + Keyword) với RRF (Reciprocal Rank Fusion)
   - Gửi context + câu hỏi đến AI model (OpenAI GPT hoặc Google Gemini)
4. **Trả lời chính xác**: AI trả lời dựa trên context từ tài liệu, kèm theo nguồn tham khảo

### Ưu điểm của RAG:

- ✅ Câu trả lời chính xác dựa trên tài liệu thực tế
- ✅ Giảm thiểu hallucination (AI bịa đặt thông tin)
- ✅ Có thể trích dẫn nguồn (document name, page number)
- ✅ Cập nhật kiến thức dễ dàng (chỉ cần upload tài liệu mới)

---

## 🛠️ Công nghệ sử dụng

### Frontend

- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.19
- **Language**: TypeScript 5.8.3
- **UI Library**: Radix UI + Tailwind CSS 3.4.17
- **State Management**: React Context API
- **Routing**: React Router DOM 6.30.1
- **HTTP Client**: Fetch API
- **Form Handling**: React Hook Form 7.61.1
- **Charts**: Recharts 2.15.4

### Backend

- **Framework**: Django 5.2.13
- **Language**: Python 3.9+
- **Database**: MySQL 8.0+
- **ORM**: Django ORM
- **Authentication**: JWT (PyJWT 2.12.1) + Google OAuth
- **Password Hashing**: bcrypt 5.0.0
- **CORS**: django-cors-headers 4.9.0

### AI & Machine Learning

- **LLM Integration**: LangChain OpenAI 0.2.14
- **Embeddings**: Sentence Transformers 5.4.1
- **Vector Database**: ChromaDB 1.5.7
- **ML Framework**: PyTorch 2.11.0
- **Transformers**: Hugging Face Transformers 5.5.4

### Document Processing

- **PDF**: pypdf 6.10.1
- **DOCX**: python-docx 1.2.0
- **Excel**: openpyxl 3.1.5

### Deployment & DevOps

- **Web Server**: Uvicorn 0.44.0 (ASGI)
- **Process Manager**: Threading (Python)
- **Environment**: python-dotenv 1.2.2

---

## 📊 Cơ sở dữ liệu

Hệ thống sử dụng **MySQL 8.0+** với 21 bảng chính:

### Quản lý người dùng

- `users` - Thông tin người dùng (admin, teacher, student)
- `teacher_profiles` - Thông tin chi tiết giảng viên
- `student_profiles` - Thông tin chi tiết sinh viên
- `password_resets` - Quản lý reset mật khẩu

### Quản lý học thuật

- `subjects` - Môn học
- `class_sections` - Lớp học
- `teaching_assignments` - Phân công giảng dạy
- `enrollments` - Ghi danh sinh viên
- `exam_schedules` - Lịch thi

### Quản lý tài liệu & RAG

- `documents` - Tài liệu học thuật
- `conversations` - Cuộc hội thoại với AI
- `messages` - Tin nhắn trong cuộc hội thoại

### Quản lý bài thi

- `quizzes` - Bài thi trắc nghiệm
- `quiz_questions` - Câu hỏi trong bài thi
- `quiz_attempts` - Lần làm bài của sinh viên
- `quiz_answers` - Câu trả lời của sinh viên

### Quản lý hệ thống

- `system_settings` - Cấu hình hệ thống
- `announcements` - Thông báo
- `announcement_reads` - Theo dõi đã đọc thông báo
- `import_batches` - Batch import dữ liệu
- `import_batch_errors` - Lỗi khi import

---

## 🎨 Giao diện người dùng

Hệ thống có giao diện hiện đại, responsive, hỗ trợ dark mode:

- **Trang đăng nhập**: Hỗ trợ đăng nhập bằng email/username hoặc Google OAuth
- **Dashboard**: Hiển thị thống kê trực quan với biểu đồ
- **Sidebar Navigation**: Menu điều hướng dễ sử dụng
- **Chat Interface**: Giao diện chat thân thiện, hỗ trợ streaming response
- **Quiz Interface**: Giao diện làm bài thi trực quan, hiển thị kết quả ngay lập tức
- **Admin Panel**: Giao diện quản trị mạnh mẽ với các bảng dữ liệu, form, modal

---

## 📦 Cấu trúc thư mục

```
course-assistant-chatbot/
├── backend/                          # Django Backend
│   ├── config/                       # Django configuration
│   │   ├── settings.py               # Settings chính
│   │   ├── urls.py                   # URL routing
│   │   └── wsgi.py                   # WSGI config
│   ├── core/                         # Main application
│   │   ├── services/                 # Business logic
│   │   │   ├── rag_service.py        # RAG pipeline
│   │   │   ├── vector_store.py       # ChromaDB integration
│   │   │   ├── chunking.py           # Text chunking
│   │   │   ├── quiz_service.py       # Quiz generation
│   │   │   ├── document_ingestion.py # Document processing
│   │   │   └── file_parser.py        # File parsing (PDF, DOCX)
│   │   ├── views.py                  # API endpoints (auth, chat)
│   │   ├── views_admin.py            # Admin endpoints
│   │   ├── views_admin_academic.py   # Academic management
│   │   ├── views_student.py          # Student endpoints
│   │   ├── views_teacher.py          # Teacher endpoints
│   │   ├── models.py                 # Database models
│   │   ├── auth_utils.py             # Authentication utilities
│   │   └── urls.py                   # URL routing
│   ├── db/                           # Database scripts
│   │   ├── schema.sql                # Database schema
│   │   └── seed.sql                  # Seed data
│   ├── uploads/                      # Uploaded documents
│   ├── requirements.txt              # Python dependencies
│   └── manage.py                     # Django CLI
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── chat/                 # Chat components
│   │   │   ├── ui/                   # UI components (shadcn)
│   │   │   ├── AppLayout.tsx         # Main layout
│   │   │   └── AppSidebar.tsx        # Sidebar navigation
│   │   ├── pages/                    # Page components
│   │   │   ├── ChatPage.tsx          # Chat interface
│   │   │   ├── AdminDashboard.tsx    # Admin dashboard
│   │   │   ├── AdminUsersPage.tsx    # User management
│   │   │   ├── AdminAcademicPage.tsx # Academic management
│   │   │   ├── TeacherDashboard.tsx  # Teacher dashboard
│   │   │   └── StudentDashboard.tsx  # Student dashboard
│   │   ├── contexts/                 # React contexts
│   │   │   ├── AuthContext.tsx       # Authentication context
│   │   │   └── DialogContext.tsx     # Dialog context
│   │   ├── lib/                      # Utilities
│   │   │   └── utils.ts              # Helper functions
│   │   ├── App.tsx                   # Main app component
│   │   └── main.tsx                  # Entry point
│   ├── package.json                  # Node.js dependencies
│   ├── vite.config.ts                # Vite configuration
│   └── tailwind.config.js            # Tailwind CSS config
├── README.md                         # Giới thiệu tổng quan (file này)
└── README.txt                        # Hướng dẫn cài đặt chi tiết
```

---

## 🚀 Hướng dẫn cài đặt

Vui lòng xem file **README.txt** để biết hướng dẫn cài đặt chi tiết từng bước.

### Tóm tắt các bước:

1. **Cài đặt Prerequisites**: Node.js, Python, MySQL
2. **Cài đặt Database**: Tạo database, import schema và seed data
3. **Cài đặt Backend**: Tạo virtual environment, cài đặt dependencies, chạy server
4. **Cài đặt Frontend**: Cài đặt npm packages, chạy dev server
5. **Truy cập hệ thống**: Mở trình duyệt tại http://localhost:8080

---

## 🔑 Tài khoản đăng nhập mẫu

Tất cả tài khoản đều có mật khẩu: **123456**

| Vai trò | Email / Username                             | Mật khẩu |
| ------- | -------------------------------------------- | -------- |
| Admin   | admin.3n@tdtu.edu.vn hoặc admin.3n           | 123456   |
| Teacher | tuan.tran@tdtu.edu.vn hoặc tuan.tran         | 123456   |
| Teacher | hoa.le@tdtu.edu.vn hoặc hoa.le               | 123456   |
| Student | an.nguyen@student.tdtu.edu.vn hoặc an.nguyen | 123456   |
| Student | binh.pham@student.tdtu.edu.vn hoặc binh.pham | 123456   |
| Student | chi.vo@student.tdtu.edu.vn hoặc chi.vo       | 123456   |

---

## 🎥 Video Demo

Xem video demo đầy đủ các tính năng của hệ thống tại:
👉 **https://youtu.be/DdiXt_2HFug?si=pJHVW5sr3c_kaSHm**

---

## 📝 Ghi chú

- Hệ thống đã được tối ưu hóa để giảm dung lượng từ ~1.5GB xuống còn ~37MB (giảm 97.5%)
- Các thư mục `venv/`, `node_modules/`, `dist/` đã được xóa để giảm dung lượng
- Cần chạy lại `pip install` và `npm install` để cài đặt dependencies
- Hệ thống hỗ trợ cả OpenAI GPT và Google Gemini (cấu hình trong Admin Settings)
- ChromaDB cần được chạy riêng hoặc sử dụng HTTP client (đã cấu hình sẵn)

---

## 📧 Liên hệ

Nếu có bất kỳ câu hỏi nào về hệ thống, vui lòng liên hệ:

- **Email**: admin.3n@tdtu.edu.vn

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.

---

**Cảm ơn thầy/cô đã dành thời gian đánh giá dự án!**

**Chúc thầy/cô có trải nghiệm tốt với hệ thống Course Assistant Chatbot - 3N.**
