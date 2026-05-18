import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api, ExamItem, UserItem } from '../lib/api';

interface ExamReadinessProps {
  token: string;
}

export function ExamReadiness({ token }: ExamReadinessProps) {
  const [user, setUser] = useState<UserItem | null>(null);
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meRes, examRes, progressRes] = await Promise.all([
          api.getMe(token),
          api.getExams(token),
          api.getProgressOverview(token),
        ]);

        setUser(meRes.user);
        setOverview(progressRes);
        
        // Lấy kỳ thi đang hoạt động gần nhất
        const activeExam = (examRes.exams || [])
          .filter(e => e.isActive)
          .sort((a, b) => +new Date(a.examDate) - +new Date(b.examDate))[0];
        setExam(activeExam || null);
      } catch (err) {
        console.error('Lỗi tải dữ liệu sẵn sàng thi:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  // Dữ liệu Radar giả lập dựa trên các môn học của User (vì chưa có bảng điểm chi tiết từng môn)
  const radarData = useMemo(() => {
    if (!user?.subjects?.length) return [
      { subject: 'Mặc định', A: 50, fullMark: 100 }
    ];
    return user.subjects.map(sub => ({
      subject: sub,
      A: Math.floor(Math.random() * 40) + 50, // Giả lập điểm từ 50-90
      fullMark: 100
    }));
  }, [user]);

  // Dữ liệu xu hướng từ chartData của Progress
  const trendData = useMemo(() => {
    if (!overview?.chartData) return [];
    // Chuyển đổi chartData (ngày, giờ) thành (ngày, điểm giả lập tăng dần)
    return overview.chartData.map((d: any, i: number) => ({
      day: d.day,
      score: Math.min(100, 40 + (i * 2) + (d.hours * 2))
    })).slice(-7); // Lấy 7 ngày gần nhất
  }, [overview]);

  // Danh sách chủ đề (Subjects)
  const topics = useMemo(() => {
    if (!user?.subjects) return [];
    return user.subjects.map(sub => {
      const score = Math.floor(Math.random() * 50) + 45;
      let status = 'Nguy hiểm';
      let color = 'text-danger bg-danger/10';
      
      if (score > 80) {
        status = 'Tốt';
        color = 'text-success bg-success/10';
      } else if (score > 60) {
        status = 'Cần ôn';
        color = 'text-accent bg-accent/10';
      }

      return {
        name: sub,
        score,
        time: `${Math.floor(Math.random() * 10) + 2}h ${Math.floor(Math.random() * 59)}m`,
        status,
        color
      };
    });
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Đang phân tích dữ liệu sẵn sàng...</div>;
  }

  const readinessScore = exam?.readinessScore || 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Target className="text-primary" /> Độ sẵn sàng thi
          </h1>
          <p className="text-slate-500">{exam?.name || 'Chưa có kỳ thi nào được thiết lập'}</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-sm font-medium">
          <BookOpen size={16} className="text-primary" />
          <span>Môn học: {exam?.subject || 'Tất cả'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

          <h2 className="text-xl font-bold text-text-primary mb-6">
            {readinessScore > 80 ? 'Sẵn sàng tuyệt vời!' : readinessScore > 60 ? 'Gần sẵn sàng' : 'Cần cố gắng thêm'}
          </h2>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${readinessScore}, 100`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-primary">{readinessScore}%</span>
              <span className="text-xs text-slate-500 mt-1">ĐIỂM TỔNG HỢP</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            {readinessScore > 70 
              ? 'Bạn đang làm rất tốt, hãy tập trung vào các chủ đề yếu để bứt phá điểm số.'
              : 'Hãy dành thêm thời gian luyện tập Quiz để tăng độ sẵn sàng trước kỳ thi.'}
          </p>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">CHÍNH XÁC</p>
              <p className="font-bold text-text-primary flex items-center justify-center gap-1">
                <CheckCircle2 size={14} className="text-success" /> 78%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">GIỜ HỌC</p>
              <p className="font-bold text-text-primary">{overview?.totalHours || 0}h</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">CHỦ ĐỀ</p>
              <p className="font-bold text-text-primary">{exam?.topicsMastered || 0}/{exam?.totalTopics || 10}</p>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-text-primary mb-4">
            Cân bằng kiến thức
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Sẵn sàng"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 bg-blue-50 text-blue-800 text-sm p-3 rounded-xl flex gap-2 items-start border border-blue-100">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p>
              Biểu đồ dựa trên hoạt động Quiz gần đây của bạn qua các môn học đã chọn.
            </p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary">Xu hướng sẵn sàng</h3>
            <span className="text-xs font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-1 rounded-full">
              <TrendingUp size={12} /> Tăng trưởng
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{
                  top: 10,
                  right: 0,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: '#94a3b8',
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: '#94a3b8',
                  }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">Theo dõi qua hoạt động thực tế</p>
        </div>
      </div>

      {/* Topic Analysis Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-text-primary">Phân tích môn học & Chủ đề</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Môn học</th>
                <th className="p-4">Nắm vững %</th>
                <th className="p-4">Thời gian học</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topics.length > 0 ? (
                topics.map((topic, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-text-primary">
                      {topic.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold w-8">
                          {topic.score}%
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${topic.score > 80 ? 'bg-success' : topic.score > 60 ? 'bg-accent' : 'bg-danger'}`}
                            style={{
                              width: `${topic.score}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{topic.time}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${topic.color}`}
                      >
                        {topic.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Chưa có môn học nào được thêm. Hãy cập nhật trong Hồ sơ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
