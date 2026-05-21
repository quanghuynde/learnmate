import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Medal,
  Flame,
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Send,
} from 'lucide-react'

export function Community() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  
  // Xóa các data nháp, gán mặc định là list trống chờ kết nối backend
  const leaderboard: any[] = []
  const posts: any[] = []

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
        {['Bảng xếp hạng', 'Bài viết'].map(
          (tab, i) => {
            const id = ['leaderboard', 'posts'][i]
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-6 py-3 font-medium text-sm relative transition-colors ${activeTab === id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
                {activeTab === id && (
                  <motion.div
                    layoutId="communityTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            )
          },
        )}
      </div>

      {activeTab === 'leaderboard' && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="space-y-8"
        >
          {leaderboard.length > 0 && (
            <div className="flex justify-center items-end gap-4 h-64 pt-10">
              {/* Rank 2 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-4 border-white shadow-md z-10 -mb-4">
                  --
                </div>
                <div className="w-24 h-32 bg-gradient-to-t from-slate-300 to-slate-100 rounded-t-xl flex flex-col items-center justify-start pt-6 shadow-lg">
                  <span className="text-2xl font-bold text-slate-500">2</span>
                </div>
              </div>

              {/* Rank 1 */}
              <div className="flex flex-col items-center">
                <Trophy size={32} className="text-accent mb-2 drop-shadow-md" />
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent border-4 border-white shadow-md z-10 -mb-4 text-xl">
                  --
                </div>
                <div className="w-28 h-40 bg-gradient-to-t from-accent to-yellow-300 rounded-t-xl flex flex-col items-center justify-start pt-8 shadow-xl">
                  <span className="text-3xl font-bold text-white drop-shadow-md">
                    1
                  </span>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-orange-200 flex items-center justify-center font-bold text-orange-700 border-4 border-white shadow-md z-10 -mb-4">
                  --
                </div>
                <div className="w-24 h-24 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-xl flex flex-col items-center justify-start pt-4 shadow-lg">
                  <span className="text-2xl font-bold text-orange-700">3</span>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-4 pl-6 w-16">Hạng</th>
                  <th className="p-4">Sinh viên</th>
                  <th className="p-4 text-center">Sẵn sàng</th>
                  <th className="p-4 text-center">Chuỗi</th>
                  <th className="p-4 text-center">Quiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Chưa có dữ liệu bảng xếp hạng.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((user) => (
                    <tr
                      key={user.rank}
                      className={`hover:bg-slate-50 transition-colors ${user.rank === 4 ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-4 pl-6 font-bold text-slate-400">
                        {user.rank === 1 ? (
                          <Medal className="text-accent" />
                        ) : user.rank === 2 ? (
                          <Medal className="text-slate-400" />
                        ) : user.rank === 3 ? (
                          <Medal className="text-orange-400" />
                        ) : (
                          `#${user.rank}`
                        )}
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.rank === 4 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {user.avatar}
                        </div>
                        <span
                          className={`font-medium ${user.rank === 4 ? 'text-primary font-bold' : 'text-text-primary'}`}
                        >
                          {user.name}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-text-primary">
                        {user.score}
                      </td>
                      <td className="p-4 text-center text-orange-500 font-medium flex items-center justify-center gap-1">
                        <Flame size={14} /> {user.streak}
                      </td>
                      <td className="p-4 text-center text-slate-600">
                        {user.quiz}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'posts' && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="space-y-6 max-w-2xl mx-auto"
        >
          {/* Create Post */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              YOU
            </div>
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

          {/* Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500">
                Chưa có bài viết nào hoạt động.
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                      {post.author
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {post.author}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {post.time}
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm mb-5 leading-relaxed">
                    {post.content}
                  </p>
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
  )
}
