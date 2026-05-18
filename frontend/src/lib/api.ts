const API_BASE_URL = '/api';

async function request<T>(url: string, options: any = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
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
  updateExam: (token: string, id: string, data: any) =>
    request<{ exam: ExamItem }>(`/exams/${id}`, { method: 'PUT', token, body: data }),

  getStudyPlans: (token: string) => request<{ studyPlans: StudyPlanItem[] }>('/study-plans', { token }),

  getProgressOverview: (token: string) =>
    request<any>('/progress/overview', { token }),

  getQuizHistory: (token: string) =>
    request<{ results: any[] }>('/quizzes/results', { token }),

  getNotifications: (token: string) =>
    request<{ notifications: NotificationItem[] }>('/notifications', { token }),
  markNotificationRead: (token: string, id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PUT', token }),
  markAllNotificationsRead: (token: string) =>
    request<any>('/notifications/read-all', { method: 'PUT', token }),
};
