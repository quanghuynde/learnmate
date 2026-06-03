# 🎓 LearnMate - AI-Powered Learning Platform

> Nền tảng học tập thông minh kết hợp AI và gamification, giúp người dùng học tập hiệu quả hơn thông qua phân tích tài liệu, tạo quiz tự động, và theo dõi tiến độ toàn diện.

![LearnMate Banner](https://img.shields.io/badge/LearnMate-v1.0-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb)

---

## ✨ Tính năng chính

### 📚 Quản lý tài liệu
- Tải lên nhiều định dạng tài liệu (PDF, DOCX, TXT, Slides)
- Trích xuất và phân tích nội dung văn bản tự động
- Tóm tắt tài liệu bằng AI
- Quản lý thư viện tài liệu cá nhân

### 🤖 AI Học tập
- Tạo Quiz AI từ tài liệu (Trắc nghiệm, Đúng/Sai, Tự luận)
- Hội thoại học tập có giọng nói tự nhiên (AI Dialogue)
- Bản đồ kiến thức tự động từ tài liệu
- Tóm tắt và phân tích nội dung chuyên sâu

### 📊 Theo dõi tiến độ
- Dashboard tổng quan học tập
- Biểu đồ nhiệt (Activity Heatmap) thống kê nhất quán học tập theo năm
- Phân bổ thời gian học theo khung giờ (Sáng, Chiều, Tối)
- Thống kê chuỗi ngày học liên tiếp (Streak)

### 🎯 Độ sẵn sàng thi
- Đánh giá mức độ chuẩn bị theo từng chủ đề
- Phân loại chủ đề: Tốt / Cần ôn / Nguy hiểm
- Lịch đếm ngược đến ngày thi

### 🏆 Gamification
- Hệ thống Credits phần thưởng cho hoạt động học tập
- Huy hiệu thành tích được AI tạo tự động
- Bảng xếp hạng cộng đồng hàng tuần/tháng
- Phần thưởng top 3 mỗi tuần

### 👥 Cộng đồng
- Mạng xã hội học tập: Đăng bài, tương tác
- Bảng xếp hạng top 10 người dùng
- Lịch sử xếp hạng theo tháng

### 💳 Hệ thống gói đăng ký
| Gói | Tài liệu | Hội thoại AI | Credits |
|-----|----------|--------------|---------|
| **Basic** (Miễn phí) | 40 tài liệu | 5 hội thoại | 100/14 ngày |
| **Pro** | 80 tài liệu | 20 hội thoại | 2.500 |
| **Premium** | Không giới hạn | Không giới hạn | 5.000 |

---

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Recharts** (Data visualization)
- **Lucide React** (Icons)

### Backend
- **Node.js** + **Express 5**
- **MongoDB** + **Mongoose**
- **Redis** + **BullMQ** (Queue & caching)
- **JWT** + **bcryptjs** (Authentication)
- **Nodemailer** (Email)
- **Multer** (File uploads)

### AI & Integrations
- **OpenAI API** (Compatible with custom endpoints)
- **Google OAuth** (Social login)
- **Google TTS** (Text-to-Speech for dialogue)
- **Sepay** (Payment gateway)
- **YouTube Transcript** (Video content extraction)

### Deployment
- **Frontend**: Vercel
- **Backend**: Render.com
- **Database**: MongoDB Atlas

---

## 🚀 Khởi chạy dự án

### Yêu cầu
- Node.js >= 18
- MongoDB (Local hoặc Atlas)
- Redis (Local hoặc Redis Cloud)

### 1. Clone repository
```bash
git clone https://github.com/quanghuynde/learnmate.git
cd learnmate
```

### 2. Cấu hình Backend
```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=sk-...
OPENAI_MODEL=...
OPENAI_API_BASE=https://api.openai.com/v1

GOOGLE_CLIENT_ID=...

SEPAY_WEBHOOK_SECRET=...
SEPAY_BANK_ACCOUNT=...

EMAIL_USER=...
EMAIL_PASS=...
```

Khởi động server:
```bash
npm run dev   # Development (nodemon)
npm start     # Production
```

### 3. Cấu hình Frontend
```bash
cd frontend
npm install
```

Tạo file `.env` trong thư mục `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=...
```

Khởi động:
```bash
npm run dev   # Development
npm run build # Production build
```

---

## 📁 Cấu trúc thư mục

```
learnmate/
├── backend/
│   └── src/
│       ├── config/         # Cấu hình DB, Redis
│       ├── controllers/    # Logic xử lý request
│       ├── middleware/     # Auth, rate-limit, upload
│       ├── models/         # Mongoose schemas
│       ├── routes/         # API routing
│       ├── services/       # Business logic (credits, email)
│       └── workers/        # BullMQ background jobs
├── frontend/
│   └── src/
│       ├── components/     # Tái sử dụng UI components
│       ├── pages/          # Các trang chính
│       ├── lib/            # API client & helpers
│       └── assest/         # Static assets
└── FLOW.md                 # Mô tả luồng chức năng
```

---

## 📋 API Docs

API chạy tại `http://localhost:5000/api` với các nhóm route chính:

| Route | Chức năng |
|-------|-----------|
| `/api/auth` | Đăng nhập, đăng ký, Google OAuth |
| `/api/documents` | Quản lý tài liệu |
| `/api/ai` | Quiz AI, Tóm tắt, Hội thoại |
| `/api/progress` | Tiến độ & Activity Heatmap |
| `/api/community` | Cộng đồng, Bảng xếp hạng |
| `/api/payment` | Thanh toán, Gói đăng ký |
| `/api/gamification` | Điểm, Huy hiệu, Thành tích |

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit theo nhóm chức năng
4. Tạo Pull Request

---

## 📄 License

MIT © 2026 LearnMate Team
