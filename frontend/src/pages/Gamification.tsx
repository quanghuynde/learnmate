import { useState, useEffect } from 'react'
import { Gamepad2, Trophy, Star, Lock, TrendingUp, Award, Zap } from 'lucide-react'
import { api, GamificationOverview } from '../lib/api'
import { UserAvatar } from '../components/ui/UserAvatar'

export function Gamification({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<GamificationOverview | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const overview = await api.getGamificationOverview(token)
      setData(overview)
    } catch (error: any) {
      console.error(error)
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

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Không thể tải dữ liệu</p>
      </div>
    )
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-slate-100 text-slate-700 border-slate-300'
      case 'rare':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'epic':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'legendary':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  const filteredAchievements = data.achievements.list.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'unlocked') return a.isUnlocked
    if (filter === 'locked') return !a.isUnlocked
    return a.category === filter
  })

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Gamepad2 className="text-primary" /> Gamification
        </h1>
        <p className="text-slate-500">Huy hiệu, thành tích và bảng xếp hạng</p>
      </div>

      {/* User Stats Card */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl overflow-hidden">
              <UserAvatar avatar={data.user.avatar} className="w-full h-full text-4xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{data.user.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  <Star size={16} /> Level {data.user.level}
                </span>
                <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  <Zap size={16} /> {data.user.xp} XP
                </span>
                <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  🔥 {data.user.streak} ngày
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tiến độ Level {data.user.level}</span>
              <span>{data.user.levelProgress}%</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${data.user.levelProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-white/80">
              Còn {data.user.nextLevelXP - data.user.xp} XP để lên Level {data.user.level + 1}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Achievements Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <Trophy className="text-yellow-500 mb-2" size={32} />
              <p className="text-3xl font-bold text-slate-900">{data.achievements.unlocked}</p>
              <p className="text-sm text-slate-500">Huy hiệu đã mở</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <Award className="text-primary mb-2" size={32} />
              <p className="text-3xl font-bold text-slate-900">{data.achievements.total}</p>
              <p className="text-sm text-slate-500">Tổng huy hiệu</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <TrendingUp className="text-green-500 mb-2" size={32} />
              <p className="text-3xl font-bold text-slate-900">
                {Math.round((data.achievements.unlocked / data.achievements.total) * 100)}%
              </p>
              <p className="text-sm text-slate-500">Hoàn thành</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="flex gap-2 flex-wrap">
              {['all', 'unlocked', 'locked', 'quiz', 'study', 'streak', 'subject'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' && 'Tất cả'}
                  {f === 'unlocked' && 'Đã mở'}
                  {f === 'locked' && 'Chưa mở'}
                  {f === 'quiz' && 'Quiz'}
                  {f === 'study' && 'Học tập'}
                  {f === 'streak' && 'Streak'}
                  {f === 'subject' && 'Môn học'}
                </button>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement._id}
                className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                  achievement.isUnlocked
                    ? getRarityColor(achievement.rarity)
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{achievement.isUnlocked ? achievement.icon : <Lock size={32} className="text-slate-400" />}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{achievement.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{achievement.description}</p>
                    
                    {!achievement.isUnlocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Tiến độ</span>
                          <span>{achievement.current}/{achievement.target}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${achievement.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-primary">+{achievement.xpReward} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 h-fit">
          <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Top tuần
          </h3>

          {data.leaderboard.userRank && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-600 mb-1">Hạng của bạn</p>
              <p className="text-2xl font-bold text-primary">#{data.leaderboard.userRank}</p>
            </div>
          )}

          <div className="space-y-3">
            {data.leaderboard.top.map((user) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  user.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  user.rank === 1 ? 'bg-yellow-400 text-white' :
                  user.rank === 2 ? 'bg-slate-300 text-white' :
                  user.rank === 3 ? 'bg-orange-400 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {user.rank}
                </div>
                <UserAvatar avatar={user.avatar} className="w-10 h-10 rounded-full bg-primary/10 text-xl" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500">Level {user.level} • {user.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
