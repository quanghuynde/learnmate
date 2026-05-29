import { useEffect, useMemo, useState } from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { api, ExamItem } from '../lib/api';

export function ExamReadiness({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [examRes, historyRes, progressRes] = await Promise.all([
          api.getExams(token),
          api.getQuizHistory(token),
          api.getProgressOverview(token),
        ]);
        setExams(examRes.exams || []);
        setQuizHistory(historyRes.results || []);
        setOverview(progressRes || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu độ sẵn sàng thi');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const activeExam = useMemo(() => exams.find((e) => e.isActive) || exams[0] || null, [exams]);

  const avgQuizScore = useMemo(() => {
    if (quizHistory.length === 0) return null;
    const total = quizHistory.reduce((sum, q) => sum + (q.percentage || 0), 0);
    return Math.round(total / quizHistory.length);
  }, [quizHistory]);

  const radarData = useMemo(
    () =>
      quizHistory
        .slice(0, 6)
        .reverse()
        .map((item: any, i: number) => ({
          subject: item.quiz?.subject || item.quiz?.title || `Quiz ${i + 1}`,
          A: item.percentage || 0,
        })),
    [quizHistory]
  );

  const trendData = useMemo(
    () =>
      quizHistory
        .slice(0, 10)
        .reverse()
        .map((item: any, i: number) => ({ day: `${i + 1}`, score: item.percentage || 0 })),
    [quizHistory]
  );

  const topics = useMemo(() => {
    if (!activeExam) return [];
    const mastered = activeExam.topicsMastered || 0;
    const total = activeExam.totalTopics || 0;
    const remain = Math.max(total - mastered, 0);
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return [
      {
        name: `${activeExam.subject || activeExam.name} - Tổng quan`,
        score: masteryPct,
        time: `${overview?.totalHours || 0}h`,
        status: masteryPct >= 80 ? 'Ổn định' : masteryPct >= 60 ? 'Đang tiến bộ' : 'Cần tập trung',
        color: masteryPct >= 80 ? 'bg-success/10 text-success' : masteryPct >= 60 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger',
      },
      {
        name: 'Chủ đề đã nắm vững',
        score: masteryPct,
        time: `${mastered}/${total}`,
        status: 'Đã học',
        color: 'bg-primary/10 text-primary',
      },
      {
        name: 'Chủ đề cần bổ sung',
        score: Math.max(100 - masteryPct, 0),
        time: `${remain} chủ đề`,
        status: remain === 0 ? 'Hoàn thành' : 'Cần ôn',
        color: remain === 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
      },
    ];
  }, [activeExam, overview]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Đang tải dữ liệu độ sẵn sàng thi...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">{error}</div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target className="text-primary" /> Độ sẵn sàng thi
        </h1>
        <p className="text-slate-500">
          {activeExam ? `${activeExam.name} - thi ngày ${new Date(activeExam.examDate).toLocaleDateString('vi-VN')}` : 'Chưa xác định kỳ thi'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

          <h2 className="text-xl font-bold text-text-primary mb-6">{activeExam ? 'Đánh giá hiện tại' : 'Chưa có đánh giá'}</h2>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
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
                strokeDasharray={`${activeExam?.readinessScore || 0}, 100`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-primary">{activeExam ? `${activeExam.readinessScore}%` : '--%'}</span>
              <span className="text-xs text-slate-500 mt-1">ĐIỂM TỔNG HỢP</span>
            </div>
          </div>
        )}
      </div>

          <p className="text-sm text-slate-600 mb-6">Làm thêm quiz và học tập đều đặn để hệ thống đánh giá độ sẵn sàng chính xác hơn.</p>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">ĐỘ CHÍNH XÁC QUIZ</p>
              <p className="font-bold text-text-primary flex items-center justify-center gap-1">
                <CheckCircle2 size={14} className="text-slate-300" /> {avgQuizScore !== null ? `${avgQuizScore}%` : '--%'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">GIỜ HỌC</p>
              <p className="font-bold text-text-primary">{overview?.totalHours || 0}h</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">CHỦ ĐỀ ĐÃ HỌC</p>
              <p className="font-bold text-text-primary">{activeExam ? `${activeExam.topicsMastered}/${activeExam.totalTopics}` : '0/0'}</p>
            </div>
          </div>
        </div>
      )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-text-primary mb-4">Cân bằng kiến thức</h3>
          <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Học viên" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm font-medium">Chưa có dữ liệu phân tích</p>
            )}
          </div>
          <div className="mt-4 bg-slate-50 text-slate-600 text-sm p-3 rounded-xl flex gap-2 items-start border border-slate-100">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5 opacity-50" />
            <p>Thực hiện thêm quiz để radar phân tích đầy đủ hơn.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary">Xu hướng sẵn sàng</h3>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
              <TrendingUp size={12} /> {activeExam ? `${activeExam.readinessScore}%` : '--%'}
            </span>
          </div>
          <div className="h-64 flex flex-col justify-center items-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm font-medium">Chưa có biểu đồ xu hướng</p>
            )}
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">10 quiz gần đây</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-text-primary">Phân tích chủ đề</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Chủ đề</th>
                <th className="p-4">Nắm vững %</th>
                <th className="p-4">Thời gian học</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topics.length > 0 ? (
                topics.map((topic, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-text-primary">{topic.name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold w-8">{topic.score}%</span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${topic.score > 80 ? 'bg-success' : topic.score > 60 ? 'bg-accent' : 'bg-danger'}`}
                            style={{ width: `${topic.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{topic.time}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${topic.color}`}>{topic.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    Chưa có dữ liệu phân tích chủ đề.
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
