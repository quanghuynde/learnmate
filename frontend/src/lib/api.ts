const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const cache = new Map<string, { data: any; ts: number }>();
const TTL = 60000; // 1 minute

async function request<T>(url: string, options: any = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const timeoutMs = options.timeout || 30000;
  const maxRetries = options.retries ?? (url.includes('/status') ? 2 : 0);

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const executeRequest = async (attempt: number = 0): Promise<T> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
        signal: controller.signal
      });

      clearTimeout(id);

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        data = { message: raw };
      }

      if (!response.ok) {
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest(attempt + 1);
        }

        const errorMessage = data?.message || `Lỗi Server (${response.status})`;
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error(`Yêu cầu quá thời gian (${timeoutMs/1000}s). Vui lòng thử lại.`);
      }
      throw err;
    }
  };

  return executeRequest();
}

const inflight = new Map<string, Promise<any>>();

async function cachedRequest<T>(cacheKey: string, url: string, options: any = {}): Promise<T> {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL) {
    return hit.data as T;
  }

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
  currentCredits?: number;
  monthlyXP?: number;
  lastCreditReset?: string;
};

export type PackageItem = {
  _id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
};

export type CreditTransactionItem = {
  _id: string;
  userId: string;
  amount: number;
  type: 'add' | 'deduct';
  description: string;
  feature?: string;
  createdAt: string;
};

export type UsageLogItem = {
  _id: string;
  feature: string;
  creditsUsed: number;
  status: string;
  createdAt: string;
  metadata?: any;
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

export type StudyPlanTask = {
  _id: string;
  title: string;
  duration: string;
  type: 'Đọc tài liệu' | 'Thực hành' | 'Ôn tập' | 'Xem video' | 'Khác';
  status: 'todo' | 'doing' | 'done';
  time: string;
};

export type WeeklyGoal = {
  _id?: string;
  text: string;
  completed: boolean;
};

export type StudyPlanItem = {
  _id: string;
  subject: string;
  date: string;
  examDate?: string;
  intensity: 'light' | 'moderate' | 'intense';
  weakTopics: string[];
  weeklyGoals: WeeklyGoal[];
  tasks: StudyPlanTask[];
  createdAt: string;
};

export type KnowledgeMapNode = {
  id: string;
  label: string;
  children?: KnowledgeMapNode[];
  subjectId?: string;
  color?: string;
  status?: 'done' | 'doing' | 'todo';
};

export type KnowledgeMapData = {
  tree?: KnowledgeMapNode;
  documentSources?: string[];
  aiInsight?: string;
  subjects?: Array<{ id: string; label: string; color: string }>;
  topics?: Array<{ id: string; label: string; subjectId: string; status: 'done' | 'doing' | 'todo' }>;
  connections?: Array<{ from: string; to: string }>;
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
  summary?: string;
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

export type WorkshopRating = {
  _id: string;
  user: { _id: string; name: string; avatar?: string };
  score: number;
  comment: string;
  createdAt: string;
};

export type WorkshopItem = {
  _id: string;
  host: { _id: string; name: string; avatar?: string };
  title: string;
  description: string;
  topic: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  platform: 'google_meet' | 'zoom' | 'other';
  maxAttendees: number;
  creditCost: number;
  attendees: { _id: string; name: string; avatar?: string }[];
  ratings: WorkshopRating[];
  averageRating: number;
  createdAt: string;
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
  // Auth
  register: (data: any) => request<AuthPayload & { message: string }>('/auth/register', { method: 'POST', body: data }),
  login: (data: any) => request<AuthPayload & { message: string }>('/auth/login', { method: 'POST', body: data }),
  googleLogin: (credential: string) => request<{ message: string } & AuthPayload>('/auth/google', { method: 'POST', body: { credential } }),
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  verifyForgotOTP: (email: string, otpCode: string) => request<AuthPayload & { message: string }>('/auth/verify-forgot-otp', { method: 'POST', body: { email, otpCode } }),
  resetPassword: (token: string, password: string) => request<{ message: string }>(`/auth/reset-password/${token}`, { method: 'POST', body: { password } }),
  getMe: (token: string) => request<{ user: UserItem }>('/auth/me', { token }),

  // 2FA
  setup2FA: (token: string) => request<{ qrCodeUrl: string; secret: string }>('/auth/2fa/setup', { method: 'POST', token }),
  verifySetup2FA: (token: string, otpCode: string) => request<{ message: string }>('/auth/2fa/verify-setup', { method: 'POST', token, body: { otpCode } }),
  disable2FA: (token: string, otpCode: string) => request<{ message: string }>('/auth/2fa/disable', { method: 'POST', token, body: { otpCode } }),
  verify2FALogin: (tempToken: string, otpCode: string) => request<AuthPayload & { message: string }>('/auth/2fa/login', { method: 'POST', body: { tempToken, otpCode } }),

  // User
  updateProfile: (token: string, payload: Partial<UserItem>) => request<{ user: UserItem }>('/users/profile', { method: 'PUT', token, body: payload }),

  // Exams
  getExams: (token: string) => cachedRequest<{ exams: ExamItem[] }>('exams', '/exams', { token }),
  createExam: (token: string, data: any) => request<{ exam: ExamItem }>('/exams', { method: 'POST', token, body: data }),
  updateExam: (token: string, id: string, data: any) => request<{ exam: ExamItem }>(`/exams/${id}`, { method: 'PUT', token, body: data }),
  getExamReadiness: (token: string, examId: string) => cachedRequest<ExamReadinessData>(`readiness_${examId}`, `/exams/${examId}/readiness`, { token }),

  // Study Plans
  getStudyPlans: (token: string, date?: string) => request<{ studyPlans: StudyPlanItem[] }>(`/study-plans${date ? `?date=${date}` : ''}`, { token }),
  createStudyPlan: (token: string, data: any) => request<{ studyPlan: StudyPlanItem }>('/study-plans', { method: 'POST', token, body: data }),
  updateStudyPlan: (token: string, id: string, data: any) => request<{ studyPlan: StudyPlanItem }>(`/study-plans/${id}`, { method: 'PUT', token, body: data }),
  updateTaskStatus: (token: string, planId: string, taskId: string, status: 'todo' | 'doing' | 'done') => request<{ studyPlan: StudyPlanItem }>(`/study-plans/${planId}/tasks/${taskId}`, { method: 'PUT', token, body: { status } }),
  deleteStudyPlan: (token: string, id: string) => request<{ message: string }>(`/study-plans/${id}`, { method: 'DELETE', token }),

  // Progress
  getProgressOverview: (token: string) => cachedRequest<any>('progress_overview', '/progress/overview', { token }),
  createSession: (token: string, data: any) => request<any>('/progress/sessions', { method: 'POST', token, body: data }),

  // Quizzes
  getQuizzes: (token: string) => request<{ quizzes: QuizItem[] }>('/quizzes', { token }),
  createQuiz: (token: string, data: any) => request<{ quiz: QuizItem }>('/quizzes', { method: 'POST', token, body: data }),
  submitQuiz: (token: string, id: string, answers: any[]) => request<any>(`/quizzes/${id}/submit`, { method: 'POST', token, body: { answers } }),
  deleteQuiz: (token: string, id: string) => request<{ message: string }>(`/quizzes/${id}`, { method: 'DELETE', token }),
  getQuizHistory: (token: string) => cachedRequest<{ results: any[] }>('quiz_history', '/quizzes/results/history', { token }),

  // Documents
  getDocuments: (token: string) => cachedRequest<{ documents: DocumentItem[] }>('documents', '/documents', { token }),
  uploadDocument: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/documents', { method: 'POST', token, body: formData });
  },
  deleteDocument: (token: string, id: string) => request<any>(`/documents/${id}`, { method: 'DELETE', token }),

  // Notifications
  getNotifications: (token: string) => request<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications', { token }),
  markNotificationRead: (token: string, id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT', token }),
  markAllNotificationsRead: (token: string) => request<any>('/notifications/read-all', { method: 'PUT', token }),

  // Gamification
  getGamificationOverview: (token: string) => cachedRequest<GamificationOverview>('gamification_overview', '/gamification/overview', { token }),
  getAchievements: (token: string) => cachedRequest<{ achievements: AchievementItem[] }>('achievements', '/gamification/achievements', { token }),
  getLeaderboard: (token: string, limit: number = 10, type: string = 'monthly', month?: number, year?: number) =>
    cachedRequest<{ userRank: number | null; leaderboard: LeaderboardItem[] }>(
      `leaderboard_${limit}_${type}_${month || ''}_${year || ''}`,
      `/gamification/leaderboard?limit=${limit}&type=${type}${month !== undefined ? `&month=${month}` : ''}${year !== undefined ? `&year=${year}` : ''}`,
      { token }
    ),

  // Community
  getPosts: (token: string, search?: string) => request<{ count: number; posts: PostItem[] }>(`/posts${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token }),
  createPost: (token: string, data: { content: string; image?: string }) => request<{ message: string; post: PostItem }>('/posts', { method: 'POST', token, body: data }),
  uploadPostImage: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>('/posts/upload-image', { method: 'POST', token, body: formData });
  },
  toggleLike: (token: string, postId: string) => request<{ message: string; likesCount: number; isLiked: boolean }>(`/posts/${postId}/like`, { method: 'PUT', token }),
  addComment: (token: string, postId: string, content: string) => request<{ message: string; comments: CommentItem[] }>(`/posts/${postId}/comments`, { method: 'POST', token, body: { content } }),

  // Workshops
  getWorkshops: (token: string, params?: { topic?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.topic) qs.set('topic', params.topic);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ workshops: WorkshopItem[]; total: number; page: number }>(`/workshops${query}`, { token });
  },
  createWorkshop: (token: string, data: Partial<WorkshopItem>) => request<{ message: string; workshop: WorkshopItem }>('/workshops', { method: 'POST', token, body: data }),
  getWorkshopById: (token: string, id: string) => request<{ workshop: WorkshopItem }>(`/workshops/${id}`, { token }),
  registerWorkshop: (token: string, id: string) => request<{ message: string; attendeesCount: number }>(`/workshops/${id}/register`, { method: 'POST', token }),
  cancelWorkshopRegistration: (token: string, id: string) => request<{ message: string }>(`/workshops/${id}/register`, { method: 'DELETE', token }),
  rateWorkshop: (token: string, id: string, score: number, comment: string) => request<{ message: string; averageRating: number }>(`/workshops/${id}/rate`, { method: 'POST', token, body: { score, comment } }),
  deleteWorkshop: (token: string, id: string) => request<{ message: string }>(`/workshops/${id}`, { method: 'DELETE', token }),

  // AI
  generateDialogue: (token: string, data: { documentId: string; language: string; speakerFemaleName: string; speakerMaleName: string }) => request<{ dialogue: any[] }>('/ai/generate-dialogue', { method: 'POST', token, body: data, timeout: 120000 }),
  generateKnowledgeMap: (token: string, documentIds: string[], title?: string) => request<{ mapData: KnowledgeMapData; mapId: string; title: string }>('/ai/generate-knowledge-map', { method: 'POST', token, body: { documentIds, title }, timeout: 180000 }),
  getKnowledgeMaps: (token: string) => request<{ maps: any[] }>('/ai/knowledge-maps', { token }),
  getKnowledgeMapById: (token: string, id: string) => request<{ mapData: KnowledgeMapData; title: string }>(`/ai/knowledge-maps/${id}`, { token }),
  deleteKnowledgeMap: (token: string, id: string) => request<{ message: string }>(`/ai/knowledge-maps/${id}`, { method: 'DELETE', token }),
  summarizeDocument: (token: string, documentId: string) => request<{ summary: string; history: any[]; cached?: boolean }>('/ai/summarize', { method: 'POST', token, body: { documentId }, timeout: 120000 }),
  chatWithDocument: (token: string, documentId: string, message: string, history: any[]) => request<{ content: string }>('/ai/chat-document', { method: 'POST', token, body: { documentId, message, history }, timeout: 60000 }),
  generateQuiz: (token: string, data: any) => request<{ text: string; hintNames: string }>('/ai/generate-quiz', { method: 'POST', token, body: data, timeout: 180000 }),
  
  // Assistant
  askAssistantGuide: (token: string, message: string, uiContext: any, history: any[]) => request<{ message: string; actions: any[] }>('/ai-assistant/guide', { method: 'POST', token, body: { message, uiContext, history }, timeout: 60000 }),

  // Payment
  getPackages: (token: string) => request<{ packages: PackageItem[] }>('/payments/packages', { token }),
  createPayOSCheckout: (token: string, packageId: string) => request<any>('/payments/checkout', { method: 'POST', token, body: { packageId } }),
  getPaymentStatus: (token: string, paymentId: string) => request<{ status: string }>(`/payments/${paymentId}/status`, { token }),
  getCreditHistory: (token: string) => request<{ transactions: CreditTransactionItem[] }>('/payments/credits/history', { token }),
  getAIUsageLogs: (token: string) => request<{ logs: UsageLogItem[] }>('/payments/credits/usage', { token }),

  // Cache Control
  invalidateCache: (key?: string) => {
    if (key) cache.delete(key);
    else cache.clear();
  },
};
