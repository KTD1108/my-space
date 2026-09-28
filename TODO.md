# Nhật ký dự án My Space

## ✅ Những công việc đã hoàn thành (Phiên làm việc gần nhất)

**1. Tính năng Chia sẻ Công khai (Shareable Links)**
- Xây dựng hệ thống chia sẻ ảnh và tài liệu thông qua URL bảo mật.
- Tạo giao diện `Guest Page` (Kính mờ/Glassmorphism) cực kỳ chuyên nghiệp và biệt lập cho khách vãng lai, cho phép họ xem và tải xuống mà không cần đăng nhập.
- Thêm nút Chia sẻ (Share) dạng overlay vào từng file/ảnh.

**2. Tích hợp Trí Tuệ Nhân Tạo (Google Gemini AI)**
- **Nhạc (Giai điệu):** AI tự động phân tích tên bài hát hoặc link SoundCloud để đoán và tự động gắn thẻ Thể loại Nhạc (Ví dụ: `[Lofi]`, `[Rap]`).
- **Tài liệu (Học tập):** AI tự động đọc tên/link và tự động xếp vào đúng danh mục thư mục thay vì nhét tất cả vào mục "Chung".
- **Tóm tắt Tài liệu (✨ AI Tóm tắt):** Cho phép người dùng bấm một nút để AI đọc toàn bộ file PDF, Word (`.docx`), Link báo chí, file `.txt` và tóm tắt nhanh gọn trong 3-5 câu.
- **Sửa lỗi Hệ thống:** Đã xử lý triệt để các lỗi xung đột giữa chuẩn thư viện cũ (CommonJS) và Next.js (Turbopack) như: Lỗi `React #441`, lỗi `DOMMatrix`, lỗi `pdf-parse ENOENT`, và nâng cấp lên mô hình `gemini-3.8-flash` mới nhất.

---

## 🚀 Kế hoạch sắp tới (To-Do List cho buổi sau)

Dưới đây là một số ý tưởng và tính năng có thể triển khai tiếp tục để biến "My Space" thành một hệ điều hành cá nhân hoàn hảo:

- [ ] **Giao diện Tối (Dark Mode):** Thêm nút chuyển đổi chế độ sáng/tối để người dùng có trải nghiệm tốt hơn vào ban đêm, đặc biệt là với thiết kế Bento Grid hiện tại.
- [ ] **Trợ lý Ảo Nhắn tin (AI Chat Assistant):** Thay vì chỉ bấm nút tóm tắt, xây dựng một cửa sổ Chat nhỏ góc màn hình để người dùng có thể trò chuyện với AI, yêu cầu AI tìm kiếm tài liệu, hay đặt lịch học tự động.
- [ ] **Tính năng Ghi chú (Notes / To-Do List):** Một trang riêng để ghi chú nhanh dạng Markdown hoặc danh sách công việc cần làm, có thể kéo thả.
- [ ] **Thông báo (Notifications):** Thêm hệ thống thông báo đẩy (hoặc email) để báo tới giờ học/làm việc đã lên lịch trong Google Calendar View.

*Ghi chú: File này được cập nhật để ghi nhớ tiến độ, phục vụ cho các phiên làm việc tiếp theo.*
