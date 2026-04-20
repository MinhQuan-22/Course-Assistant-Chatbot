# Course Assistant Chatbot

Hệ thống Course Assistant Chatbot là một nền tảng quản trị học tập (LMS) kết hợp với công nghệ AI (RAG) giúp tự động hóa quá trình hỏi đáp của sinh viên dựa trên tài liệu học thuật được cung cấp bởi giảng viên.

Hệ thống bao gồm hai thành phần chính:
- **Frontend**: Ứng dụng web React (sử dụng Vite, Tailwind CSS, TypeScript).
- **Backend**: API Server được viết bằng Python (Django) kết hợp cơ sở dữ liệu MySQL và công nghệ vector hóa để tìm kiếm tài liệu cục bộ.

---

## Yêu cầu Hệ thống (Prerequisites)
Để chạy dự án, máy tính cần được cài đặt sẵn:
- **Node.js** (phiên bản v18 trở lên)
- **Python** (phiên bản 3.9 trở lên)
- **MySQL Server** (phiên bản 8.0 trở lên)

---

## Hướng dẫn Cài đặt (Setup Instructions)

### 1. Cài đặt Cơ sở dữ liệu (Database Setup)
1. Đăng nhập vào MySQL trên máy cá nhân:
   ```bash
   mysql -u root -p
   ```
2. Tạo cơ sở dữ liệu cho dự án và cấp quyền:
   ```sql
   CREATE DATABASE course_assistant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   -- (Tùy chọn) Cấp quyền nếu cần:
   -- GRANT ALL PRIVILEGES ON course_assistant_db.* TO 'your_user'@'localhost';
   -- FLUSH PRIVILEGES;
   ```
3. Import cấu trúc bảng (Schema):
   ```bash
   mysql -u root -p course_assistant_db < backend/db/schema.sql
   ```
4. Import dữ liệu cho sẵn (Seed Data):
   ```bash
   mysql -u root -p course_assistant_db < backend/db/seed.sql
   ```

### 2. Thiết lập Backend (Python / Django)
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Tạo và kích hoạt môi trường ảo (Virtual Environment):
   - **Windows**:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **Mac/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
4. Cấu hình kết nối Database (nếu máy hiện tại không dùng user là `root` và password là rỗng):
   - Mở file `backend/config/settings.py` (hoặc tạo dồn file `.env`) và điều chỉnh thông tin khai báo `DATABASES`.
5. Khởi chạy máy chủ Backend:
   ```bash
   python manage.py runserver
   ```
   > Backend sẽ chạy tại: `http://localhost:8000/`

### 3. Thiết lập Frontend (React / Vite)
1. Mở một terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói thư viện (NPM Packages):
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng web:
   ```bash
   npm run dev
   ```
   > Frontend sẽ chạy tại: `http://localhost:8080/` (hoặc port được hiển thị trên console).

---

## Tài khoản Đăng nhập (Test Credentials)

Các tài khoản dưới đây đã được tạo sẵn từ file `seed.sql` với mật khẩu chung là **`123456`**. Người chấm có thể dùng trực tiếp các tài khoản này để rà soát toàn bộ tính năng và phân quyền của hệ thống.

| Vai trò (Role) | Email / Username đăng nhập | Mật khẩu | Tính năng chính có thể dùng để test |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin.3n@tdtu.edu.vn` (hoặc `admin.3n`) | `123456` | Dashboard tổng, Quản lý tài khoản, Thiết lập Settings AI, Quản lý danh mục học thuật (Subject/Class). |
| **Giảng viên (Teacher)** | `tuan.tran@tdtu.edu.vn` (hoặc `tuan.tran`) | `123456` | Quản lý tài liệu (RAG), Quản lý lớp được phân công, Xem thống kê sinh viên, Tạo bài thi (Quiz). |
| **Giảng viên (Teacher)** | `hoa.le@tdtu.edu.vn` (hoặc `hoa.le`) | `123456` | Tương tự như tài khoản Teacher bên trên (dành cho môn học khác). |
| **Sinh viên (Student)** | `an.nguyen@student.tdtu.edu.vn` (hoặc `an.nguyen`) | `123456` | Khung Chat AI hỏi đáp khóa học, Làm bài Quiz, Xem lịch thi/thông báo. |

---

## Thông tin Bổ sung
- **Công cụ RAG & AI**: 
   - Mã nguồn Backend có kết hợp công nghệ nhúng (embeddings) và truy vấn Vector (ChromaDB / FAISS) đặt tại thư mục `backend/core/services/` nhằm cung cấp ngữ cảnh cho trợ lý ảo.
- **Dữ liệu Ảo (Mock Data)**: 
   - Đã được cập nhật sẵn trong cơ sở dữ liệu đủ để hiển thị các biểu đồ thống kê, bài viết thông báo và lịch thi một cách trực quan ngay khi đăng nhập.

Cảm ơn thầy/cô đã dành thời gian đánh giá dự án!
