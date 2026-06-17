import { useState, useEffect } from 'react'
import { Target, TrendingUp, AlertCircle, CheckCircle2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { api, ExamReadinessData } from '../lib/api'

export function ExamReadiness({ token, setCurrentPage }: { token: string; setCurrentPage?: (page: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readinessData, setReadinessData] = useState<ExamReadinessData | null>(null)
  const [currentPage, setCurrentPageLocal] = useState(0)

  useEffect(() => {
    fetchReadinessData()
  }, [])

  const fetchReadinessData = async () => {
    setLoading(true)
    setError('')
    try {
      // Lấy kỳ thi active (được cài đặt từ trang chủ)
      const { exams } = await api.getExams(token)
      const activeExam = exams.find((e) => e.isActive)
      
      if (!activeExam) {
        setLoading(false)
        return
      }

      const data = await api.getExamReadiness(token, activeExam._id)
      setReadinessData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (!readinessData) {
    return (
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Target className="text-primary" /> Độ sẵn sàng thi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Phân tích mức độ sẵn sàng cho kỳ thi của bạn</p>
        </div>
        {/* Onboarding Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Chào mừng đến Độ sẵn sàng thi!</h3>
            <p className="text-slate-500 text-sm">Thực hiện 3 bước đơn giản để kích hoạt tính năng phân tích của bạn.</p>
          </div>
          <ol className="space-y-4 mb-8">
            <li className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
              <div>
                <p className="font-bold text-slate-800">Đặt mục tiêu kỳ thi</p>
                <p className="text-sm text-slate-500 mt-0.5">Trên trang Dashboard, tìm mục "Kỳ thi sắp tới" và nhấn <strong>Cài đặt kỳ thi</strong>.</p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="w-8 h-8 bg-primary/60 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
              <div>
                <p className="font-bold text-slate-800">Làm bài Quiz từ tài liệu</p>
                <p className="text-sm text-slate-500 mt-0.5">Chuyển sang trang Quiz và tạo ít nhất 1 bài kiểm tra từ tài liệu học của bạn.</p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="w-8 h-8 bg-slate-300 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
              <div>
                <p className="font-bold text-slate-800">Xem phân tích tự động</p>
                <p className="text-sm text-slate-500 mt-0.5">Hệ thống sẽ tự động tạo biểu đồ độ sẵn sàng dựa trên kết quả của bạn.</p>
              </div>
            </li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setCurrentPage?.('dashboard')}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Target size={18} /> Cài đặt kỳ thi ngay
            </button>
            <button
              onClick={() => setCurrentPage?.('quiz')}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              Tạo bài Quiz →
            </button>
          </div>
        </div>
      </div>
    )
  }


  const radarData = readinessData?.radarData || []
  const trendData = readinessData?.trendData || []
  const topics = readinessData?.topics || []
  const metrics = readinessData?.metrics || { quizAccuracy: 0, totalHours: 0, topicsMastered: 0, totalTopics: 0 }
  const readinessScore = readinessData?.readinessScore || 0

  const itemsPerPage = 12
  const totalPages = Math.ceil(topics.length / itemsPerPage)
  const paginatedTopics = topics.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
  const paginatedRadarData = radarData.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target className="text-primary" /> Độ sẵn sàng thi
        </h1>
        {readinessData?.exam && (
          <div className="mt-2 flex items-center gap-4 text-slate-600">
            <span className="font-semibold text-slate-800">{readinessData.exam.name}</span>
            <span className="flex items-center gap-1">
              <Calendar size={16} />
              {new Date(readinessData.exam.examDate).toLocaleDateString('vi-VN')}
            </span>
            <span className={`font-semibold ${
              readinessData.exam.daysRemaining > 7 ? 'text-slate-600' : 
              readinessData.exam.daysRemaining > 0 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {readinessData.exam.daysRemaining > 0
                ? `Còn ${readinessData.exam.daysRemaining} ngày`
                : readinessData.exam.daysRemaining === 0
                ? 'Thi hôm nay!'
                : `Đã qua ${Math.abs(readinessData.exam.daysRemaining)} ngày`}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-2xl w-fit mx-auto shadow-sm">
          <button 
            disabled={currentPage === 0}
            onClick={() => setCurrentPageLocal((p: number) => p - 1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-slate-600">
            Nhóm {currentPage + 1} / {totalPages}
          </span>
          <button 
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPageLocal((p: number) => p + 1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall Score Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

              <h2 className="text-xl font-bold text-text-primary mb-6">
                Điểm sẵn sàng tổng hợp
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
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{readinessScore}%</span>
                  <span className="text-xs text-slate-500 mt-1">ĐIỂM TỔNG HỢP</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                {readinessScore >= 80
                  ? 'Bạn đã sẵn sàng cho kỳ thi!'
                  : readinessScore >= 60
                  ? 'Tiếp tục cố gắng, bạn đang trên đà tốt!'
                  : 'Hãy dành thêm thời gian ôn tập nhé!'}
              </p>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">
                    ĐỘ CHÍNH XÁC QUIZ
                  </p>
                  <p className="font-bold text-text-primary flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} className={metrics.quizAccuracy > 0 ? 'text-success' : 'text-slate-300'} />{' '}
                    {metrics.quizAccuracy}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">GIỜ HỌC</p>
                  <p className="font-bold text-text-primary">{metrics.totalHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">
                    CHỦ ĐỀ ĐÃ HỌC
                  </p>
                  <p className="font-bold text-text-primary">
                    {metrics.topicsMastered}/{metrics.totalTopics}
                  </p>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-text-primary mb-4">
                Cân bằng kiến thức {totalPages > 1 && `(Nhóm ${currentPage + 1})`}
              </h3>
              <div className="h-64 flex flex-col items-center justify-center">
                {paginatedRadarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={paginatedRadarData}>
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
                        name="Điểm"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 border-dashed p-8 text-center w-full">
                    <p className="text-slate-400 text-sm font-medium">
                      Chưa có dữ liệu phân tích
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 bg-slate-50 text-slate-600 text-sm p-3 rounded-xl flex gap-2 items-start border border-slate-100">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5 opacity-50" />
                <p>
                  {radarData.length > 0
                    ? 'Biểu đồ thể hiện mức độ nắm vững các chủ đề khác nhau.'
                    : 'Thực hiện thêm bài Quiz để hệ thống phân tích cân bằng kiến thức của bạn.'}
                </p>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-primary">Xu hướng sẵn sàng</h3>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                  <TrendingUp size={12} /> {readinessScore}%
                </span>
              </div>
              <div className="h-64 flex flex-col justify-center items-center">
                {trendData.length > 0 && trendData.some((d) => d.score > 0) ? (
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
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 border-dashed p-8 text-center w-full">
                    <p className="text-slate-400 text-sm font-medium">
                      Chưa có biểu đồ xu hướng
                    </p>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-slate-500 mt-4">30 ngày qua</p>
            </div>
          </div>

          {/* Topic Analysis Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-text-primary">
                Phân tích chủ đề {totalPages > 1 && <span className="text-sm font-normal text-slate-400 ml-2">(Nhóm {currentPage + 1} / {totalPages})</span>}
              </h3>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPageLocal((p: number) => p - 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPageLocal((p: number) => p + 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
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
                  {paginatedTopics.length > 0 ? (
                    paginatedTopics.map((topic, i) => (
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
                                className={`h-full ${
                                  topic.score > 80
                                    ? 'bg-success'
                                    : topic.score > 60
                                    ? 'bg-accent'
                                    : 'bg-danger'
                                }`}
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
