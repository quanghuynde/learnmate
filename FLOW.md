# Luồng Chức Năng Các Mục Ở Sidebar (FLOW)

Dưới đây là chi tiết luồng hoạt động và tính năng của các mục trên thanh Sidebar:

### 1. Kế hoạch học
- **Hiển thị kế hoạch:** Kế hoạch học mới tạo sẽ được hiển thị theo tiến trình tuần dựa trên thiết lập từ frontend.
- **Mục tiêu tuần:** Là danh sách các kế hoạch đã được lập ra cho tuần đó.
- **Tự động hoàn thành:** Khi đến hạn (deadline) của một kế hoạch, hệ thống sẽ tự động gạch ngang kế hoạch đó trong mục "Mục tiêu tuần", đánh dấu là đã hoàn thành.

### 2. Bản đồ kiến thức
- **Nguồn dữ liệu:** Lấy các file đã được tải lên từ mục **Tài liệu**.
- **Tạo bản đồ kiến thức:** Người dùng có thể chọn từ 1 đến tối đa 8 file (cho phép kết hợp nhiều file khác nhau hoặc chỉ 1 file) để hệ thống tự động khởi tạo bản đồ kiến thức tương ứng.

### 3. Kiểm tra
- **Chọn tài liệu:** Cung cấp tính năng tìm kiếm và chọn các file đã được tải lên.
- **Tạo câu hỏi:** Cho phép người dùng nhập trực tiếp số lượng câu hỏi để khởi tạo một bài kiểm tra dựa trên nội dung các file đã chọn.

### 4. Tiến độ
- **Ghi nhận giờ học hằng ngày:** Hệ thống tính toán dựa trên thời gian thực tế người dùng đăng nhập và hoạt động trên web.
- **Phân bổ thời gian học:** Chi tiết thời gian học sẽ được chia theo 3 khung giờ chính:
  - Sáng: 06:00 - 12:00
  - Chiều: 12:00 - 18:00
  - Tối: 18:00 - 24:00
- **Thống kê hàng tháng:** Theo dõi các chỉ số học tập trong từng tháng (có tính năng xem lại các tháng trước), bao gồm:
  - Tổng thời gian học
  - Thời gian học trung bình mỗi ngày
  - Chuỗi ngày học liên tiếp dài nhất
  - Số bài kiểm tra đã hoàn thành

### 5. Độ sẵn sàng thi
- **Mục đích:** Đánh giá mức độ chuẩn bị của người dùng cho bài thi dựa vào khoảng thời gian mốc (đã cài đặt ở trang chủ).
- **Thu thập dữ liệu:** Lấy dữ liệu hoàn thành từ các mục **Kế hoạch học** và **Tiến độ**.
- **Phân tích chủ đề (trong 30 ngày):** Phân tích kết quả thực hiện từ **Kiểm tra** và **Kế hoạch học** để thống kê chi tiết cho từng chủ đề:
  - Mức độ nắm vững của mỗi chủ đề.
  - Tổng thời gian đã học cho chủ đề đó.
  - Đánh giá trạng thái với 3 cấp độ: "Tốt", "Cần ôn", "Nguy hiểm" (giao diện thể hiện giống như frontend đã thiết kế).

### 6. Gamification (Trò chơi hóa)
- **Tạo danh hiệu tự động (AI):** Dùng AI để cấp các danh hiệu phản ánh đúng các chủ đề người học đang bám sát. Cần đạt một mức độ thành tích nhất định để mở khoá được những danh hiệu này.
- **Nguồn đánh giá:** Dữ liệu được tổng hợp từ **Kế hoạch học**, **Kiểm tra**, **Tiến độ** và **Độ sẵn sàng thi**.
- **Bộ sưu tập và xếp hạng:** Chứa bộ sưu tập các Huy hiệu của người dùng. Ngoài ra có hiển thị Top tuần tham chiếu từ mục **Cộng đồng**.

### 7. Cộng đồng
- **Bảng xếp hạng cộng đồng:** Tập hợp tất cả người dùng vào trong một cộng đồng để tiến hành xếp hạng (lấy dữ liệu từ điểm số/thành tích của phần **Gamification**).
- **Mạng xã hội học tập:** Mỗi thành viên trong cộng đồng đều có thể đăng bài viết cá nhân hoặc xem/tương tác với bài viết của người khác nhằm mục đích chính là trao đổi, hỗ trợ nhau học tập.
