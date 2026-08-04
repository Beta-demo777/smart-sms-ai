const API_BASE = '/api';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    let errorMessage = errorData.message || `HTTP ${response.status}`;

    // Check for Spring Boot validation errors map
    if (errorData.errors && typeof errorData.errors === 'object') {
      const msgs = Object.values(errorData.errors);
      if (msgs.length > 0) {
        errorMessage = msgs.join(', ');
      }
    }

    throw new Error(errorMessage);
  }
  return response.json();
};

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  register: async (data: { name: string; email: string; password: string; role: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  logout: async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    setAuthToken(null);
  },

  me: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

export const studentsApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/students?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getPage: async (page = 0, size = 15, keyword?: string, status?: string, classId?: string, sort?: string) => {
    let url = `${API_BASE}/students?page=${page}&size=${size}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (status && status !== '全部') url += `&status=${encodeURIComponent(status)}`;
    if (classId && classId !== '全部') url += `&classId=${encodeURIComponent(classId)}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/students/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getStats: async () => {
    const res = await fetch(`${API_BASE}/students/stats`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const teachersApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/teachers?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/teachers/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/teachers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/teachers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/teachers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const classesApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/classes?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/classes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/classes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/classes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const departmentsApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/departments?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/departments/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const majorsApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/majors?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/majors/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/majors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/majors/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/majors/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const coursesApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/courses?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getByTeacher: async (teacherId: string, page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/courses?page=${page}&size=${size}&teacherId=${teacherId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },

  getStudents: async (courseId: string) => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/students`, { headers: getHeaders() });
    return handleResponse(res);
  },

  enrollStudent: async (courseId: string, studentId: string) => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/enroll/${studentId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 400) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Enrollment failed');
      }
      throw new Error('Enrollment failed');
    }
  },

  dropStudent: async (courseId: string, studentId: string) => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/enroll/${studentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 400) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Drop failed');
      }
      throw new Error('Drop failed');
    }
  },
};

export const classroomsApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/classrooms?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/classrooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/classrooms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/classrooms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const usersApi = {
  getAll: async (page = 0, size = 100) => {
    const res = await fetch(`${API_BASE}/users?page=${page}&size=${size}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const filesApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
    return handleResponse(res);
  },
};

export const activitiesApi = {
  getAll: async (page = 0, size = 50, params?: {
    user?: string;
    keyword?: string;
    category?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (params?.user) searchParams.append('user', params.user);
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.category && params.category !== 'all') searchParams.append('category', params.category);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const res = await fetch(`${API_BASE}/activities?${searchParams.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  exportCsv: async (params?: {
    keyword?: string;
    category?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.category && params.category !== 'all') searchParams.append('category', params.category);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const res = await fetch(`${API_BASE}/activities/export?${searchParams.toString()}`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};

export const riskApi = {
  getStudents: async (limit = 30) => {
    const res = await fetch(`${API_BASE}/risk/students?limit=${encodeURIComponent(String(limit))}`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

export const aiApi = {
  chat: async (message: string, context?: string, userId?: string, sessionId?: string) => {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, context, userId, sessionId }),
    });
    return handleResponse(res);
  },

  getUserSessions: async (userId: string) => {
    const res = await fetch(`${API_BASE}/ai/sessions?userId=${userId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  renameSession: async (sessionId: string, title: string, userId?: string) => {
    const res = await fetch(`${API_BASE}/ai/sessions/${sessionId}/title`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ title, userId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Rename failed' }));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
  },

  deleteSession: async (sessionId: string, userId?: string) => {
    const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/ai/sessions/${sessionId}${suffix}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
  },

  generateReport: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/ai/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentId }),
    });
    return handleResponse(res);
  },
};

export const examsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/exams`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getByCourse: async (courseId: string) => {
    const res = await fetch(`${API_BASE}/exams/course/${courseId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: any, courseId: string) => {
    // Backend expects courseId as a RequestParam
    const res = await fetch(`${API_BASE}/exams?courseId=${courseId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const scoresApi = {
  getByExam: async (examId: string) => {
    const res = await fetch(`${API_BASE}/scores/exam/${examId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getByStudent: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/scores/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  recordScore: async (examId: string, studentId: string, value: number, feedback: string) => {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ examId, studentId, value, feedback }),
    });
    return handleResponse(res);
  },

  getStudentStats: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/scores/stats/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

export const attendanceApi = {
  checkIn: async (data: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'; notes?: string; date?: string }) => {
    const res = await fetch(`${API_BASE}/attendance/checkin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  createRecord: async (data: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'; notes?: string; date?: string }) => {
    const res = await fetch(`${API_BASE}/attendance/records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getStudentAttendance: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/attendance/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getDailyAttendance: async (date: string) => {
    const res = await fetch(`${API_BASE}/attendance/daily/${date}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getMonthlyAttendance: async (year: number, month: number) => {
    const res = await fetch(`${API_BASE}/attendance/monthly/${year}/${month}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  deleteAttendance: async (id: string) => {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    // the backend might return 204 No Content, so we shouldn't fail if body is empty
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return true;
  },
};

export const attendanceSessionsApi = {
  create: async (data: {
    title: string;
    courseId: string;
    teacherId: string;
    startAt: string;
    endAt: string;
  }) => {
    const res = await fetch(`${API_BASE}/attendance/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getTeacherSessions: async (teacherId: string) => {
    const res = await fetch(`${API_BASE}/attendance/sessions/teacher/${teacherId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getActiveSessionsForStudent: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/attendance/sessions/active/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  checkInBySession: async (sessionId: string, studentId: string, checkinCode: string) => {
    const res = await fetch(`${API_BASE}/attendance/sessions/${sessionId}/checkin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentId, checkinCode }),
    });
    return handleResponse(res);
  },

  closeSession: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/attendance/sessions/${sessionId}/close`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

export const leavesApi = {
  submitRequest: async (data: { studentId: string; type: string; startDate: string; endDate: string; reason: string }) => {
    const res = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  reviewRequest: async (id: string, data: { reviewerId: string; status: 'APPROVED' | 'REJECTED'; comment: string }) => {
    const res = await fetch(`${API_BASE}/leaves/${id}/review`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getPendingRequests: async () => {
    const res = await fetch(`${API_BASE}/leaves/pending`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getStudentRequests: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/leaves/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getReviewerRequests: async (reviewerId: string) => {
    const res = await fetch(`${API_BASE}/leaves/reviewer/${reviewerId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getAllRequests: async () => {
    const res = await fetch(`${API_BASE}/leaves/all`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

export const schedulesApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/schedules`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getForStudent: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/schedules/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getForTeacher: async (teacherId: string) => {
    const res = await fetch(`${API_BASE}/schedules/teacher/${teacherId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (data: {
    courseId: string;
    classroomId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    semester: string
  }) => {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: string, data: {
    courseId: string;
    classroomId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    semester: string
  }) => {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Delete failed');
  },
};

export const settingsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    return handleResponse(res);
  },
  update: async (key: string, value: string, description?: string) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value, description }),
    });
    return handleResponse(res);
  },
};

export const aiConfigApi = {
  get: async () => {
    const res = await fetch(`${API_BASE}/admin/ai-config`, { headers: getHeaders() });
    return handleResponse(res);
  },
  update: async (payload: {
    provider: 'remote' | 'local';
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    ollamaTimeout?: number;
    ollamaApiKey?: string;
    ollamaChatPath?: string;
    ollamaCompletionPath?: string;
  }) => {
    const res = await fetch(`${API_BASE}/admin/ai-config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
  test: async () => {
    const res = await fetch(`${API_BASE}/admin/ai-config/test`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

export const notificationsApi = {
  getUserNotifications: async (userId: string, role?: string) => {
    const res = await fetch(`${API_BASE}/notifications/user/${userId}${role ? `?role=${role.toUpperCase()}` : ''}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getAll: async () => {
    const res = await fetch(`${API_BASE}/notifications/all`, { headers: getHeaders() });
    return handleResponse(res);
  },
  create: async (data: { userId?: string; targetRole?: string; title: string; message: string; type: string }) => {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  markAsRead: async (id: string) => {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
  },
  markAllAsRead: async (userId: string) => {
    await fetch(`${API_BASE}/notifications/user/${userId}/read-all`, {
      method: 'PUT',
      headers: getHeaders(),
    });
  },
  delete: async (id: string) => {
    await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },
};

export const assignmentsApi = {
  getForStudent: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/assignments/student/${studentId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getForTeacher: async (teacherId: string) => {
    const res = await fetch(`${API_BASE}/assignments/teacher/${teacherId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getStudentSubmissions: async (studentId: string) => {
    const res = await fetch(`${API_BASE}/assignments/student/${studentId}/submissions`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getSubmissionsByAssignment: async (assignmentId: string) => {
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, { headers: getHeaders() });
    return handleResponse(res);
  },

  submit: async (data: { assignmentId: string; studentId: string; content: string; fileUrl?: string }) => {
    const res = await fetch(`${API_BASE}/assignments/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  create: async (data: {
    title: string;
    description: string;
    dueDate: string;
    courseId: string;
    teacherId: string;
  }) => {
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (assignmentId: string, data: {
    title: string;
    description: string;
    dueDate: string;
  }) => {
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (assignmentId: string) => {
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    // DELETE /assignments/{id} returns 204 No Content
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }
    return true;
  },

  gradeSubmission: async (submissionId: string, data: { grade: number; feedback: string }) => {
    const res = await fetch(`${API_BASE}/assignments/submissions/${submissionId}/grade`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
