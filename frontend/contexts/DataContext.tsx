import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, Course, User, Role, Activity, Classroom, Teacher, Class, Department, Major } from '../types';
import { buildAvatarUrl } from '../utils/avatar';
import {
  studentsApi, teachersApi, classesApi, coursesApi,
  classroomsApi, usersApi, activitiesApi, authApi, setAuthToken, getAuthToken, departmentsApi, majorsApi, schedulesApi
} from '../services/api';
import { useToast } from './ToastContext';

interface DataContextType {
  students: Student[];
  studentTotalElements: number;
  fetchStudentsPage: (page: number, size: number, keyword?: string, status?: string, classId?: string, sort?: string) => Promise<void>;
  teachers: Teacher[];
  courses: Course[];
  classrooms: Classroom[];
  classes: Class[];
  departments: Department[];
  majors: Major[];
  users: User[];
  activities: Activity[];

  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  batchDeleteStudents: (ids: Set<string>) => void;
  batchUpdateStudentStatus: (ids: Set<string>, status: Student['status']) => void;
  moveStudent: (fromId: string, toId: string) => void;

  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  batchDeleteTeachers: (ids: Set<string>) => void;
  batchUpdateTeacherStatus: (ids: Set<string>, status: Teacher['status']) => void;

  addClass: (cls: Class) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  batchDeleteClasses: (ids: Set<string>) => void;

  addCourse: (course: Course) => void;
  deleteCourse: (id: string) => void;
  updateCourse: (course: Course) => void;

  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (classroom: Classroom) => void;
  deleteClassroom: (id: string) => void;
  batchDeleteClassrooms: (ids: Set<string>) => void;

  addDepartment: (department: Department) => void;
  updateDepartment: (department: Department) => void;
  deleteDepartment: (id: string) => void;
  batchDeleteDepartments: (ids: Set<string>) => void;
  addMajor: (major: Major) => void;
  updateMajor: (major: Major) => void;
  deleteMajor: (id: string) => void;
  batchDeleteMajors: (ids: Set<string>) => void;

  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUserStatus: (ids: Set<string>, status: 'active' | 'locked') => void;

  resetData: () => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
  refreshData: (options?: { activitiesParams?: { keyword?: string; category?: string; level?: string; startDate?: string; endDate?: string } }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  profileId: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentTotalElements, setStudentTotalElements] = useState(0);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const showToast = useToast();

  const normalizeStudent = (s: any): Student => ({
    ...s,
    class: s.classId || s.class || '',
    gpa: parseFloat(s.gpa) || 0,
    attendance: parseFloat(s.attendance) || 0,
  });

  const loadFromApi = useCallback(async (
    roleOverride?: string,
    profileIdOverride?: string | null,
    activitiesParams?: { keyword?: string; category?: string; level?: string; startDate?: string; endDate?: string },
    usernameOverride?: string
  ) => {
    try {
      // Use roleOverride if provided, otherwise fallback to currentUser state
      const role = roleOverride || currentUser?.role || 'student';
      const effectiveProfileId = profileIdOverride !== undefined ? profileIdOverride : profileId;

      const activityUser = usernameOverride || currentUser?.username;

      if (role === 'admin') {
        const [studentsRes, teachersRes, classesRes, coursesRes, classroomsRes, activitiesRes, departmentsRes, majorsRes, usersRes] =
          await Promise.all([
            studentsApi.getAll(),
            teachersApi.getAll(),
            classesApi.getAll(),
            coursesApi.getAll(),
            classroomsApi.getAll(),
            activitiesApi.getAll(0, 50, activitiesParams),
            departmentsApi.getAll(),
            majorsApi.getAll(),
            usersApi.getAll()
          ]);

        setStudents((studentsRes.content || []).map((s: any) => ({
          ...s,
          class: s.classId || s.class || '',
          gpa: parseFloat(s.gpa) || 0,
          attendance: parseFloat(s.attendance) || 0,
        })));
        setTeachers(teachersRes.content || []);
        setClasses(classesRes.content || []);
        setCourses(coursesRes.content || []);
        setClassrooms(classroomsRes.content || []);
        setActivities(activitiesRes.content || []);
        setDepartments(departmentsRes.content || []);
        setMajors(majorsRes.content || []);
        setUsers(usersRes.content || []);
      } else if (role === 'teacher') {
        const [classesRes, coursesRes, classroomsRes, activitiesRes, departmentsRes, profileRes, scheduleRes] =
          await Promise.all([
            classesApi.getAll(),
            effectiveProfileId ? coursesApi.getByTeacher(effectiveProfileId) : coursesApi.getAll(),
            classroomsApi.getAll(),
            activitiesApi.getAll(0, 50, { ...(activitiesParams || {}), ...(activityUser ? { user: activityUser } : {}) }),
            departmentsApi.getAll(),
            Promise.resolve(null),
            effectiveProfileId ? schedulesApi.getForTeacher(effectiveProfileId) : Promise.resolve([])
          ]);

        const scopedCourses = coursesRes.content || [];
        const scopedStudentsById = new Map<string, Student>();

        const studentLists = await Promise.all(
          scopedCourses.map((course: Course) =>
            coursesApi.getStudents(course.id).catch(() => [])
          )
        );

        studentLists.forEach((list: any[]) => {
          list.forEach((student: any) => {
            if (!student?.id) return;
            scopedStudentsById.set(student.id, normalizeStudent(student));
          });
        });

        const scopedStudents = Array.from(scopedStudentsById.values());
        const classKeys = new Set(
          scopedStudents.flatMap((s: any) => [s.class, s.classId]).filter(Boolean)
        );
        const scopedClasses = (classesRes.content || []).filter((cls: Class) =>
          classKeys.has(cls.id) || classKeys.has(cls.name)
        );

        const classroomIds = new Set(
          (scheduleRes || [])
            .map((item: any) => item?.classroom?.id)
            .filter(Boolean)
        );
        const scopedClassrooms = (classroomsRes.content || []).filter((room: Classroom) =>
          classroomIds.has(room.id)
        );

        setStudents(scopedStudents);
        setStudentTotalElements(scopedStudents.length);
        setClasses(scopedClasses);
        setCourses(scopedCourses);
        setClassrooms(scopedClassrooms);
        setActivities(activitiesRes.content || []);
        setDepartments(departmentsRes.content || []);
        setMajors([]);
        setTeachers(profileRes ? [profileRes] : []);
        setUsers([]);
      } else {
        // Student role
        const [coursesRes, classroomsRes, departmentsRes, profileRes] =
          await Promise.all([
            coursesApi.getAll(),
            classroomsApi.getAll(),
            departmentsApi.getAll(),
            effectiveProfileId ? studentsApi.getById(effectiveProfileId) : Promise.resolve(null)
          ]);

        setCourses(coursesRes.content || []);
        setClassrooms(classroomsRes.content || []);
        setDepartments(departmentsRes.content || []);
        setMajors([]);

        if (profileRes) {
          setStudents([normalizeStudent(profileRes)]);
          setStudentTotalElements(1);
        } else {
          setStudents([]);
          setStudentTotalElements(0);
        }

        setTeachers([]);
        setClasses([]);
        setUsers([]);
        setActivities([]);
      }
    } catch (apiError) {
      console.error("FATAL ERROR IN PROMISE.ALL (loadFromApi):", apiError);
    }
  }, [profileId]); // Keep profileId dependency to react if it changes outside of direct overrides

  const fetchStudentsPage = useCallback(async (page: number, size: number, keyword?: string, status?: string, classId?: string, sort?: string) => {
    try {
      if (currentUser?.role === 'teacher') {
        const scopedCourses = courses || [];
        const studentLists = await Promise.all(
          scopedCourses.map((course: Course) =>
            coursesApi.getStudents(course.id).catch(() => [])
          )
        );

        const byId = new Map<string, Student>();
        studentLists.forEach((list: any[]) => {
          list.forEach((student: any) => {
            if (!student?.id) return;
            byId.set(student.id, normalizeStudent(student));
          });
        });

        let filtered = Array.from(byId.values());
        const kw = (keyword || '').trim().toLowerCase();
        if (kw) {
          filtered = filtered.filter((s) =>
            s.name?.toLowerCase().includes(kw) ||
            s.studentNumber?.toLowerCase().includes(kw) ||
            s.id?.toLowerCase().includes(kw)
          );
        }
        if (status && status !== '全部') {
          filtered = filtered.filter((s) => s.status === status);
        }
        if (classId && classId !== '全部') {
          filtered = filtered.filter((s: any) => (s.classId || s.class) === classId);
        }
        if (sort) {
          const [key, direction] = sort.split(',');
          const dir = direction === 'desc' ? -1 : 1;
          filtered.sort((a: any, b: any) => {
            const av = a[key];
            const bv = b[key];
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          });
        }

        const start = page * size;
        const pageContent = filtered.slice(start, start + size);
        setStudents(pageContent);
        setStudentTotalElements(filtered.length);
        return;
      }

      const data = await studentsApi.getPage(page, size, keyword, status, classId, sort);
      setStudents((data.content || []).map(normalizeStudent));
      setStudentTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error("Failed to fetch students page", err);
    }
  }, [currentUser?.role, courses]);

  const refreshData = useCallback(async (options?: { activitiesParams?: { keyword?: string; category?: string; level?: string; startDate?: string; endDate?: string } }) => {
    setIsLoading(true);
    setError(null);
    const token = getAuthToken() || localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      try {
        // Fetch current user info first
        const me = await authApi.me();
        const detectedRole = (me.role || 'student').toLowerCase();
          setCurrentUser({
          id: me.id,
          name: me.name,
          username: me.username,
          email: me.email,
          role: detectedRole as any,
          avatar: me.avatar || buildAvatarUrl(me.id || me.username || me.name),
          status: me.status as any,
          lastLogin: me.lastLogin
        });
        // Store the linked student/teacher entity ID from backend
        setProfileId(me.profileId || null);
        // Pass role and profileId explicitly to avoid stale closure issues in loadFromApi
        await loadFromApi(detectedRole, me.profileId, options?.activitiesParams, me.username);
      } catch (err) {
        console.error('Session restore failed:', err);
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setCurrentUser(null);
        setProfileId(null);
        setError('登录会话已过期，请重新登录');
      }
    }
    setIsLoading(false);
  }, [loadFromApi]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const exportData = () => {
    const data = { students, teachers, courses, classrooms, classes, departments, majors, users, activities };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `SmartSMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const importData = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.students) setStudents(data.students);
      if (data.teachers) setTeachers(data.teachers);
      if (data.courses) setCourses(data.courses);
      if (data.classrooms) setClassrooms(data.classrooms);
      if (data.classes) setClasses(data.classes);
      if (data.departments) setDepartments(data.departments);
      if (data.majors) setMajors(data.majors);
      if (data.users) setUsers(data.users);
      if (data.activities) setActivities(data.activities);
      return true;
    } catch {
      return false;
    }
  };

  const resetData = () => {
    refreshData();
  };

  const addStudent = async (student: Student) => {
    try {
      const created = await studentsApi.create({
        name: student.name,
        studentNumber: student.studentNumber,
        age: student.age,
        gender: student.gender,
        email: student.email,
        classId: student.class,
        enrollmentDate: student.enrollmentDate,
        gpa: student.gpa,
        attendance: student.attendance,
        status: student.status,
        avatar: student.avatar,
      });
      setStudents(prev => [{
        id: created.id,
        studentNumber: created.studentNumber,
        name: created.name,
        age: created.age,
        gender: created.gender,
        email: created.email,
        class: created.classId || '',
        enrollmentDate: created.enrollmentDate,
        gpa: created.gpa,
        attendance: created.attendance,
        status: created.status,
        avatar: created.avatar,
      }, ...prev]);
      try {
        const usersRes = await usersApi.getAll();
        setUsers(usersRes.content || []);
      } catch { }
      showToast(`学生「${student.name}」添加成功`, 'success');
    } catch (err: any) {
      showToast(err.message || '创建学生失败', 'error');
      throw new Error(err.message || '创建学生失败');
    }
  };

  const updateStudent = async (student: Student) => {
    try {
      const updated = await studentsApi.update(student.id, {
        name: student.name,
        studentNumber: student.studentNumber,
        age: student.age,
        gender: student.gender,
        email: student.email,
        classId: student.class,
        enrollmentDate: student.enrollmentDate,
        gpa: student.gpa,
        attendance: student.attendance,
        status: student.status,
        avatar: student.avatar,
      });
      setStudents(prev => prev.map(s => s.id === student.id ? {
        ...s,
        id: updated.id,
        studentNumber: updated.studentNumber,
        name: updated.name,
        age: updated.age,
        gender: updated.gender,
        email: updated.email,
        class: updated.classId || s.class,
        enrollmentDate: updated.enrollmentDate,
        gpa: updated.gpa,
        attendance: updated.attendance,
        status: updated.status,
        avatar: updated.avatar,
      } : s));
      try { const usersRes = await usersApi.getAll(); setUsers(usersRes.content || []); } catch { }
      try { const classesRes = await classesApi.getAll(); setClasses(classesRes.content || []); } catch { }
      showToast(`学生「${student.name}」信息已更新`, 'success');
    } catch (err: any) {
      showToast(err.message || '更新学生失败', 'error');
      throw new Error(err.message || '更新学生失败');
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await studentsApi.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      try { const usersRes = await usersApi.getAll(); setUsers(usersRes.content || []); } catch { }
      try { const classesRes = await classesApi.getAll(); setClasses(classesRes.content || []); } catch { }
      showToast('学生已删除', 'success');
    } catch (err: any) {
      showToast(err.message || '删除学生失败', 'error');
    }
  };

  const batchDeleteStudents = async (ids: Set<string>) => {
    try {
      await Promise.all(Array.from(ids).map(id => studentsApi.delete(id)));
      setStudents(prev => prev.filter(s => !ids.has(s.id)));
      try { const usersRes = await usersApi.getAll(); setUsers(usersRes.content || []); } catch { }
      showToast(`已删除 ${ids.size} 名学生`, 'success');
    } catch (err: any) {
      showToast(err.message || '批量删除失败', 'error');
    }
  };

  const batchUpdateStudentStatus = (ids: Set<string>, status: Student['status']) => {
    setStudents(prev => prev.map(s => ids.has(s.id) ? { ...s, status } : s));
  };

  const moveStudent = (fromId: string, toId: string) => {
    setStudents(prev => {
      const fromIdx = prev.findIndex(s => s.id === fromId);
      const toIdx = prev.findIndex(s => s.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const newArr = [...prev];
      const [item] = newArr.splice(fromIdx, 1);
      newArr.splice(toIdx, 0, item);
      return newArr;
    });
  };

  const normalizeTeacherStatus = (status?: string) => {
    if (!status) return '在职';
    if (status === 'active') return '在职';
    if (status === 'on_leave') return '休假';
    if (status === 'resigned') return '离职';
    return status;
  };

  const addTeacher = async (teacher: Teacher) => {
    try {
      const created = await teachersApi.create({
        name: teacher.name,
        teacherNumber: teacher.teacherNumber,
        title: teacher.title,
        department: teacher.department,
        email: teacher.email,
        phone: teacher.phone,
        status: normalizeTeacherStatus(teacher.status),
        avatar: teacher.avatar,
        joinDate: teacher.joinDate,
        researchArea: teacher.researchArea,
      });
      setTeachers(prev => [{ ...teacher, id: created.id }, ...prev]);
      // Refresh users list to reflect backend creation of associated user
      try {
        const usersRes = await usersApi.getAll();
        setUsers(usersRes.content || []);
      } catch { }
    } catch (err: any) {
      throw new Error(err.message || '录入教师失败');
    }
  };

  const updateTeacher = async (teacher: Teacher) => {
    try {
      await teachersApi.update(teacher.id, {
        name: teacher.name,
        teacherNumber: teacher.teacherNumber,
        title: teacher.title,
        department: teacher.department,
        email: teacher.email,
        phone: teacher.phone,
        status: normalizeTeacherStatus(teacher.status),
        avatar: teacher.avatar,
        joinDate: teacher.joinDate,
        researchArea: teacher.researchArea,
      });
      setTeachers(prev => prev.map(t => t.id === teacher.id ? teacher : t));
      // Refresh users list to reflect backend sync of associated user
      try {
        const usersRes = await usersApi.getAll();
        setUsers(usersRes.content || []);
      } catch { }
    } catch (err: any) {
      throw new Error(err.message || '更新教师失败');
    }
  };

  const deleteTeacher = async (id: string) => {
    await teachersApi.delete(id);
    setTeachers(prev => prev.filter(t => t.id !== id));
    // Refresh users list to reflect backend cascade deletion of associated user
    try {
      const usersRes = await usersApi.getAll();
      setUsers(usersRes.content || []);
    } catch { }
  };

  const batchDeleteTeachers = async (ids: Set<string>) => {
    await Promise.all(Array.from(ids).map(id => teachersApi.delete(id)));
    setTeachers(prev => prev.filter(t => !ids.has(t.id)));
    // Refresh users list to reflect backend cascade deletion
    try {
      const usersRes = await usersApi.getAll();
      setUsers(usersRes.content || []);
    } catch { }
  };

  const batchUpdateTeacherStatus = (ids: Set<string>, status: Teacher['status']) => {
    setTeachers(prev => prev.map(t => ids.has(t.id) ? { ...t, status } : t));
  };

  const addClass = async (cls: Class) => {
    const created = await classesApi.create({
      name: cls.name,
      department: cls.department,
      advisorId: cls.advisorId,
      year: cls.year,
      status: cls.status,
    });
    setClasses(prev => [{ ...cls, id: created.id }, ...prev]);
  };

  const updateClass = async (cls: Class) => {
    await classesApi.update(cls.id, cls);
    setClasses(prev => prev.map(c => c.id === cls.id ? cls : c));
  };

  const deleteClass = async (id: string) => {
    await classesApi.delete(id);
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const batchDeleteClasses = async (ids: Set<string>) => {
    await Promise.all(Array.from(ids).map(id => classesApi.delete(id)));
    setClasses(prev => prev.filter(c => !ids.has(c.id)));
  };

  const addCourse = async (course: Course) => {
    const normalizedTeacherId = (course.teacherId || '').trim();
    if (!normalizedTeacherId) {
      throw new Error('请选择授课教师');
    }

    const payload = {
      name: course.name?.trim(),
      teacherId: normalizedTeacherId,
      credits: course.credits || 1,
      maxCapacity: course.maxCapacity || 1,
      schedule: course.schedule || '',
      location: course.location || '',
    };

    const created = await coursesApi.create(payload);
    setCourses(prev => [{ ...course, id: created.id }, ...prev]);
  };

  const deleteCourse = async (id: string) => {
    await coursesApi.delete(id);
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const updateCourse = async (course: Course) => {
    await coursesApi.update(course.id, course);
    setCourses(prev => prev.map(c => c.id === course.id ? course : c));
  };

  const addClassroom = async (classroom: Classroom) => {
    const created = await classroomsApi.create({
      name: classroom.name,
      capacity: classroom.capacity,
      type: classroom.type,
      status: classroom.status,
      location: classroom.location,
      equipment: classroom.equipment,
    });
    setClassrooms(prev => [{ ...classroom, id: created.id }, ...prev]);
  };

  const updateClassroom = async (classroom: Classroom) => {
    await classroomsApi.update(classroom.id, classroom);
    setClassrooms(prev => prev.map(c => c.id === classroom.id ? classroom : c));
  };

  const deleteClassroom = async (id: string) => {
    await classroomsApi.delete(id);
    setClassrooms(prev => prev.filter(c => c.id !== id));
  };

  const batchDeleteClassrooms = async (ids: Set<string>) => {
    await Promise.all(Array.from(ids).map(id => classroomsApi.delete(id)));
    setClassrooms(prev => prev.filter(c => !ids.has(c.id)));
  };

  const addDepartment = async (department: Department) => {
    const created = await departmentsApi.create({
      name: department.name,
      code: department.code,
      description: department.description,
      manager: department.manager || null,
      contactEmail: department.contactEmail || null,
      status: department.status,
    });
    setDepartments(prev => [{ ...department, id: created.id }, ...prev]);
  };

  const updateDepartment = async (department: Department) => {
    await departmentsApi.update(department.id, {
      name: department.name,
      code: department.code,
      description: department.description,
      manager: department.manager,
      contactEmail: department.contactEmail,
      status: department.status,
    });
    setDepartments(prev => prev.map(d => d.id === department.id ? department : d));
  };

  const deleteDepartment = async (id: string) => {
    await departmentsApi.delete(id);
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  const batchDeleteDepartments = async (ids: Set<string>) => {
    await Promise.all(Array.from(ids).map(id => departmentsApi.delete(id)));
    setDepartments(prev => prev.filter(d => !ids.has(d.id)));
  };

  const addMajor = async (major: Major) => {
    const created = await majorsApi.create({
      name: major.name,
      code: major.code,
      departmentId: major.departmentId,
      description: major.description,
      head: major.head || null,
      status: major.status,
    });
    setMajors(prev => [{
      ...major,
      id: created.id,
      departmentName: created.departmentName || major.departmentName,
    }, ...prev]);
  };

  const updateMajor = async (major: Major) => {
    const updated = await majorsApi.update(major.id, {
      name: major.name,
      code: major.code,
      departmentId: major.departmentId,
      description: major.description,
      head: major.head || null,
      status: major.status,
    });
    setMajors(prev => prev.map(m => m.id === major.id ? {
      ...major,
      departmentName: updated.departmentName || major.departmentName,
    } : m));
  };

  const deleteMajor = async (id: string) => {
    await majorsApi.delete(id);
    setMajors(prev => prev.filter(m => m.id !== id));
  };

  const batchDeleteMajors = async (ids: Set<string>) => {
    await Promise.all(Array.from(ids).map(id => majorsApi.delete(id)));
    setMajors(prev => prev.filter(m => !ids.has(m.id)));
  };

  const addUser = async (user: User) => {
    const created = await usersApi.create({
      name: user.name,
      username: user.username,
      email: user.email || null,
      password: user.password || '123456',
      role: user.role.toUpperCase(),
      avatar: user.avatar,
    });
    setUsers(prev => [{ ...user, id: created.id }, ...prev]);

    // Refresh students or teachers data to reflect bidirectional sync (backend creates entity profile)
    if (user.role === 'student') {
      const studentsRes = await studentsApi.getAll();
      setStudents(studentsRes.content || []);
    } else if (user.role === 'teacher') {
      const teachersRes = await teachersApi.getAll();
      setTeachers(teachersRes.content || []);
    }
  };

  const updateUser = async (id: string, user: Partial<User>) => {
    const updated = await usersApi.update(id, {
      ...user,
      role: user.role?.toUpperCase(),
    });
    const mappedUser = { ...updated, role: updated.role.toLowerCase() as Role };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...mappedUser } : u));

    // Sync with currentUser if necessary
    if (currentUser && id === currentUser.id) {
      setCurrentUser(prev => prev ? { ...prev, ...mappedUser } : null);
    }

    // Refresh students or teachers data if the user role matches, to reflect bidirectional sync changes
    if (mappedUser.role === 'student') {
      const studentsRes = await studentsApi.getAll();
      setStudents(studentsRes.content || []);
    } else if (mappedUser.role === 'teacher') {
      const teachersRes = await teachersApi.getAll();
      setTeachers(teachersRes.content || []);
    }
  };

  const deleteUser = async (id: string) => {
    // Get user role before deletion to know which list to refresh
    const userToDelete = users.find(u => u.id === id);
    await usersApi.delete(id);
    setUsers(prev => prev.filter(u => u.id !== id));

    // Refresh students or teachers data if the deleted user was a student/teacher
    if (userToDelete?.role === 'student') {
      const studentsRes = await studentsApi.getAll();
      setStudents(studentsRes.content || []);
    } else if (userToDelete?.role === 'teacher') {
      const teachersRes = await teachersApi.getAll();
      setTeachers(teachersRes.content || []);
    }
  };

  const updateUserStatus = (ids: Set<string>, status: 'active' | 'locked') => {
    setUsers(prev => prev.map(u => ids.has(u.id) ? { ...u, status } : u));
  };

  return (
    <DataContext.Provider value={{
      students,
      studentTotalElements,
      fetchStudentsPage,
      teachers, courses, classrooms, classes, departments, majors, users, activities, isLoading, error,
      addStudent, updateStudent, deleteStudent, batchDeleteStudents, batchUpdateStudentStatus, moveStudent,
      addTeacher, updateTeacher, deleteTeacher, batchDeleteTeachers, batchUpdateTeacherStatus,
      addClass, updateClass, deleteClass, batchDeleteClasses,
      addCourse, deleteCourse, updateCourse,
      addClassroom, updateClassroom, deleteClassroom, batchDeleteClassrooms,
      addDepartment, updateDepartment, deleteDepartment, batchDeleteDepartments,
      addMajor, updateMajor, deleteMajor, batchDeleteMajors,
      addUser, updateUser, deleteUser, updateUserStatus,
      resetData, exportData, importData, refreshData,
      currentUser, setCurrentUser, profileId
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
