const API_BASE_URL = '/api';

const cache = new Map<string, { data: any; ts: number }>();
const TTL = 60000; // 1 minute

async function request<T>(url: string, options: any = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    data = { message: raw };
  }

  if (!response.ok) {
    const errorMessage = data?.message || `Lỗi Server (${response.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
}

const inflight = new Map<string, Promise<any>>();

async function cachedRequest<T>(cacheKey: string, url: string, options: any = {}): Promise<T> {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return hit.data as T;
  }

  // Deduplicate in-flight requests
  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = request<T>(url, options).then((data) => {
    cache.set(cacheKey, { data, ts: Date.now() });
    inflight.delete(cacheKey);
    return data;
  }).catch((err) => {
    inflight.delete(cacheKey);
    throw err;
  });

  inflight.set(cacheKey, promise);
  return promise;
}

export type AuthPayload = {
  token?: string;
  user?: UserItem;
  requires2FA?: boolean;
  tempToken?: string;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  avatar?: string;
  studyGoal?: string;
  subjects?: string[];
  preferences?: {
    studyTime?: string;
    dailyGoal?: number;
    quizDifficulty?: string;
    notificationType?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    dailyReminderEnabled?: boolean;
    dailyReminderTime?: string;
    systemUpdates?: boolean;
    dataSharing?: boolean;
  };
  twoFactorEnabled?: boolean;
};

export type ExamItem = {
  _id: string;
  name: string;
  subject: string;
  examDate: string;
  readinessScore: number;
  topicsMastered: number;
  totalTopics: number;
  isActive: boolean;
};

export type ExamReadinessData = {
  exam: ExamItem & { daysRemaining: number };
  readinessScore: number;
  metrics: {
    quizAccuracy: number;
    totalHours: number;
    topicsMastered: number;
    totalTopics: number;
  };
  radarData: Array<{ subject: string; A: number }>;
  trendData: Array<{ day: string; score: number }>;
  topics: Array<{
    name: string;
    score: number;
    time: string;
    status: string;
    color: string;
  }>;
};

export type StudyPlanItem = {
  _id: string;
  subject: string;
  tasks: Array<{
    _id: string;
    title: string;
    duration: string;
    type: string;
    status: string;
    time?: string;
  }>;
};

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type DocumentItem = {
  _id: string;
  name: string;
  type: string;
  pages: number;
  fileUrl: string;
  fileSize: number;
  status: string;
  content?: string;
  createdAt: string;
};

export type QuestionItem = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type QuizItem = {
  _id: string;
  user: string;
  document?: string | { _id: string; name: string; type: string };
  title: string;
  subject?: string;
  format: 'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận';
  questions: QuestionItem[];
  totalQuestions: number;
  createdAt: string;
};

export type AchievementItem = {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  isUnlocked: boolean;
  progress: number;
  current: number;
  target: number;
};

export type CommentItem = {
  _id: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
};

export type PostItem = {
  _id: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  likes: string[];
  comments: CommentItem[];
  createdAt: string;
};

export type LeaderboardItem = {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
};

export type GamificationOverview = {
  user: {
    name: string;
    avatar: string;
    xp: number;
    level: number;
    streak: number;
    levelProgress: number;
    nextLevelXP: number;
  };
  achievements: {
    total: number;
    unlocked: number;
    list: AchievementItem[];
  };
  leaderboard: {
    userRank: number | null;
    top: LeaderboardItem[];
  };
  newAchievements: Array<{
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  }>;
};

export const api = {
  register: (data: any) => request<AuthPayload & { message: string }>('/auth/register', { method: 'POST', body: data }),
  login: (data: any) => request<AuthPayload & { message: string }>('/auth/login', { method: 'POST', body: data }),
  
  googleLogin: (credential: string) =>
    request<{ message: string } & AuthPayload>('/auth/google', { method: 'POST', body: { credential } }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>(`/auth/reset-password/${token}`, { method: 'POST', body: { password } }),

  getMe: (token: string) => request<{ user: UserItem }>('/auth/me', { token }),

  // 2FA Methods
  setup2FA: (token: string) =>
    request<{ qrCodeUrl: string; secret: string }>('/auth/2fa/setup', { method: 'POST', token }),
  
  verifySetup2FA: (token: string, otpCode: string) =>
    request<{ message: string }>('/auth/2fa/verify-setup', { method: 'POST', token, body: { otpCode } }),

  disable2FA: (token: string, otpCode: string) =>
    request<{ message: string }>('/auth/2fa/disable', { method: 'POST', token, body: { otpCode } }),

  verify2FALogin: (tempToken: string, otpCode: string) =>
    request<AuthPayload & { message: string }>('/auth/2fa/login', { method: 'POST', body: { tempToken, otpCode } }),

  updateProfile: (token: string, payload: Partial<UserItem>) =>
    request<{ user: UserItem }>('/users/profile', { method: 'PUT', token, body: payload }),

  getExams: (token: string) => cachedRequest<{ exams: ExamItem[] }>('exams', '/exams', { token }),
  createExam: (token: string, data: any) =>
    request<{ exam: ExamItem }>('/exams', { method: 'POST', token, body: data }),
  updateExam: (token: string, id: string, data: any) =>
    request<{ exam: ExamItem }>(`/exams/${id}`, { method: 'PUT', token, body: data }),
  getExamReadiness: (token: string, examId: string) =>
    cachedRequest<ExamReadinessData>(`readiness_${examId}`, `/exams/${examId}/readiness`, { token }),

  getStudyPlans: (token: string) => request<{ studyPlans: StudyPlanItem[] }>('/study-plans', { token }),
  createStudyPlan: (token: string, data: any) =>
    request<any>('/study-plans', { method: 'POST', token, body: data }),

  getProgressOverview: (token: string) =>
    cachedRequest<any>('progress_overview', '/progress/overview', { token }),

  createSession: (token: string, data: any) =>
    request<any>('/progress/sessions', { method: 'POST', token, body: data }),

  getQuizzes: (token: string) => request<{ quizzes: QuizItem[] }>('/quizzes', { token }),
  createQuiz: (token: string, data: any) =>
    request<{ quiz: QuizItem }>('/quizzes', { method: 'POST', token, body: data }),
  submitQuiz: (token: string, id: string, answers: any[]) =>
    request<any>(`/quizzes/${id}/submit`, { method: 'POST', token, body: { answers } }),
  getQuizHistory: (token: string) =>
    cachedRequest<{ results: any[] }>('quiz_history', '/quizzes/results/history', { token }),

  getDocuments: (token: string) => cachedRequest<{ documents: DocumentItem[] }>('documents', '/documents', { token }),
  uploadDocument: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/documents', { method: 'POST', token, body: formData });
  },

  deleteDocument: (token: string, id: string) =>
    request<any>(`/documents/${id}`, { method: 'DELETE', token }),

  getNotifications: (token: string) =>
    request<{ notifications: NotificationItem[] }>('/notifications', { token }),
  markNotificationRead: (token: string, id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PUT', token }),
  markAllNotificationsRead: (token: string) =>
    request<any>('/notifications/read-all', { method: 'PUT', token }),

  // Gamification
  getGamificationOverview: (token: string) =>
    cachedRequest<GamificationOverview>('gamification_overview', '/gamification/overview', { token }),
  getAchievements: (token: string) =>
    cachedRequest<{ achievements: AchievementItem[] }>('achievements', '/gamification/achievements', { token }),
  getLeaderboard: (token: string, limit?: number) =>
    cachedRequest<{ userRank: number | null; leaderboard: LeaderboardItem[] }>(
      `leaderboard_${limit || 10}`,
      `/gamification/leaderboard${limit ? `?limit=${limit}` : ''}`,
      { token }
    ),
  // Community / Posts
  getPosts: (token: string, search?: string) =>
    request<{ count: number; posts: PostItem[] }>(`/posts${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token }),
  
  createPost: (token: string, data: { content: string; image?: string }) =>
    request<{ message: string; post: PostItem }>('/posts', { method: 'POST', token, body: data }),
  
  uploadPostImage: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>('/posts/upload-image', { method: 'POST', token, body: formData });
  },

  toggleLike: (token: string, postId: string) =>
    request<{ message: string; likesCount: number; isLiked: boolean }>(`/posts/${postId}/like`, { method: 'PUT', token }),
  
  addComment: (token: string, postId: string, content: string) =>
    request<{ message: string; comments: CommentItem[] }>(`/posts/${postId}/comments`, { method: 'POST', token, body: { content } }),

  invalidateCache: (key?: string) => {
    if (key) cache.delete(key);
    else cache.clear();
  },
};


