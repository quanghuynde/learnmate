import { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Trophy, Flame, Star, ShieldCheck, Rocket, Medal, BookOpen } from 'lucide-react';
import { api, UserItem } from '../lib/api';

interface GamificationProps {
  token: string;
  user: UserItem | null;
}

export function Gamification({ token, user }: GamificationProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [progressRes, leaderboardRes] = await Promise.all([
          api.getProgressOverview(token),
          api.getLeaderboard(token),
        ]);

        setOverview(progressRes);

        if (user?.id) {
          const found = (leaderboardRes.leaderboard || []).find((x) => x.userId === user.id);
          setRank(found ? found.rank : null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu gamification');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, user?.id]);

  const badges = useMemo(() => {
    const xp = user?.xp || 0;
    const streak = user?.streak || 0;
    const quizzes = overview?.totalQuizzes || 0;
    const totalHours = overview?.totalHours || 0;

    return [
      {
        key: 'khoi-dau-tot',
        title: 'Khởi đầu tốt',
        desc: 'Hoàn thành bài quiz đầu tiên',
        unlocked: quizzes >= 1,
        icon: Rocket,
      },
      {
        key: 'kien-tri',
        title: 'Kiên trì',
        desc: 'Duy trì streak từ 7 ngày',
        unlocked: streak >= 7,
        icon: Flame,
      },
      {
        key: 'nguoi-hoc-khong-met-moi',
        title: 'Người học không mệt mỏi',
        desc: 'Đạt từ 20 giờ học trong 30 ngày',
        unlocked: totalHours >= 20,
        icon: ShieldCheck,
      },
      {
        key: 'hoc-gia',
        title: 'Học giả',
        desc: 'Đạt level 7 hoặc 3000 XP',
        unlocked: xp >= 3000,
        icon: BookOpen,
      },
      {
        key: 'cao-thu-xp',
        title: 'Cao thủ XP',
        desc: 'Đạt 5000 XP',
        unlocked: xp >= 5000,
        icon: Star,
      },
    ];
  }, [overview, user?.streak, user?.xp]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Đang tải dữ liệu gamification...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">{error}</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gamepad2 className="text-primary" /> Gamification
        </h1>
        <p className="text-slate-500">Tiến độ và huy hiệu được cập nhật từ dữ liệu thật.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">XP hiện tại</p>
          <p className="text-2xl font-bold text-slate-900">{user?.xp || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Level</p>
          <p className="text-2xl font-bold text-slate-900">{user?.level || 1}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Streak</p>
          <p className="text-2xl font-bold text-slate-900">{user?.streak || 0} ngày</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Hạng cộng đồng</p>
          <p className="text-2xl font-bold text-slate-900">{rank ? `#${rank}` : '--'}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Medal size={18} className="text-primary" /> Huy hiệu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.key} className={`rounded-2xl border p-4 ${badge.unlocked ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badge.unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{badge.title}</p>
                    <p className="text-sm text-slate-600">{badge.desc}</p>
                    <p className={`text-xs font-bold mt-2 ${badge.unlocked ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {badge.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-primary" /> Tổng kết 30 ngày
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Tổng giờ học</p>
            <p className="text-xl font-bold text-slate-900">{overview?.totalHours || 0}h</p>
          </div>
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Quiz đã làm</p>
            <p className="text-xl font-bold text-slate-900">{overview?.totalQuizzes || 0}</p>
          </div>
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Trung bình/ngày</p>
            <p className="text-xl font-bold text-slate-900">{overview?.avgDaily || 0}h</p>
          </div>
        </div>
      </div>
    </div>
  )
}
