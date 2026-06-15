/**
 * Email Templates for LearnMate
 * Premium design HTML templates for various notifications
 */

const baseStyle = `
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
`;

const headerStyle = `
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  padding: 30px 20px;
  text-align: center;
  color: white;
`;

const contentStyle = `
  padding: 30px 25px;
  background-color: #ffffff;
`;

const footerStyle = `
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #666;
  background-color: #f9fafb;
  border-top: 1px solid #eee;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 20px;
`;

const wrapTemplate = (title, content) => `
  <div style="${baseStyle}">
    <div style="${headerStyle}">
      <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">LearnMate</h1>
      <p style="margin: 5px 0 0; opacity: 0.9;">${title}</p>
    </div>
    <div style="${contentStyle}">
      ${content}
    </div>
    <div style="${footerStyle}">
      <p>&copy; ${new Date().getFullYear()} LearnMate AI. Đội ngũ đồng hành cùng bạn.</p>
      <p>Bạn nhận được email này vì đã đăng ký sử dụng LearnMate.</p>
    </div>
  </div>
`;

const templates = {
  quiz_created: (data) => wrapTemplate('Quiz mới đã sẵn sàng!', `
    <h2 style="color: #4f46e5;">Thử thách mới dành cho bạn</h2>
    <p>Chào bạn,</p>
    <p>LearnMate vừa tạo xong một bộ Quiz mới dựa trên tài liệu của bạn:</p>
    <div style="background: #f3f4f6; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0;">
      <p><strong>Tiêu đề:</strong> ${data.title}</p>
      <p><strong>Số câu hỏi:</strong> ${data.totalQuestions || 'N/A'}</p>
      <p><strong>Định dạng:</strong> ${data.format || 'Trắc nghiệm'}</p>
    </div>
    <p>Hãy bắt đầu ôn tập ngay để củng cố kiến thức nhé!</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/quizzes" style="${buttonStyle}">Bắt đầu làm Quiz</a>
    </div>
  `),

  quiz_result: (data) => wrapTemplate('Kết quả Quiz của bạn', `
    <h2 style="color: #10b981;">Chúc mừng bạn đã hoàn thành!</h2>
    <p>Bạn vừa hoàn thành bộ Quiz <strong>"${data.title}"</strong> với kết quả ấn tượng:</p>
    <div style="display: flex; justify-content: space-around; background: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #059669;">${data.percentage}%</div>
        <div style="font-size: 12px; color: #065f46;">Điểm số</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #059669;">${data.score}/${data.totalQuestions}</div>
        <div style="font-size: 12px; color: #065f46;">Câu đúng</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #d97706;">+${data.xpEarned}</div>
        <div style="font-size: 12px; color: #92400e;">XP Nhận được</div>
      </div>
    </div>
    <p style="font-style: italic; color: #666; text-align: center;">"Học tập là một hành trình, mỗi bước đi đều đưa bạn đến gần hơn với mục tiêu."</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/history" style="${buttonStyle}">Xem lịch sử học tập</a>
    </div>
  `),

  study_plan_created: (data) => wrapTemplate('Kế hoạch học tập mới', `
    <h2 style="color: #4f46e5;">Lộ trình học tập của bạn</h2>
    <p>Kế hoạch học tập cho môn <strong>${data.subject}</strong> đã được thiết lập thành công.</p>
    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Số lượng nhiệm vụ:</strong> ${data.taskCount || 0}</p>
      <p style="margin: 5px 0;"><strong>Ngày mục tiêu:</strong> ${new Date(data.examDate).toLocaleDateString('vi-VN')}</p>
      <p style="margin: 5px 0;"><strong>Cường độ:</strong> ${data.intensity || 'Vừa phải'}</p>
    </div>
    <p>Hệ thống đã phân bổ thời gian hợp lý giúp bạn nắm vững kiến thức mà không bị quá tải.</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/study-plan" style="${buttonStyle}">Xem chi tiết kế hoạch</a>
    </div>
  `),

  exam_created: (data) => wrapTemplate('Mục tiêu kỳ thi mới', `
    <h2 style="color: #6366f1;">Bạn đã đặt một mục tiêu mới!</h2>
    <p>Kỳ thi <strong>"${data.name}"</strong> đã được thêm vào lộ trình của bạn.</p>
    <div style="background: #f5f3ff; padding: 15px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
      <p><strong>Môn học:</strong> ${data.subject}</p>
      <p><strong>Ngày thi:</strong> ${new Date(data.examDate).toLocaleDateString('vi-VN')}</p>
    </div>
    <p>LearnMate sẽ giúp bạn theo dõi độ sẵn sàng và gợi ý nội dung ôn tập sát thực tế nhất.</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/exams" style="${buttonStyle}">Theo dõi tiến độ</a>
    </div>
  `),

  knowledge_map_created: (data) => wrapTemplate('Bản đồ tri thức sẵn sàng', `
    <h2 style="color: #8b5cf6;">Cấu trúc kiến thức đã được vẽ ra</h2>
    <p>Hệ thống AI vừa hoàn thành việc phân tích và tạo Bản đồ Tri thức: <strong>"${data.title}"</strong>.</p>
    <p>Từ các nguồn tài liệu:</p>
    <ul style="color: #666; font-size: 14px;">
      ${(data.documentSources || []).map(src => `<li>${src}</li>`).join('')}
    </ul>
    <p>Hãy khám phá bản đồ để có cái nhìn tổng quan nhất về hệ thống kiến thức bạn đang học.</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/knowledge-map" style="${buttonStyle}">Khám phá ngay</a>
    </div>
  `),
};

module.exports = { templates };
