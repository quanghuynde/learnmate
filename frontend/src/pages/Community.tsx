import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Medal,
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Send,
  Flame,
} from 'lucide-react'
import { api, LeaderboardItem, UserItem, PostItem } from '../lib/api'
import { Search, Loader2, X, PlusCircle } from 'lucide-react'

interface CommunityProps {
  token: string
  user: UserItem | null
}

export function Community({ token, user }: CommunityProps) {
  const [activeTab, setActiveTab] = useState('posts') // Start with posts as requested
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    if (token) {
      if (activeTab === 'leaderboard') fetchLeaderboard()
      if (activeTab === 'posts') fetchPosts()
    }
  }, [token, activeTab])

  const fetchPosts = async (search?: string) => {
    setLoadingPosts(true)
    try {
      const res = await api.getPosts(token, search)
      setPosts(res.posts)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPosts(searchQuery)
  }

  useEffect(() => {
    if (searchQuery === '') {
      fetchPosts()
    }
  }, [searchQuery])

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const res = await api.getLeaderboard(token, 10)
      setLeaderboard(res.leaderboard)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const getReadyPercentage = (item: LeaderboardItem) => {
    const baseScore = Math.min(100, Math.max(0, item.xp / 10))
    return `${Math.round(baseScore)}%`
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn! Giới hạn 5MB.')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage) return
    setIsPosting(true)
    try {
      let imageUrl = ''
      if (selectedImage) {
        const uploadRes = await api.uploadPostImage(token, selectedImage)
        imageUrl = uploadRes.imageUrl
      }

      await api.createPost(token, { content: postContent, image: imageUrl })
      setPostContent('')
      setSelectedImage(null)
      setImagePreview(null)
      fetchPosts()
    } catch (err) {
      console.error('Failed to create post:', err)
      alert('Không thể đăng bài. Vui lòng thử lại.')
    } finally {
      setIsPosting(false)
    }
  }

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await api.toggleLike(token, postId)
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: res.isLiked ? [...p.likes, user?.id || ''] : p.likes.filter(id => id !== user?.id) } : p))
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  const handleAddComment = async (postId: string, content: string) => {
    if (!content.trim()) return
    try {
      const res = await api.addComment(token, postId, content)
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.comments } : p))
    } catch (err: any) {
      console.error('Failed to add comment:', err)
      alert(`Không thể thêm bình luận: ${err.message}`)
    }
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Trophy className="text-accent" /> Cộng đồng
          </h1>
          <p className="text-slate-500">Học cùng nhau, thành công cùng nhau</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-80 group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-all shadow-sm"
          />
        </form>
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
              {leaderboard[1] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-4 border-white shadow-md z-10 -mb-4 overflow-hidden">
                    {leaderboard[1].avatar ? (
                      <img src={leaderboard[1].avatar} alt={leaderboard[1].name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      leaderboard[1].name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="w-24 h-32 bg-gradient-to-t from-slate-300 to-slate-100 rounded-t-xl flex flex-col items-center justify-start pt-6 shadow-lg">
                    <span className="text-2xl font-bold text-slate-500">2</span>
                    <span className="text-xs font-medium text-slate-600 mt-1">
                      {getReadyPercentage(leaderboard[1])}
                    </span>
                  </div>
                </div>
              )}

              {leaderboard[0] && (
                <div className="flex flex-col items-center">
                  <Trophy size={32} className="text-accent mb-2 drop-shadow-md" />
                  <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent border-4 border-white shadow-md z-10 -mb-4 text-xl overflow-hidden">
                    {leaderboard[0].avatar ? (
                      <img src={leaderboard[0].avatar} alt={leaderboard[0].name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      leaderboard[0].name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="w-28 h-40 bg-gradient-to-t from-accent to-yellow-300 rounded-t-xl flex flex-col items-center justify-start pt-8 shadow-xl">
                    <span className="text-3xl font-bold text-white drop-shadow-md">
                      1
                    </span>
                    <span className="text-sm font-bold text-white mt-1">{getReadyPercentage(leaderboard[0])}</span>
                  </div>
                </div>
              )}

              {leaderboard[2] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-orange-200 flex items-center justify-center font-bold text-orange-700 border-4 border-white shadow-md z-10 -mb-4 overflow-hidden">
                    {leaderboard[2].avatar ? (
                      <img src={leaderboard[2].avatar} alt={leaderboard[2].name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      leaderboard[2].name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="w-24 h-24 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-xl flex flex-col items-center justify-start pt-4 shadow-lg">
                    <span className="text-2xl font-bold text-orange-700">3</span>
                    <span className="text-xs font-medium text-orange-800 mt-1">
                      {getReadyPercentage(leaderboard[2])}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Đang tải bảng xếp hạng...
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Chưa có dữ liệu bảng xếp hạng.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((u) => (
                    <tr
                      key={u.rank}
                      className={`hover:bg-slate-50 transition-colors ${u.userId === user?.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-4 pl-6 font-bold text-slate-400">
                        {u.rank === 1 ? (
                          <Medal className="text-accent" />
                        ) : u.rank === 2 ? (
                          <Medal className="text-slate-400" />
                        ) : u.rank === 3 ? (
                          <Medal className="text-orange-400" />
                        ) : (
                          `#${u.rank}`
                        )}
                      </td>
                      <td className="p-4 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${u.userId === user?.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            u.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span
                          className={`font-medium ${u.userId === user?.id ? 'text-primary font-bold' : 'text-text-primary'}`}
                        >
                          {u.name} {u.userId === user?.id && '(Bạn)'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-text-primary">
                        {getReadyPercentage(u)}
                      </td>
                      <td className="p-4 text-center text-orange-500 font-medium flex items-center justify-center gap-1">
                        <Flame size={14} /> {u.streak}
                      </td>
                      <td className="p-4 text-center text-slate-600">
                        {Math.floor(u.xp / 50)}
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
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div className="flex-1">
              <textarea
                placeholder="Bạn đang nghĩ gì? Chia sẻ tiến độ hoặc đặt câu hỏi..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-primary focus:bg-white transition-colors resize-none h-24"
              ></textarea>
              
              {imagePreview && (
                <div className="mt-3 relative inline-block group">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-xl border border-slate-200 shadow-sm" />
                  <button 
                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 bg-white text-danger border border-slate-200 p-1 rounded-full shadow-md hover:bg-danger hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="post-image" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                  <label 
                    htmlFor="post-image"
                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors cursor-pointer"
                  >
                    <ImageIcon size={20} />
                  </label>
                </div>
                <button 
                  onClick={handleCreatePost}
                  disabled={isPosting || (!postContent.trim() && !selectedImage)}
                  className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-light transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Đăng bài
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loadingPosts ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-slate-500 font-medium">Đang tải bài viết...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500">
                {searchQuery ? 'Không tìm thấy bài viết nào phù hợp.' : 'Chưa có bài viết nào hoạt động.'}
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post._id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 overflow-hidden">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
                      ) : (
                        post.author.name.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {post.author.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 text-sm mb-4 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.image && (
                    <div className="mb-5 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                      <img src={post.image} alt="Post content" className="w-full max-h-[500px] object-contain bg-slate-50" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
                    <button 
                      onClick={() => handleToggleLike(post._id)}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${post.likes.includes(user?.id || '') ? 'text-danger' : 'text-slate-500 hover:text-danger'}`}
                    >
                      <Heart size={18} fill={post.likes.includes(user?.id || '') ? 'currentColor' : 'none'} /> {post.likes.length}
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-primary text-sm font-medium transition-colors">
                      <MessageSquare size={18} /> {post.comments.length}
                    </button>
                    <button 
                      onClick={() => {
                        const handleShare = async (post: any) => {
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: 'Chia sẻ bài viết',
                                text: post.content,
                                url: window.location.href
                              });
                            } catch (err) {
                              console.error('Error sharing:', err);
                            }
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Đã sao chép liên kết!');
                          }
                        };
                        handleShare(post);
                      }}
                      className="flex items-center gap-2 text-slate-500 hover:text-primary text-sm font-medium transition-colors ml-auto"
                    >
                      <Share2 size={18} /> Chia sẻ
                    </button>
                  </div>

                  {/* Comments Section */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl space-y-4">
                    {post.comments.map(comment => (
                      <div key={comment._id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold border border-slate-200 overflow-hidden flex-shrink-0">
                          {comment.user.avatar ? (
                            <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
                          ) : (
                            comment.user.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-100 flex-1">
                          <p className="text-[11px] font-bold text-slate-900">{comment.user?.name || 'Người dùng'}</p>
                          <p className="text-xs text-slate-700 mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder="Viết bình luận..."
                        id={`comment-input-${post._id}`}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-xs outline-none focus:border-primary transition-all shadow-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post._id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById(`comment-input-${post._id}`) as HTMLInputElement;
                          if (input && input.value.trim()) {
                            handleAddComment(post._id, input.value);
                            input.value = '';
                          }
                        }}
                        className="text-primary p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>
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