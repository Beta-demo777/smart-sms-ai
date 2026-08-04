
import { Student, Course, Activity } from './types';
import { buildAvatarUrl } from './utils/avatar';

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'S001',
    studentNumber: '2023001',
    name: '张伟',
    age: 20,
    gender: '男',
    email: 'zhang.wei@example.com',
    class: '计算机科学 21-1',
    enrollmentDate: '2021-09-01',
    gpa: 3.8,
    attendance: 98,
    status: '在读',
    avatar: buildAvatarUrl('s001')
  },
  {
    id: 'S002',
    studentNumber: '2023002',
    name: '王芳',
    age: 19,
    gender: '女',
    email: 'wang.fang@example.com',
    class: '软件工程 22-2',
    enrollmentDate: '2022-09-01',
    gpa: 3.9,
    attendance: 95,
    status: '在读',
    avatar: buildAvatarUrl('s002')
  },
  {
    id: 'S003',
    studentNumber: '2023003',
    name: '李强',
    age: 21,
    gender: '男',
    email: 'li.qiang@example.com',
    class: '人工智能 20-3',
    enrollmentDate: '2020-09-01',
    gpa: 3.2,
    attendance: 88,
    status: '在读',
    avatar: buildAvatarUrl('s003')
  },
  {
    id: 'S004',
    studentNumber: '2023004',
    name: '赵子琴',
    age: 20,
    gender: '女',
    email: 'liu.yang@example.com',
    class: '计算机科学 21-1',
    enrollmentDate: '2021-09-01',
    gpa: 3.5,
    attendance: 92,
    status: '在读',
    avatar: buildAvatarUrl('s004')
  },
  {
    id: 'S005',
    studentNumber: '2023005',
    name: '孙晓雨',
    age: 19,
    gender: '女',
    email: 'chen.jing@example.com',
    class: '软件工程 22-2',
    enrollmentDate: '2022-09-01',
    gpa: 4.0,
    attendance: 100,
    status: '在读',
    avatar: buildAvatarUrl('s005')
  }
];

export const MOCK_COURSES: Course[] = [
  { id: 'C001', name: '高等数学', teacher: '王教授', teacherAvatar: buildAvatarUrl('t1'), credits: 4, enrolled: 120, maxCapacity: 150, schedule: '周一 8:00 - 10:00' },
  { id: 'C002', name: '数据结构', teacher: '李博士', teacherAvatar: buildAvatarUrl('t2'), credits: 3, enrolled: 85, maxCapacity: 100, schedule: '周二 14:00 - 16:00' },
  { id: 'C003', name: '人工智能导论', teacher: '张专家', teacherAvatar: buildAvatarUrl('t3'), credits: 3, enrolled: 60, maxCapacity: 60, schedule: '周三 10:00 - 12:00' },
  { id: 'C004', name: '大学英语', teacher: 'Prof. Smith', teacherAvatar: buildAvatarUrl('t4'), credits: 2, enrolled: 150, maxCapacity: 200, schedule: '周四 8:00 - 10:00' },
  { id: 'C005', name: '操作系统', teacher: '赵老师', teacherAvatar: buildAvatarUrl('t5'), credits: 4, enrolled: 90, maxCapacity: 120, schedule: '周五 14:00 - 16:00' }
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', user: '教务处', action: '录入新学生', target: '陈静', time: '10分钟前', type: 'success' },
  { id: '2', user: '李博士', action: '更新了课程', target: '数据结构', time: '1小时前', type: 'info' },
  { id: '3', user: '系统', action: '检测到缺勤异常', target: '李强', time: '3小时前', type: 'warning' },
  { id: '4', user: 'Admin', action: '发布了校内通知', target: '所有学生', time: '昨天', type: 'info' },
];
