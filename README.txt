================================================================================
                    HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY PROJECT
                    COURSE ASSISTANT CHATBOT - HỆ THỐNG LMS KẾT HỢP AI
================================================================================

📋 MÔ TẢ DỰ ÁN
--------------------------------------------------------------------------------
Course Assistant Chatbot là hệ thống quản trị học tập (LMS) kết hợp công nghệ 
AI (RAG - Retrieval Augmented Generation) giúp tự động hóa quá trình hỏi đáp 
của sinh viên dựa trên tài liệu học thuật được cung cấp bởi giảng viên.

Hệ thống bao gồm:
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Django (Python) + MySQL + ChromaDB (Vector Store)
- AI: RAG với embeddings và vector search


🎥 VIDEO DEMO HỆ THỐNG
--------------------------------------------------------------------------------
Xem video demo đầy đủ các tính năng của hệ thống tại:
👉 https://youtu.be/DdiXt_2HFug?si=pJHVW5sr3c_kaSHm

Video bao gồm:
- Hướng dẫn đăng nhập với các vai trò khác nhau (Admin, Teacher, Student)
- Demo các tính năng chính của hệ thống
- Hướng dẫn sử dụng tính năng Chat AI với RAG
- Hướng dẫn tạo và quản lý Quiz
- Hướng dẫn upload và quản lý tài liệu


================================================================================
                        YÊU CẦU HỆ THỐNG (PREREQUISITES)
================================================================================

Trước khi cài đặt, máy tính cần có sẵn:

✅ Node.js (phiên bản 18 trở lên)
   - Kiểm tra: node --version
   - Tải tại: https://nodejs.org/

✅ Python (phiên bản 3.9 trở lên)
   - Kiểm tra: python --version hoặc python3 --version
   - Tải tại: https://www.python.org/downloads/

✅ MySQL Server (phiên bản 8.0 trở lên)
   - Kiểm tra: mysql --version
   - Tải tại: https://dev.mysql.com/downloads/mysql/

✅ pip (Python package manager)
   - Kiểm tra: pip --version hoặc pip3 --version


================================================================================
                    LƯU Ý QUAN TRỌNG VỀ CÁC THỨ MỤC ĐÃ XÓA
================================================================================

⚠️ Để giảm dung lượng project trên server, các thư mục sau đã được xóa:

1. backend/venv/ - Virtual environment Python (~1.2GB)
   → Cần tạo lại bằng lệnh: python -m venv venv

2. frontend/node_modules/ - Dependencies Node.js (~287MB)
   → Cần cài lại bằng lệnh: npm install

3. frontend/dist/ - Build output (~704KB)
   → Sẽ tự động tạo khi chạy: npm run dev

4. Các file __pycache__/ - Python cache files
   → Sẽ tự động tạo khi chạy Backend

5. Các file .DS_Store - macOS system files
   → Không cần thiết cho project

📊 KẾT QUẢ: Dung lượng project giảm từ ~1.5GB xuống còn ~42MB (giảm 97%)

LƯU Ý: Các bước cài đặt bên dưới đã bao gồm việc tạo lại các thư mục này.


================================================================================
                    BƯỚC 1: CÀI ĐẶT CƠ SỞ DỮ LIỆU (DATABASE)
================================================================================

1.1. Khởi động MySQL Server
----------------------------
Đảm bảo MySQL Server đang chạy trên máy tính.

Windows: Mở Services và khởi động MySQL80
macOS/Linux: sudo systemctl start mysql


1.2. Đăng nhập vào MySQL
-------------------------
Mở Terminal/Command Prompt và chạy lệnh:

mysql -u root -p

(Nhập mật khẩu root của MySQL khi được yêu cầu)


1.3. Tạo cơ sở dữ liệu
-----------------------
Trong MySQL shell, chạy lệnh:

CREATE DATABASE course_assistant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;


1.4. Import cấu trúc bảng (Schema)
----------------------------------
Quay lại Terminal/Command Prompt, di chuyển đến thư mục project:

cd [đường_dẫn_đến_thư_mục_project]

Sau đó import schema:

mysql -u root -p course_assistant_db < backend/db/schema.sql

(Nhập mật khẩu root khi được yêu cầu)


1.5. Import dữ liệu mẫu (Seed Data)
-----------------------------------
mysql -u root -p course_assistant_db < backend/db/seed.sql

(Nhập mật khẩu root khi được yêu cầu)


1.6. Cấu hình kết nối Database trong Backend
---------------------------------------------
Mở file: backend/config/settings.py

Tìm phần DATABASES và điều chỉnh thông tin kết nối:

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'course_assistant_db',
        'USER': 'root',                    # ← Thay đổi nếu dùng user khác
        'PASSWORD': 'root',                # ← Thay đổi theo mật khẩu MySQL của bạn
        'HOST': '127.0.0.1',
        'PORT': '3307',                    # ← Thay đổi nếu MySQL chạy port khác (mặc định: 3306)
    }
}

LƯU Ý: 
- Nếu MySQL chạy trên port mặc định 3306, đổi PORT thành '3306'
- Nếu mật khẩu root của MySQL khác 'root', hãy thay đổi PASSWORD


================================================================================
                    BƯỚC 2: CÀI ĐẶT VÀ CHẠY BACKEND (DJANGO)
================================================================================

2.1. Di chuyển vào thư mục backend
-----------------------------------
cd backend


2.2. Tạo môi trường ảo (Virtual Environment)
---------------------------------------------
Windows:
    python -m venv venv
    .\venv\Scripts\activate

macOS/Linux:
    python3 -m venv venv
    source venv/bin/activate

Sau khi kích hoạt, bạn sẽ thấy (venv) xuất hiện ở đầu dòng lệnh.


2.3. Cài đặt các thư viện Python
---------------------------------
pip install -r requirements.txt

(Quá trình này có thể mất vài phút)


2.4. Khởi chạy Backend Server
------------------------------
python manage.py runserver

Backend sẽ chạy tại: http://localhost:8000/

LƯU Ý: Giữ cửa sổ Terminal này mở để Backend tiếp tục chạy.


================================================================================
                    BƯỚC 3: CÀI ĐẶT VÀ CHẠY FRONTEND (REACT)
================================================================================

3.1. Mở Terminal/Command Prompt MỚI
------------------------------------
(Giữ Terminal của Backend đang chạy, mở terminal mới)


3.2. Di chuyển vào thư mục frontend
------------------------------------
cd [đường_dẫn_đến_thư_mục_project]/frontend


3.3. Cài đặt các gói thư viện Node.js
--------------------------------------
npm install

(Quá trình này có thể mất vài phút)


3.4. Khởi chạy Frontend Server
-------------------------------
npm run dev

Frontend sẽ chạy tại: http://localhost:8080/

LƯU Ý: Giữ cửa sổ Terminal này mở để Frontend tiếp tục chạy.


================================================================================
                    BƯỚC 4: TRUY CẬP HỆ THỐNG
================================================================================

Mở trình duyệt web và truy cập:

🌐 http://localhost:8080/

Hệ thống sẽ hiển thị trang đăng nhập.


================================================================================
                    TÀI KHOẢN ĐĂNG NHẬP (TEST CREDENTIALS)
================================================================================

Các tài khoản sau đã được tạo sẵn với mật khẩu chung là: 123456

┌─────────────────┬──────────────────────────────────┬──────────┬─────────────────────────────────────┐
│ VAI TRÒ         │ EMAIL / USERNAME                 │ MẬT KHẨU │ TÍNH NĂNG CHÍNH                     │
├─────────────────┼──────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ ADMIN           │ admin.3n@tdtu.edu.vn             │ 123456   │ - Dashboard tổng quan               │
│ (Quản trị viên) │ hoặc: admin.3n                   │          │ - Quản lý tài khoản                 │
│                 │                                  │          │ - Thiết lập Settings AI             │
│                 │                                  │          │ - Quản lý Subject/Class             │
│                 │                                  │          │ - Quản lý thông báo                 │
│                 │                                  │          │ - Quản lý lịch thi                  │
│                 │                                  │          │ - Import dữ liệu hàng loạt          │
├─────────────────┼──────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ TEACHER         │ tuan.tran@tdtu.edu.vn            │ 123456   │ - Quản lý tài liệu (RAG)            │
│ (Giảng viên)    │ hoặc: tuan.tran                  │          │ - Quản lý lớp được phân công        │
│                 │                                  │          │ - Xem thống kê sinh viên            │
│                 │                                  │          │ - Tạo bài thi (Quiz)                │
│                 │                                  │          │ - Upload tài liệu môn học           │
├─────────────────┼──────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ TEACHER         │ hoa.le@tdtu.edu.vn               │ 123456   │ - Tương tự như tài khoản Teacher    │
│ (Giảng viên)    │ hoặc: hoa.le                     │          │   bên trên (dành cho môn học khác)  │
├─────────────────┼──────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ STUDENT         │ an.nguyen@student.tdtu.edu.vn    │ 123456   │ - Chat AI hỏi đáp khóa học          │
│ (Sinh viên)     │ hoặc: an.nguyen                  │          │ - Làm bài Quiz                      │
│                 │                                  │          │ - Xem lịch thi/thông báo            │
│                 │                                  │          │ - Xem điểm số                       │
└─────────────────┴──────────────────────────────────┴──────────┴─────────────────────────────────────┘

CÁCH ĐĂNG NHẬP:
---------------
1. Truy cập: http://localhost:8080/
2. Nhập Email hoặc Username (ví dụ: admin.3n hoặc admin.3n@tdtu.edu.vn)
3. Nhập mật khẩu: 123456
4. Click "Đăng nhập"


================================================================================
                    KIỂM TRA HỆ THỐNG HOẠT ĐỘNG
================================================================================

✅ Backend đang chạy:
   - Truy cập: http://localhost:8000/
   - Nếu thấy trang Django, Backend đã hoạt động

✅ Frontend đang chạy:
   - Truy cập: http://localhost:8080/
   - Nếu thấy trang đăng nhập, Frontend đã hoạt động

✅ Database đã được import:
   - Đăng nhập bằng tài khoản admin.3n / 123456
   - Nếu đăng nhập thành công, Database đã sẵn sàng


================================================================================
                    CÁC TÍNH NĂNG CHÍNH CỦA HỆ THỐNG
================================================================================

🔐 ADMIN (Quản trị viên)
------------------------
- Dashboard: Xem thống kê tổng quan (số lượng user, môn học, lớp học)
- Quản lý Users: Thêm/sửa/xóa tài khoản sinh viên, giảng viên, admin
- Quản lý Subjects: Thêm/sửa/xóa môn học
- Quản lý Classes: Thêm/sửa/xóa lớp học
- Quản lý Teaching Assignments: Phân công giảng viên dạy lớp
- Quản lý Enrollments: Ghi danh sinh viên vào lớp
- Quản lý Announcements: Tạo thông báo cho sinh viên/giảng viên
- Quản lý Exam Schedules: Tạo lịch thi
- Import Data: Import hàng loạt từ file Excel
- AI Settings: Cấu hình model AI, chunk size, top-k results


👨‍🏫 TEACHER (Giảng viên)
--------------------------
- Dashboard: Xem thống kê lớp học được phân công
- Quản lý Documents: Upload tài liệu môn học (PDF, DOCX) để hỗ trợ RAG
- Quản lý Classes: Xem danh sách lớp được phân công
- Quản lý Students: Xem danh sách sinh viên trong lớp
- Quản lý Quizzes: Tạo bài thi trắc nghiệm
- Xem thống kê: Số lượng sinh viên, điểm trung bình


👨‍🎓 STUDENT (Sinh viên)
--------------------------
- Chat AI: Hỏi đáp với AI về nội dung môn học (RAG)
- Làm Quiz: Làm bài thi trắc nghiệm
- Xem điểm: Xem điểm số các bài thi
- Xem lịch thi: Xem lịch thi sắp tới
- Xem thông báo: Xem thông báo từ giảng viên/admin


================================================================================
                    CÔNG NGHỆ RAG (RETRIEVAL AUGMENTED GENERATION)
================================================================================

Hệ thống sử dụng công nghệ RAG để cung cấp câu trả lời chính xác dựa trên 
tài liệu học thuật:

1. Giảng viên upload tài liệu (PDF, DOCX) vào hệ thống
2. Hệ thống tự động:
   - Parse nội dung tài liệu
   - Chia nhỏ thành các chunks
   - Tạo embeddings (vector hóa)
   - Lưu vào ChromaDB (Vector Store)
3. Khi sinh viên hỏi:
   - Hệ thống tìm kiếm các chunks liên quan nhất
   - Gửi context + câu hỏi đến AI model
   - AI trả lời dựa trên context từ tài liệu


================================================================================
                    TROUBLESHOOTING (XỬ LÝ LỖI THƯỜNG GẶP)
================================================================================

❌ LỖI: "Can't connect to MySQL server"
----------------------------------------
NGUYÊN NHÂN: MySQL Server chưa khởi động hoặc cấu hình sai
GIẢI PHÁP:
1. Kiểm tra MySQL đang chạy: mysql --version
2. Khởi động MySQL Server
3. Kiểm tra lại thông tin kết nối trong backend/config/settings.py
   - USER: 'root' (hoặc user của bạn)
   - PASSWORD: 'root' (hoặc password của bạn)
   - PORT: '3306' hoặc '3307'


❌ LỖI: "Access denied for user 'root'@'localhost'"
----------------------------------------------------
NGUYÊN NHÂN: Mật khẩu MySQL không đúng
GIẢI PHÁP:
1. Mở file backend/config/settings.py
2. Thay đổi PASSWORD trong DATABASES thành mật khẩu MySQL của bạn


❌ LỖI: "Port 8000 is already in use"
--------------------------------------
NGUYÊN NHÂN: Port 8000 đã được sử dụng bởi ứng dụng khác
GIẢI PHÁP:
1. Tắt ứng dụng đang sử dụng port 8000
2. Hoặc chạy Backend trên port khác:
   python manage.py runserver 8001


❌ LỖI: "Port 8080 is already in use"
--------------------------------------
NGUYÊN NHÂN: Port 8080 đã được sử dụng bởi ứng dụng khác
GIẢI PHÁP:
1. Tắt ứng dụng đang sử dụng port 8080
2. Hoặc mở file frontend/vite.config.ts và thay đổi port:
   server: {
     port: 8081,  // ← Thay đổi port
   }


❌ LỖI: "Module not found" khi chạy Backend
--------------------------------------------
NGUYÊN NHÂN: Chưa cài đặt đầy đủ thư viện Python
GIẢI PHÁP:
1. Kích hoạt virtual environment:
   Windows: .\venv\Scripts\activate
   macOS/Linux: source venv/bin/activate
2. Cài đặt lại: pip install -r requirements.txt


❌ LỖI: "Command not found: npm"
---------------------------------
NGUYÊN NHÂN: Node.js chưa được cài đặt
GIẢI PHÁP:
1. Tải và cài đặt Node.js từ: https://nodejs.org/
2. Khởi động lại Terminal
3. Kiểm tra: node --version


❌ LỖI: Database "course_assistant_db" không tồn tại
-----------------------------------------------------
NGUYÊN NHÂN: Chưa tạo database hoặc import schema
GIẢI PHÁP:
1. Đăng nhập MySQL: mysql -u root -p
2. Tạo database:
   CREATE DATABASE course_assistant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
3. Import schema:
   mysql -u root -p course_assistant_db < backend/db/schema.sql
4. Import seed data:
   mysql -u root -p course_assistant_db < backend/db/seed.sql


❌ LỖI: "Invalid credentials" khi đăng nhập
--------------------------------------------
NGUYÊN NHÂN: Chưa import seed data hoặc nhập sai thông tin
GIẢI PHÁP:
1. Kiểm tra đã import seed data:
   mysql -u root -p course_assistant_db < backend/db/seed.sql
2. Sử dụng đúng username/email và mật khẩu:
   - Username: admin.3n
   - Password: 123456


================================================================================
                    TẮT HỆ THỐNG
================================================================================

Để tắt hệ thống:

1. Tắt Frontend:
   - Vào Terminal đang chạy Frontend
   - Nhấn Ctrl + C

2. Tắt Backend:
   - Vào Terminal đang chạy Backend
   - Nhấn Ctrl + C

3. Tắt MySQL (tùy chọn):
   - Windows: Mở Services và dừng MySQL80
   - macOS/Linux: sudo systemctl stop mysql


================================================================================
                    KHỞI ĐỘNG LẠI HỆ THỐNG
================================================================================

Khi muốn chạy lại hệ thống:

1. Khởi động MySQL Server (nếu đã tắt)

2. Khởi động Backend:
   cd backend
   .\venv\Scripts\activate        # Windows
   source venv/bin/activate       # macOS/Linux
   python manage.py runserver

3. Khởi động Frontend (Terminal mới):
   cd frontend
   npm run dev


================================================================================
                    THÔNG TIN BỔ SUNG
================================================================================

📁 CẤU TRÚC THỨ MỤC
--------------------
course-assistant-chatbot/
├── backend/                    # Django Backend
│   ├── config/                 # Django settings
│   ├── core/                   # Main app
│   │   ├── services/           # RAG services (chunking, vector store, etc.)
│   │   ├── views.py            # API endpoints
│   │   └── models.py           # Database models
│   ├── db/                     # Database scripts
│   │   ├── schema.sql          # Database schema
│   │   └── seed.sql            # Seed data
│   ├── uploads/                # Uploaded documents
│   ├── requirements.txt        # Python dependencies
│   └── manage.py               # Django management script
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── contexts/           # React contexts
│   │   └── lib/                # Utilities
│   ├── package.json            # Node.js dependencies
│   └── vite.config.ts          # Vite configuration
└── README.txt                  # File này


🔧 CẤU HÌNH MẶC ĐỊNH
---------------------
- Backend URL: http://localhost:8000
- Frontend URL: http://localhost:8080
- MySQL Port: 3307 (có thể thay đổi thành 3306)
- Database Name: course_assistant_db
- Database User: root
- Database Password: root (thay đổi theo cấu hình của bạn)


📚 DỮ LIỆU MẪU
---------------
Hệ thống đã được cấu hình sẵn với:
- 3 tài khoản Admin
- 2 tài khoản Teacher
- 3 tài khoản Student
- 4 môn học (SE101, DP201, CS301, WEB401)
- 4 lớp học
- 6 tài liệu mẫu (với các trạng thái: ready, processing, error, archived)
- 2 cuộc hội thoại mẫu
- 1 bài quiz mẫu
- 5 lịch thi (bao gồm cả quá khứ và tương lai)
- 4 thông báo


🤖 CÔNG NGHỆ AI
----------------
- Vector Store: ChromaDB
- Embeddings: Sentence Transformers
- AI Models: OpenAI GPT-3.5-turbo / Google Gemini
- RAG Pipeline: Document parsing → Chunking → Embedding → Vector search


📧 HỖ TRỢ
----------
Nếu gặp vấn đề khi cài đặt hoặc chạy hệ thống, vui lòng liên hệ:
- Email: admin.3n@tdtu.edu.vn


================================================================================
                    KẾT THÚC HƯỚNG DẪN
================================================================================

Cảm ơn thầy/cô đã dành thời gian đánh giá dự án!

Chúc thầy/cô có trải nghiệm tốt với hệ thống Course Assistant Chatbot.

================================================================================
