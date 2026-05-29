# 🎮 GAMIFICATION - HƯỚNG DẪN SỬ DỤNG

## 📋 TỔNG QUAN

Chức năng Gamification đã được implement đầy đủ theo FLOW.md:
- ✅ Hệ thống Achievements (Huy hiệu)
- ✅ XP và Level system
- ✅ Streak tracking
- ✅ Leaderboard (Bảng xếp hạng)
- ✅ Auto-unlock achievements
- ✅ Progress tracking

---

## 🚀 CÁCH SỬ DỤNG

### **1. Thêm dữ liệu test:**

```bash
cd backend
node seedGamificationData.js
```

**Script sẽ tạo:**
- 20 achievements (Common, Rare, Epic, Legendary)
- Unlock một số achievements cho user `vana@gmail.com`
- Cập nhật XP và Level

### **2. Xóa dữ liệu test:**

```bash
cd backend
node cleanGamificationData.js
```

---

## 🏆 CÁC LOẠI ACHIEVEMENTS

### **Quiz Achievements:**
- 🎯 Người mới bắt đầu (5 quiz) - Common - 100 XP
- 📚 Học sinh chăm chỉ (20 quiz) - Rare - 250 XP
- 🎓 Bậc thầy Quiz (50 quiz) - Epic - 500 XP
- 🎯 Độ chính xác cao (80% accuracy) - Rare - 300 XP
- 💯 Hoàn hảo (95% accuracy) - Legendary - 1000 XP

### **Study Achievements:**
- ⏰ Học tập đều đặn (10h) - Common - 150 XP
- 📖 Người học không mệt mỏi (30h) - Rare - 350 XP
- 🧠 Học giả (100h) - Epic - 750 XP

### **Streak Achievements:**
- 🔥 Khởi đầu tốt (3 ngày) - Common - 100 XP
- 💪 Kiên trì (7 ngày) - Rare - 250 XP
- 🚀 Không thể ngăn cản (30 ngày) - Epic - 600 XP
- 👑 Huyền thoại (100 ngày) - Legendary - 2000 XP

### **Level Achievements:**
- ⭐ Level 5 (2000 XP) - Common - 200 XP
- 🌟 Level 10 (4500 XP) - Rare - 400 XP
- ✨ Level 20 (9500 XP) - Epic - 800 XP

### **Subject Mastery:**
- 🔢 Bậc thầy Toán (85% accuracy) - Rare - 300 XP
- ⚛️ Bậc thầy Lý (85% accuracy) - Rare - 300 XP
- 🧪 Bậc thầy Hóa (85% accuracy) - Rare - 300 XP

### **Special:**
- 🎖️ Người tiên phong - Legendary - 500 XP

---

## 📊 API ENDPOINTS

### **GET /api/gamification/overview**
Lấy tổng quan gamification:
```json
{
  "user": {
    "name": "Vân A",
    "xp": 2500,
    "level": 6,
    "streak": 15,
    "levelProgress": 40,
    "nextLevelXP": 3000
  },
  "achievements": {
    "total": 20,
    "unlocked": 8,
    "list": [...]
  },
  "leaderboard": {
    "userRank": 3,
    "top": [...]
  },
  "newAchievements": [...]
}
```

### **GET /api/gamification/achievements**
Lấy danh sách achievements với progress

### **GET /api/gamification/leaderboard?limit=10**
Lấy bảng xếp hạng

---

## 🎯 CÁCH HOẠT ĐỘNG

### **1. Auto-unlock Achievements:**

Achievements tự động unlock khi:
- User submit quiz → Check quiz achievements
- User complete study session → Check study achievements
- User login → Update streak → Check streak achievements
- User gain XP → Check level achievements

### **2. XP System:**

```
Quiz: 50 XP/câu đúng
Achievement unlock: Bonus XP theo rarity
Level up: Mỗi 500 XP = 1 level
```

### **3. Leaderboard:**

Xếp hạng theo:
- Tổng XP (primary)
- Level (secondary)
- Streak (tertiary)

### **4. Progress Tracking:**

Mỗi achievement hiển thị:
- Current progress (số hiện tại)
- Target (mục tiêu)
- Progress % (phần trăm hoàn thành)

---

## 🎨 FRONTEND FEATURES

### **User Stats Card:**
- Avatar, Name
- Level badge
- XP counter
- Streak counter
- Level progress bar

### **Achievements Grid:**
- Filter: All, Unlocked, Locked, Quiz, Study, Streak, Subject
- Rarity colors: Common (gray), Rare (blue), Epic (purple), Legendary (gold)
- Progress bars cho locked achievements
- Icons và descriptions

### **Leaderboard:**
- Top 10 users
- User's rank highlight
- Medals cho top 3 (🥇🥈🥉)

---

## 🔄 WORKFLOW

```
User Action (Quiz/Study/Login)
    ↓
Backend Service: checkAndUnlockAchievements()
    ↓
Check all achievements conditions
    ↓
Unlock if met → Add XP → Update Level
    ↓
Frontend: Show notification
    ↓
Refresh gamification overview
```

---

## 📝 TESTING

### **Test Scenario 1: Unlock Quiz Achievement**
1. Làm 5 quiz
2. Vào trang Gamification
3. Thấy "Người mới bắt đầu" đã unlock
4. XP tăng +100

### **Test Scenario 2: Progress Tracking**
1. Làm 3 quiz
2. Vào Gamification
3. Thấy "Người mới bắt đầu" progress 60% (3/5)

### **Test Scenario 3: Leaderboard**
1. Nhiều users làm quiz
2. Xếp hạng theo XP
3. Top 3 có medals

---

## 🎉 KẾT QUẢ

Sau khi chạy `seedGamificationData.js`, user `vana@gmail.com` sẽ có:
- ✅ 8-10 achievements đã unlock
- ✅ ~1500-2000 XP
- ✅ Level 4-5
- ✅ Hiển thị trong leaderboard

---

## 🐛 TROUBLESHOOTING

### **Lỗi: "Cannot find module Achievement"**
```bash
cd backend
npm install
```

### **Achievements không unlock:**
- Check user đã làm đủ quiz/study sessions chưa
- Check điều kiện trong Achievement model
- Gọi API `/api/gamification/overview` để trigger check

### **Leaderboard trống:**
- Cần ít nhất 1 user có XP > 0
- Chạy `seedExamReadinessData.js` trước

---

Chúc bạn test vui vẻ! 🎮🏆
