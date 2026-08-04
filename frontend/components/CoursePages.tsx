
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { coursesApi } from '../services/api';
import { PageType, User } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import {
  Search,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  BookmarkPlus,
  Library,
  BookmarkCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  User as UserIcon
} from 'lucide-react';

export const MyCoursesPage: React.FC<{ onNavigate?: (page: PageType) => void }> = ({ onNavigate }) => {
  const { courses, students, profileId, refreshData } = useData();
  const showToast = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const me = students.find(s => s.id === profileId);
  const enrolledCourseIds = me?.enrolledCourses || [];
  const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));

  const handleDrop = async (courseId: string) => {
    if (!profileId) return;
    setIsLoading(courseId);
    try {
      await coursesApi.dropStudent(courseId, profileId);
      showToast('退课成功', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(error.message || '退选失败', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleEnterClassroom = (course: any) => {
    localStorage.setItem('scheduleIntent', JSON.stringify({
      source: 'my-courses',
      courseId: course.id,
      courseName: course.name,
      at: Date.now(),
    }));
    if (onNavigate) {
      onNavigate('schedule');
      return;
    }
    localStorage.setItem('activePage', 'schedule');
    window.location.reload();
  };

  if (enrolledCourses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in duration-500 py-20">
        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
          <BookOpen size={32} className="text-zinc-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">暂无修读课程</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">您目前还没有选修任何课程。请前往“校园选课”页面进行选择。</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enrolledCourses.map(course => (
          <div key={course.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-colors group overflow-hidden">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center text-white dark:text-zinc-900">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 transition-colors line-clamp-1" title={course.name}>{course.name}</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-1" title={course.id}>课程编号: {course.id.split('-')[0]}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{course.credits}</p>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase">学分</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl">
                <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">任课教师</p>
                <div className="flex items-center gap-2">
                  <img
                    src={resolveAvatar(course.teacherAvatar, course.teacher)}
                    className="w-5 h-5 rounded-full object-cover"
                    alt={course.teacher}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = buildAvatarUrl(course.teacher);
                    }}
                  />
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-300 truncate">{course.teacher || '待分配'}</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl">
                <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">上课时间</p>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                  <Clock size={14} />
                  <span className="text-sm font-bold">{course.schedule.split(' ')[0]}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                <CheckCircle2 size={16} /> 正常修读中
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDrop(course.id)}
                  disabled={isLoading === course.id}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading === course.id ? '处理中...' : '退选'}
                </button>
                <button
                  onClick={() => handleEnterClassroom(course)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-black hover:bg-black dark:hover:bg-zinc-200 transition-all"
                >
                  进入课堂 <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CampusCoursesPage: React.FC<{ user: User }> = ({ user }) => {
  const { courses, students, profileId, refreshData } = useData();
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const isStudent = user.role === 'student';
  const me = students.find(s => s.id === profileId);
  const enrolledCourseIds = me?.enrolledCourses || [];

  const handleEnroll = async (courseId: string) => {
    if (!profileId) return;
    setIsLoading(courseId);
    try {
      await coursesApi.enrollStudent(courseId, profileId);
      showToast('选课成功', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(error.message || '选课失败', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!profileId) return;
    setIsLoading(courseId);
    try {
      await coursesApi.dropStudent(courseId, profileId);
      showToast('退选成功', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(error.message || '退选失败', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Library size={16} className="text-zinc-400" />
            校园选课 <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md text-[10px]">{courses.length}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索课程名称或教师..."
              className="pl-9 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400 w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900 p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 max-w-7xl mx-auto">
          {filtered.map(course => {
            const isEnrolled = enrolledCourseIds.includes(course.id);
            const isFull = (course.enrolled || 0) >= (course.maxCapacity || 0);

            return (
              <div key={course.id} className="group bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-sm hover:shadow-md flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isEnrolled ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                    <BookOpen size={18} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black w-fit ml-auto bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 uppercase truncate max-w-[80px]" title={course.id}>{course.id.split('-')[0]}</p>
                  </div>
                </div>

                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-1 leading-snug group-hover:underline decoration-2 underline-offset-4 decoration-zinc-900/10 dark:decoration-zinc-100/10 line-clamp-2" title={course.name}>{course.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <img
                    src={resolveAvatar(course.teacherAvatar, course.teacher)}
                    className="w-4 h-4 rounded-full grayscale opacity-70 object-cover"
                    alt={course.teacher}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = buildAvatarUrl(course.teacher);
                    }}
                  />
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide truncate">{course.teacher || '待分配'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-center">学分</p>
                    <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 text-center">{course.credits}</p>
                  </div>
                  <div className="px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-center">容量</p>
                    <p className={`text-sm font-black text-center ${isFull ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>{course.enrolled}/{course.maxCapacity}</p>
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  {isStudent ? (
                    isEnrolled ? (
                      <button disabled className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-default">
                        <CheckCircle2 size={14} /> 已选修
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={isFull || isLoading === course.id}
                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isFull
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700'
                          : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 shadow-lg shadow-zinc-200 dark:shadow-none'
                          }`}
                      >
                        <BookmarkPlus size={14} /> {isLoading === course.id ? '正在选课...' : isFull ? '名额已满' : '确认选课'}
                      </button>
                    )
                  ) : (
                    <button className="w-full py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                      <TrendingUp size={14} /> 课程数据
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
