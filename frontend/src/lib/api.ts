const API_BASE_URL = '/api';

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

export type AuthPayload = {
  token: string;
  user?: UserItem;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  streak: number;
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
  };
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

export type LeaderboardItem = {
  userId: string;
  rank: number;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  quiz: number;
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

export type AssistantAction = {
  type: 'highlight' | 'click' | 'focus' | 'scroll_to';
  target: string;
  selector?: string;
  instruction?: string;
  durationMs?: number;
};

export type AssistantGuideResponse = {
  message: string;
  actions?: AssistantAction[];
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

  updateProfile: (token: string, payload: Partial<UserItem>) =>
    request<{ user: UserItem }>('/users/profile', { method: 'PUT', token, body: payload }),

  getExams: (token: string) => request<{ exams: ExamItem[] }>('/exams', { token }),
  createExam: (token: string, data: any) =>
    request<{ exam: ExamItem }>('/exams', { method: 'POST', token, body: data }),
  updateExam: (token: string, id: string, data: any) =>
    request<{ exam: ExamItem }>(`/exams/${id}`, { method: 'PUT', token, body: data }),
  getExamReadiness: (token: string, examId: string) =>
    request<ExamReadinessData>(`/exams/${examId}/readiness`, { token }),

  getStudyPlans: (token: string) => request<{ studyPlans: StudyPlanItem[] }>('/study-plans', { token }),
  createStudyPlan: (token: string, data: any) =>
    request<any>('/study-plans', { method: 'POST', token, body: data }),

  getProgressOverview: (token: string) =>
    request<any>('/progress/overview', { token }),

  createSession: (token: string, data: any) =>
    request<any>('/progress/sessions', { method: 'POST', token, body: data }),

  getQuizzes: (token: string) => request<{ quizzes: QuizItem[] }>('/quizzes', { token }),
  createQuiz: (token: string, data: any) =>
    request<{ quiz: QuizItem }>('/quizzes', { method: 'POST', token, body: data }),
  submitQuiz: (token: string, id: string, answers: any[]) =>
    request<any>(`/quizzes/${id}/submit`, { method: 'POST', token, body: { answers } }),
  getQuizHistory: (token: string) =>
    request<{ results: any[] }>('/quizzes/results/history', { token }),

  getDocuments: (token: string) => request<{ documents: DocumentItem[] }>('/documents', { token }),
  uploadDocument: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/documents', { method: 'POST', token, body: formData });
  },
  deleteDocument: (token: string, id: string) =>
    request<any>(`/documents/${id}`, { method: 'DELETE', token }),

  getNotifications: (token: string) =>
    request<{ notifications: NotificationItem[] }>('/notifications', { token }),
  getLeaderboard: (token: string) =>
    request<{ leaderboard: LeaderboardItem[] }>('/users/leaderboard', { token }),
  createSystemNotification: (token: string, payload: { title: string; message: string; metadata?: Record<string, any> }) =>
    request<{ notification: NotificationItem }>('/notifications/system', { method: 'POST', token, body: payload }),
  createSystemEventNotification: (
    token: string,
    payload: { event: string; data?: Record<string, any> }
  ) => request<{ notification: NotificationItem }>('/notifications/system-event', { method: 'POST', token, body: payload }),
  markNotificationRead: (token: string, id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PUT', token }),
  markAllNotificationsRead: (token: string) =>
    request<any>('/notifications/read-all', { method: 'PUT', token }),
  askAiAssistant: (
    token: string,
    payload: {
      message: string;
      uiContext: {
        currentPage: string;
        pageTitle?: string;
        path?: string;
        semanticTargets?: Record<string, string>;
        visibleActions?: Array<{
          selector: string;
          kind: string;
          label: string;
        }>;
      };
    }
  ) => request<AssistantGuideResponse>('/ai-assistant/guide', { method: 'POST', token, body: payload }),

  // Gamification
  getGamificationOverview: (token: string) =>
    request<GamificationOverview>('/gamification/overview', { token }),
  getAchievements: (token: string) =>
    request<{ achievements: AchievementItem[] }>('/gamification/achievements', { token }),
  getLeaderboard: (token: string, limit?: number) =>
    request<{ userRank: number | null; leaderboard: LeaderboardItem[] }>(
      `/gamification/leaderboard${limit ? `?limit=${limit}` : ''}`,
      { token }
    ),
};

