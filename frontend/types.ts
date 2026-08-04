
export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  username: string;  // 学号/工号
  email?: string;
  password?: string;
  role: Role;
  avatar: string;
  status?: 'active' | 'locked';
  lastLogin?: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  age: number;
  gender: '男' | '女';
  email: string;
  class: string;
  enrollmentDate: string;
  gpa: number;
  attendance: number;
  status: '在读' | '休学' | '毕业';
  avatar: string;
  enrolledCourses?: string[];
}

export interface Teacher {
  id: string;
  teacherNumber: string;
  name: string;
  title: string; // 职称
  department: string; // 院系
  email: string;
  phone: string;
  status: '在职' | '休假' | '离职';
  avatar: string;
  joinDate: string;
  researchArea: string;
}

export interface Class {
  id: string;
  name: string;
  department: string;
  advisor: string;
  advisorId?: string;
  studentCount: number;
  year: number;
  status: 'active' | 'graduated';
}

export interface Course {
  id: string;
  name: string;
  teacher: string;
  teacherId?: string;
  teacherAvatar: string;
  credits: number;
  enrolled: number;
  maxCapacity: number;
  schedule: string;
  location?: string;
  isEnrolled?: boolean;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  type: '普通教室' | '阶梯教室' | '多媒体实验室' | '语音室' | '会议室';
  status: '空闲' | '使用中' | '维护中';
  location: string;
  equipment: string[];
}

export interface ChatMessage {
  id?: string;
  role: 'USER' | 'MODEL';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  lastMessageAt: string;
  messages?: ChatMessage[];
}



export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  category: 'auth' | 'data' | 'security' | 'system' | 'ai';
  level: 'success' | 'info' | 'warning' | 'error';
}

export interface Exam {
  id: string;
  title: string;
  course: Course;
  date: string;
  maxScore: number;
  description?: string;
}

export interface Score {
  id: string;
  exam: Exam;
  student: Student;
  scoreValue: number;

  feedback?: string;
  gradedAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  type: 'SICK' | 'PERSONAL' | 'OTHER';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerName?: string;
  reviewComment?: string;
}

export interface ScheduleItem {
  id: string;
  course: Course;
  classroom: Classroom;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  semester: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  targetRole?: string;
  title: string;
  message: string;
  type:
    | 'TEACHING'
    | 'EXAM'
    | 'STUDENT_AFFAIRS'
    | 'ACTIVITY'
    | 'MAINTENANCE'
    | 'EMERGENCY'
    | 'INFO'
    | 'SUCCESS'
    | 'WARNING'
    | 'ERROR';
  read: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager?: string;
  contactEmail?: string;
  status: '启用' | '停用';
  createdAt?: string;
}

export type PageType =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'departments'
  | 'classrooms'
  | 'my-courses'
  | 'campus-courses'
  | 'ai-insights'
  | 'settings'
  | 'ai-assistant'
  | 'profile'
  | 'schedule'
  | 'leave'
  | 'checkin'
  | 'wiki'
  | 'grades'
  | 'assignments'
  | 'teacher-courses'
  | 'teacher-schedule'
  | 'teacher-assignments'
  | 'teacher-checkin-publish'
  | 'ai-chat'
  | 'admin-users'
  | 'admin-courses'
  | 'admin-logs'
  | 'grades-manage'
  | 'score-record'
  | 'attendance-manage'
  | 'leave-approval'
  | 'schedule-manage'
  | 'admin-notifications'
  | 'majors';

export interface Major {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName?: string;
  description?: string;
  head?: string; // 专业负责人
  status: '启用' | '停用';
}
