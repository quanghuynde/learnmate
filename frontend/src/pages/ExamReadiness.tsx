import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
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
} from 'recharts'

export function ExamReadiness({ token: _token }: { token: string }) {
  // Gán data mặc định rỗng (chờ lấy từ backend)
  const radarData: any[] = []
  const trendData: any[] = []
  const topics: any[] = []

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target className="text-primary" /> Độ sẵn sàng thi
        </h1>
        <p className="text-slate-500">Chưa xác định kỳ thi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

          <h2 className="text-xl font-bold text-text-primary mb-6">
            Chưa có đánh giá
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
                strokeDasharray="0, 100"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-primary">--%</span>
              <span className="text-xs text-slate-500 mt-1">ĐIỂM TỔNG HỢP</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Làm thêm các bài kiểm tra (Quiz) để hệ thống AI đánh giá độ sẵn sàng của bạn.
          </p>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">
                ĐỘ CHÍNH XÁC QUIZ
              </p>
              <p className="font-bold text-text-primary flex items-center justify-center gap-1">
                <CheckCircle2 size={14} className="text-slate-300" /> --%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">GIỜ HỌC</p>
              <p className="font-bold text-text-primary">0h</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">
                CHỦ ĐỀ ĐÃ HỌC
              </p>
              <p className="font-bold text-text-primary">0/0</p>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-text-primary mb-4">
            Cân bằng kiến thức
          </h3>
          <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: '#64748b',
                      fontSize: 12,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Học Viên"
                    dataKey="A"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
                <p className="text-slate-400 text-sm font-medium">Chưa có dữ liệu phân tích</p>
            )}
          </div>
          <div className="mt-4 bg-slate-50 text-slate-600 text-sm p-3 rounded-xl flex gap-2 items-start border border-slate-100">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5 opacity-50" />
            <p>
              Thực hiện thêm bài Quiz để AI phân tích sơ đồ kiến thức của bạn.
            </p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary">Xu hướng sẵn sàng</h3>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
              <TrendingUp size={12} /> --%
            </span>
          </div>
          <div className="h-64 flex flex-col justify-center items-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            {trendData.length > 0 ? (
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
                      fontSize: 12,
                      fill: '#94a3b8',
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
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
             ) : (
                <p className="text-slate-400 text-sm font-medium">Chưa có biểu đồ xu hướng</p>
             )}
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">30 ngày qua</p>
        </div>
      </div>

      {/* Topic Analysis Table */}
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
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    Chưa có dữ liệu phân tích chủ đề. Hãy tiếp tục học tập và làm bài tập nhé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
