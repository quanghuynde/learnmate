import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Flame, MessageSquare, Heart, Share2, Image as ImageIcon, Send } from 'lucide-react';
import { api, LeaderboardItem, UserItem } from '../lib/api';

interface CommunityProps {
  token: string;
  user: UserItem | null;
}

export function Community({ token, user }: CommunityProps) {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const posts: any[] = [];

  const loadLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await api.getLeaderboard(token);
      setLeaderboard(res.leaderboard || []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    loadLeaderboard().catch(() => null);
  }, [token]);

  const myRank = useMemo(() => {
    if (!user?.id) return null;
    const found = leaderboard.find((item) => item.userId === user.id);
    return found ? found.rank : null;
  }, [leaderboard, user?.id]);

  useEffect(() => {
    if (!user?.id || !token || !myRank) return;

    const rankKey = `learnmate_last_rank_${user.id}`;
    const notifyKey = `learnmate_drop_top3_${user.id}`;
    const lastRank = Number(localStorage.getItem(rankKey));

    const handleDropOut = async () => {
      const signature = `${lastRank}->${myRank}`;
      if (localStorage.getItem(notifyKey) === signature) return;

      await api.createSystemEventNotification(token, {
        event: 'leaderboard_drop_top3',
        data: {
          previousRank: lastRank,
        },
      });

      localStorage.setItem(notifyKey, signature);
    };

    if (Number.isFinite(lastRank) && lastRank <= 3 && myRank > 3) {
      handleDropOut().catch(() => null);
    }

    if (myRank <= 3) {
      localStorage.removeItem(notifyKey);
    }

    localStorage.setItem(rankKey, String(myRank));
  }, [myRank, token, user?.id]);

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Trophy className="text-accent" /> Cộng đồng
          </h1>
          <p className="text-slate-500">Học cùng nhau, thành công cùng nhau</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {['Bảng xếp hạng', 'Bài viết'].map((tab, i) => {
          const id = ['leaderboard', 'posts'][i];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-6 py-3 font-medium text-sm relative transition-colors ${activeTab === id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
              {activeTab === id && <motion.div layoutId="communityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>

      {activeTab === 'leaderboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-4 pl-6 w-16">Hạng</th>
                  <th className="p-4">Sinh viên</th>
                  <th className="p-4 text-center">Điểm</th>
                  <th className="p-4 text-center">Chuỗi</th>
                  <th className="p-4 text-center">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Đang tải bảng xếp hạng...</td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Chưa có dữ liệu bảng xếp hạng.</td>
                  </tr>
                ) : (
                  leaderboard.map((entry) => {
                    const isCurrentUser = entry.userId === user?.id;
                    return (
                      <tr key={entry.userId} className={`hover:bg-slate-50 transition-colors ${isCurrentUser ? 'bg-primary/5' : ''}`}>
                        <td className="p-4 pl-6 font-bold text-slate-400">
                          {entry.rank === 1 ? <Medal className="text-accent" /> : entry.rank === 2 ? <Medal className="text-slate-400" /> : entry.rank === 3 ? <Medal className="text-orange-400" /> : `#${entry.rank}`}
                        </td>
                        <td className="p-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isCurrentUser ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {entry.avatar}
                          </div>
                          <span className={`font-medium ${isCurrentUser ? 'text-primary font-bold' : 'text-text-primary'}`}>{entry.name}</span>
                        </td>
                        <td className="p-4 text-center font-bold text-text-primary">{entry.score}</td>
                        <td className="p-4 text-center text-orange-500 font-medium flex items-center justify-center gap-1">
                          <Flame size={14} /> {entry.streak}
                        </td>
                        <td className="p-4 text-center text-slate-600">{entry.quiz}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'posts' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">YOU</div>
            <div className="flex-1">
              <textarea
                placeholder="Bạn đang nghĩ gì? Chia sẻ tiến độ hoặc đặt câu hỏi..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-primary focus:bg-white transition-colors resize-none h-24"
              ></textarea>
              <div className="flex justify-between items-center mt-3">
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                  <ImageIcon size={20} />
                </button>
                <button className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-light transition-colors flex items-center gap-2 shadow-sm">
                  <Send size={16} /> Đăng bài
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500">Chưa có bài viết nào hoạt động.</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                      {post.author
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{post.author}</h4>
                      <p className="text-xs text-slate-500 font-medium">{post.time}</p>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm mb-5 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
                    <button className="flex items-center gap-2 text-slate-500 hover:text-danger text-sm font-medium transition-colors">
                      <Heart size={18} /> {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-primary text-sm font-medium transition-colors">
                      <MessageSquare size={18} /> {post.comments}
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-primary text-sm font-medium transition-colors ml-auto">
                      <Share2 size={18} /> Chia sẻ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
