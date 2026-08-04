
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { 
  BookOpen, 
  CheckCircle2, 
  Sparkles,
  FileText,
  AlertCircle,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react';
import { assignmentsApi, attendanceSessionsApi, examsApi, scoresApi } from '../services/api';

export const TeacherCoursesPage: React.FC = () => {
  const { courses, profileId } = useData();
  const [activeCourseId, setActiveCourseId] = useState(courses[0]?.id || '');
  const activeCourse = useMemo(() => courses.find(c => c.id === activeCourseId) || courses[0], [activeCourseId, courses]);
  const [insights, setInsights] = useState<Array<{ type: 'warning' | 'success' | 'info'; text: string; icon: any }>>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsightsUpdating, setShowInsightsUpdating] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const insightRequestRef = useRef(0);
  const updatingDelayTimerRef = useRef<number | null>(null);
  
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const kpiStats = useMemo(() => {
    const courseCount = courses.length;
    const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
    const totalCapacity = courses.reduce((sum, c) => sum + (c.maxCapacity || 0), 0);
    const avgCredits = courseCount > 0
      ? courses.reduce((sum, c) => sum + (c.credits || 0), 0) / courseCount
      : 0;
    const capacityRate = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0;
    return {
      courseCount,
      totalEnrolled,
      avgCredits,
      capacityRate
    };
  }, [courses]);

  const [courseStats, setCourseStats] = useState({
    assignmentCount: 0,
    submissionRate: 0,
    gradingRate: 0,
    sessionCount: 0,
    openSessionCount: 0,
    avgScore: 0,
    scoreCount: 0,
  });

  const activeCapacity = activeCourse?.maxCapacity || 0;
  const activeEnrolled = activeCourse?.enrolled || 0;
  const capacityRate = activeCapacity > 0 ? Math.min(1, activeEnrolled / activeCapacity) : 0;
  const ringStroke = isDark ? '#e4e4e7' : '#18181b';
  const ringTrack = isDark ? '#27272a' : '#e4e4e7';
  const ringCircumference = 2 * Math.PI * 46;
  const ringDash = ringCircumference * capacityRate;

  const loadInsights = async () => {
    const requestId = ++insightRequestRef.current;
    setInsightsLoading(true);
    setInsightsError(null);
    if (updatingDelayTimerRef.current) {
      window.clearTimeout(updatingDelayTimerRef.current);
      updatingDelayTimerRef.current = null;
    }
    setShowInsightsUpdating(false);
    updatingDelayTimerRef.current = window.setTimeout(() => {
      if (requestId === insightRequestRef.current) {
        setShowInsightsUpdating(true);
      }
    }, 180);
    try {
      if (!profileId || !activeCourse) {
        if (requestId === insightRequestRef.current) {
          setCourseStats({
            assignmentCount: 0,
            submissionRate: 0,
            gradingRate: 0,
            sessionCount: 0,
            openSessionCount: 0,
            avgScore: 0,
            scoreCount: 0,
          });
          setInsights([{
            type: 'info',
            text: '请先选择课程，系统将基于该课程的作业、考勤与成绩生成教学洞察。',
            icon: MessageSquare,
          }]);
        }
        return;
      }

      const [allAssignments, allSessions, exams] = await Promise.all([
        assignmentsApi.getForTeacher(profileId),
        attendanceSessionsApi.getTeacherSessions(profileId),
        examsApi.getByCourse(activeCourse.id),
      ]);

      const courseAssignments = (allAssignments || []).filter((a: any) => a.courseId === activeCourse.id);
      const submissionLists = await Promise.all(
        courseAssignments.map((a: any) => assignmentsApi.getSubmissionsByAssignment(a.id).catch(() => []))
      );
      const submissions = submissionLists.flat();
      const submittedCount = submissions.filter((s: any) => s.status === 'SUBMITTED' || s.status === 'GRADED').length;
      const gradedCount = submissions.filter((s: any) => s.status === 'GRADED' || s.grade != null).length;
      const expectedSubmissions = Math.max(1, activeEnrolled * Math.max(1, courseAssignments.length));
      const submissionRate = courseAssignments.length > 0 ? Math.min(1, submittedCount / expectedSubmissions) : 0;
      const gradingRate = submittedCount > 0 ? Math.min(1, gradedCount / submittedCount) : 0;

      const courseSessions = (allSessions || []).filter((s: any) => s.courseId === activeCourse.id);
      const openSessionCount = courseSessions.filter((s: any) => s.status === 'OPEN').length;

      const scoreLists = await Promise.all(
        (exams || []).map((exam: any) => scoresApi.getByExam(exam.id).catch(() => []))
      );
      const courseScores = scoreLists.flat();
      const avgScore = courseScores.length
        ? courseScores.reduce((sum: number, s: any) => sum + (s.scoreValue || 0), 0) / courseScores.length
        : 0;

      if (requestId !== insightRequestRef.current) return;

      setCourseStats({
        assignmentCount: courseAssignments.length,
        submissionRate,
        gradingRate,
        sessionCount: courseSessions.length,
        openSessionCount,
        avgScore,
        scoreCount: courseScores.length,
      });

      const nextInsights: Array<{ type: 'warning' | 'success' | 'info'; text: string; icon: any }> = [];

      if (courseAssignments.length === 0) {
        nextInsights.push({
          type: 'warning',
          text: '当前课程尚未发布作业，建议先发布 1 个形成性任务用于过程跟踪。',
          icon: AlertCircle,
        });
      } else if (submissionRate < 0.6) {
        nextInsights.push({
          type: 'warning',
          text: `作业提交率仅 ${Math.round(submissionRate * 100)}%，建议发布提醒并设置临近截止通知。`,
          icon: AlertCircle,
        });
      } else {
        nextInsights.push({
          type: 'success',
          text: `作业提交率 ${Math.round(submissionRate * 100)}%，提交情况整体稳定。`,
          icon: CheckCircle2,
        });
      }

      if (courseSessions.length === 0) {
        nextInsights.push({
          type: 'warning',
          text: '当前课程暂无签到场次，考勤连续性数据不足。',
          icon: AlertCircle,
        });
      } else {
        nextInsights.push({
          type: 'info',
          text: `已发布 ${courseSessions.length} 次签到场次，当前开放中 ${openSessionCount} 次。`,
          icon: MessageSquare,
        });
      }

      if (courseScores.length === 0) {
        nextInsights.push({
          type: 'info',
          text: '当前课程尚未录入成绩，建议在阶段测验后尽快回填分数。',
          icon: FileText,
        });
      } else if (avgScore < 70) {
        nextInsights.push({
          type: 'warning',
          text: `课程平均分 ${avgScore.toFixed(1)}，建议关注薄弱知识点并安排针对性练习。`,
          icon: AlertCircle,
        });
      } else {
        nextInsights.push({
          type: 'success',
          text: `课程平均分 ${avgScore.toFixed(1)}，学习达成度整体良好。`,
          icon: CheckCircle2,
        });
      }

      if (submittedCount > 0 && gradingRate < 0.7) {
        nextInsights.push({
          type: 'info',
          text: `已批改占比 ${Math.round(gradingRate * 100)}%，建议优先完成待批改作业以提升反馈时效。`,
          icon: FileText,
        });
      }

      setInsights(nextInsights.slice(0, 4));
    } catch (err: any) {
      if (requestId !== insightRequestRef.current) return;
      setInsightsError(err?.message || '获取洞察失败');
      setCourseStats({
        assignmentCount: 0,
        submissionRate: 0,
        gradingRate: 0,
        sessionCount: 0,
        openSessionCount: 0,
        avgScore: 0,
        scoreCount: 0,
      });
    } finally {
      if (requestId === insightRequestRef.current) {
        if (updatingDelayTimerRef.current) {
          window.clearTimeout(updatingDelayTimerRef.current);
          updatingDelayTimerRef.current = null;
        }
        setShowInsightsUpdating(false);
        setInsightsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadInsights();
  }, [activeCourseId, profileId]);

  useEffect(() => {
    return () => {
      if (updatingDelayTimerRef.current) {
        window.clearTimeout(updatingDelayTimerRef.current);
        updatingDelayTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!courses.length) {
      if (activeCourseId) setActiveCourseId('');
      return;
    }
    const stillExists = courses.some((c) => c.id === activeCourseId);
    if (!stillExists) {
      setActiveCourseId(courses[0].id);
    }
  }, [courses, activeCourseId]);

  if (!courses.length) {
    return <div className="p-8 text-center text-zinc-500">正在加载课程数据...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧列表：课程导航 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">活跃课程 ({courses.length})</h3>
          </div>
          <div className="space-y-3">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
                className={`w-full p-5 text-left rounded-2xl border transition-all duration-300 group ${
                  activeCourseId === course.id 
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none translate-x-1' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${activeCourseId === course.id ? 'bg-white/15' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    <BookOpen size={18} className={activeCourseId === course.id ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'} />
                  </div>
                  <span className={`text-[10px] font-black uppercase ${activeCourseId === course.id ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    #{course.id}
                  </span>
                </div>
                <h4 className="font-black text-base truncate mb-1">{course.name}</h4>
                <div className="flex items-center justify-between">
                   <p className={`text-[10px] font-bold ${activeCourseId === course.id ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {course.enrolled} 名学生
                  </p>
                  <ArrowUpRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeCourseId === course.id ? 'text-white' : 'text-zinc-500'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧主面板：详细分析 */}
        <div className="lg:col-span-3 space-y-8">
          {/* 顶部核心指标：全局概览 */}
          <div className="space-y-3">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">全局概览</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '授课课程', val: String(kpiStats.courseCount), trend: '本学期' },
                { label: '授课学生', val: String(kpiStats.totalEnrolled), trend: '已选人数' },
                { label: '平均学分', val: kpiStats.avgCredits ? kpiStats.avgCredits.toFixed(1) : '0.0', trend: '课程平均' },
                { label: '整体负载', val: `${Math.round(kpiStats.capacityRate * 100)}%`, trend: '容量占比' },
              ].map((s, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <div className="flex items-end justify-between">
                    <h5 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{s.val}</h5>
                    <span className="text-[9px] font-black text-zinc-400">{s.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 当前课程指标 */}
          <div className="space-y-3">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">当前课程：{activeCourse?.name || '未选择'}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '课程学生', val: String(activeEnrolled), trend: '当前已选' },
                { label: '作业发布', val: String(courseStats.assignmentCount), trend: '本课程' },
                { label: '提交率', val: `${Math.round(courseStats.submissionRate * 100)}%`, trend: '作业提交' },
                { label: '签到场次', val: String(courseStats.sessionCount), trend: `开放中 ${courseStats.openSessionCount}` },
                { label: '批改进度', val: `${Math.round(courseStats.gradingRate * 100)}%`, trend: '已提交作业' },
                { label: '均分', val: courseStats.scoreCount ? courseStats.avgScore.toFixed(1) : '暂无', trend: courseStats.scoreCount ? `${courseStats.scoreCount} 条成绩` : '待录入' },
              ].map((s, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <div className="flex items-end justify-between">
                    <h5 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{s.val}</h5>
                    <span className="text-[9px] font-black text-zinc-400">{s.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[288px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">课堂负载构成</h3>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">当前课程</span>
              </div>
              <div className="flex items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
                  <circle cx="60" cy="60" r="46" stroke={ringTrack} strokeWidth="12" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    stroke={ringStroke}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${ringDash} ${ringCircumference - ringDash}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="space-y-2">
                  <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {Math.round(capacityRate * 100)}%
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400">
                    已选 {activeEnrolled} / 容量 {activeCapacity || 0}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400">
                    课程：{activeCourse?.name || '未选择'}
                  </div>
                </div>
              </div>
            </div>
            {/* AI 教学洞察 */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">AI 教学洞察</h3>
                </div>
                <button
                  onClick={loadInsights}
                  disabled={insightsLoading}
                  className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest"
                >
                  {showInsightsUpdating ? '更新中...' : '刷新分析'}
                </button>
              </div>
              
              <div className="relative space-y-4 flex-1 min-h-[220px]">
                {showInsightsUpdating && (
                  <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl bg-white/55 dark:bg-zinc-900/55 backdrop-blur-[1px] flex items-start justify-end p-2">
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      正在更新
                    </span>
                  </div>
                )}
                {!insightsLoading && insightsError && (
                  <div className="text-xs font-bold text-rose-500">{insightsError}</div>
                )}
                {!insightsError && insights.length === 0 && (
                  <div className="text-xs font-bold text-zinc-400">暂无洞察数据。</div>
                )}
                {!insightsError && insights.map((insight, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex gap-3 ${
                    insight.type === 'warning' ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50' :
                    insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50' :
                    'bg-zinc-50/60 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800'
                  }`}>
                    <insight.icon size={16} className={`shrink-0 mt-0.5 ${
                      insight.type === 'warning' ? 'text-rose-600' :
                      insight.type === 'success' ? 'text-emerald-600' : 'text-zinc-600'
                    }`} />
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                生成本周教学周报
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[240px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">课程分布</h3>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">选课人数</span>
            </div>
            <div className="space-y-3">
              {courses.map((course) => {
                const max = Math.max(...courses.map(c => c.enrolled || 0), 1);
                const ratio = Math.round(((course.enrolled || 0) / max) * 100);
                return (
                  <div key={course.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-zinc-500">
                      <span className="text-zinc-700 dark:text-zinc-200 line-clamp-1">{course.name}</span>
                      <span>{course.enrolled || 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TeacherAssignmentsPage: React.FC = () => {
  const { courses, profileId } = useData();
  const showToast = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<Record<string, any[]>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingSubmissionsFor, setIsLoadingSubmissionsFor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGradingId, setIsGradingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    courseId: ''
  });
  const itemsPerPage = 5;

  const getDefaultDueDateLocal = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const formatForInput = (dueDate: string) => {
    if (!dueDate) return '';
    const text = dueDate.replace(' ', 'T');
    return text.length >= 16 ? text.slice(0, 16) : text;
  };

  const formatDueDateDisplay = (dueDate: string) => {
    if (!dueDate) return '-';
    const text = dueDate.replace(' ', 'T');
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return dueDate;
    return d.toLocaleString();
  };

  const toApiLocalDateTime = (value: string) => {
    if (!value) return '';
    return `${value}:00`;
  };

  useEffect(() => {
    if (!formData.courseId && courses.length > 0) {
      setFormData(prev => ({ ...prev, courseId: courses[0].id }));
    }
  }, [courses, formData.courseId]);

  const fetchAssignments = async () => {
    if (!profileId) return;
    setIsLoadingAssignments(true);
    try {
      const data = await assignmentsApi.getForTeacher(profileId);
      const sorted = [...data].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      setAssignments(sorted);
      setCurrentPage(1);
    } catch (error: any) {
      showToast(error?.message || '作业列表加载失败', 'error');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [profileId]);

  const handleCreateAssignment = async () => {
    if (!profileId) {
      showToast('缺少教师身份信息', 'error');
      return;
    }
    if (courses.length === 0) {
      showToast('当前无可用授课课程，请先在课程管理中关联教师课程', 'error');
      return;
    }
    const normalized = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      courseId: formData.courseId || courses[0]?.id || '',
    };
    const missing: string[] = [];
    if (!normalized.title) missing.push('作业标题');
    if (!normalized.description) missing.push('作业说明');
    if (!normalized.dueDate) missing.push('截止时间');
    if (!normalized.courseId) missing.push('课程');
    if (missing.length > 0) {
      showToast(`请完善：${missing.join('、')}`, 'error');
      return;
    }
    setIsCreating(true);
    try {
      await assignmentsApi.create({
        title: normalized.title,
        description: normalized.description,
        dueDate: toApiLocalDateTime(normalized.dueDate),
        courseId: normalized.courseId,
        teacherId: profileId
      });
      showToast('作业发布成功', 'success');
      setFormData(prev => ({ ...prev, title: '', description: '', dueDate: '', courseId: courses[0]?.id || prev.courseId }));
      setIsAssignmentModalOpen(false);
      await fetchAssignments();
    } catch (error: any) {
      showToast(error?.message || '作业发布失败', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAssignmentId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: getDefaultDueDateLocal(),
      courseId: courses[0]?.id || ''
    });
    setIsAssignmentModalOpen(true);
  };

  const handleStartEdit = (assignment: any) => {
    setEditingAssignmentId(assignment.id);
    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: formatForInput(assignment.dueDate || ''),
      courseId: assignment.courseId || ''
    });
    setIsAssignmentModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingAssignmentId(null);
    setIsAssignmentModalOpen(false);
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
      dueDate: '',
      courseId: courses[0]?.id || ''
    }));
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignmentId) return;
    if (!formData.title.trim() || !formData.description.trim() || !formData.dueDate) {
      showToast('请完整填写作业信息', 'error');
      return;
    }
    setIsUpdating(true);
    try {
      await assignmentsApi.update(editingAssignmentId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: toApiLocalDateTime(formData.dueDate)
      });
      showToast('作业更新成功', 'success');
      handleCancelEdit();
      await fetchAssignments();
    } catch (error: any) {
      showToast(error?.message || '作业更新失败', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('确认删除该作业吗？删除后学生端将不可见。')) return;
    setDeletingId(assignmentId);
    try {
      await assignmentsApi.delete(assignmentId);
      showToast('作业删除成功', 'success');
      if (selectedAssignmentId === assignmentId) {
        setSelectedAssignmentId(null);
      }
      if (editingAssignmentId === assignmentId) {
        handleCancelEdit();
      }
      await fetchAssignments();
    } catch (error: any) {
      showToast(error?.message || '作业删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const loadSubmissions = async (assignmentId: string) => {
    setIsLoadingSubmissionsFor(assignmentId);
    try {
      const data = await assignmentsApi.getSubmissionsByAssignment(assignmentId);
      setSubmissionsByAssignment(prev => ({ ...prev, [assignmentId]: data }));
      setGradeDrafts(prev => {
        const next = { ...prev };
        data.forEach((s: any) => {
          if (!next[s.id]) {
            next[s.id] = {
              grade: s.grade == null ? '' : String(s.grade),
              feedback: s.teacherFeedback || ''
            };
          }
        });
        return next;
      });
    } catch (error: any) {
      showToast(error?.message || '提交列表加载失败', 'error');
    } finally {
      setIsLoadingSubmissionsFor(null);
    }
  };

  const toggleSubmissions = async (assignmentId: string) => {
    if (selectedAssignmentId === assignmentId) {
      setSelectedAssignmentId(null);
      return;
    }
    setSelectedAssignmentId(assignmentId);
    await loadSubmissions(assignmentId);
  };

  const handleGradeSubmission = async (assignmentId: string, submissionId: string) => {
    const draft = gradeDrafts[submissionId] || { grade: '', feedback: '' };
    const gradeNumber = Number(draft.grade);
    if (!Number.isFinite(gradeNumber) || gradeNumber < 0 || gradeNumber > 100) {
      showToast('分数需在 0-100 之间', 'error');
      return;
    }
    setIsGradingId(submissionId);
    try {
      await assignmentsApi.gradeSubmission(submissionId, {
        grade: gradeNumber,
        feedback: draft.feedback || ''
      });
      showToast('批改成功', 'success');
      await loadSubmissions(assignmentId);
    } catch (error: any) {
      showToast(error?.message || '批改失败', 'error');
    } finally {
      setIsGradingId(null);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const byCourse = courseFilter === 'all' || item.courseId === courseFilter;
      const q = search.trim().toLowerCase();
      const bySearch = !q
        || String(item.title || '').toLowerCase().includes(q)
        || String(item.courseName || '').toLowerCase().includes(q);
      return byCourse && bySearch;
    });
  }, [assignments, courseFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">作业管理</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">主要展示已发布作业，可通过按钮快速发布新作业。</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 h-10 rounded-xl bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
        >
          发布新作业
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-black text-zinc-900 dark:text-zinc-100">已发布作业</h3>
          <button
            onClick={fetchAssignments}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            刷新
          </button>
        </div>
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索作业标题或课程"
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">全部课程</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          <div className="text-xs font-bold text-zinc-500 flex items-center">
            共 {filteredAssignments.length} 条，当前第 {currentPage}/{totalPages} 页
          </div>
        </div>

        {isLoadingAssignments ? (
          <div className="p-8 text-xs font-bold text-zinc-400">正在加载作业...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-8 text-xs font-bold text-zinc-400">暂无已发布作业</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {paginatedAssignments.map((assignment) => {
              const submissions = submissionsByAssignment[assignment.id] || [];
              const isSelected = selectedAssignmentId === assignment.id;
              return (
                <div key={assignment.id} className="p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100">{assignment.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {assignment.courseName} · 截止 {formatDueDateDisplay(assignment.dueDate)}
                        </p>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                          new Date(String(assignment.dueDate).replace(' ', 'T')) < new Date()
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                          {new Date(String(assignment.dueDate).replace(' ', 'T')) < new Date() ? '已截止' : '进行中'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          已交 {(submissionsByAssignment[assignment.id] || []).length}/
                          {courses.find(c => c.id === assignment.courseId)?.enrolled ?? '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:min-w-[320px] md:justify-end">
                      <button
                        onClick={() => toggleSubmissions(assignment.id)}
                        className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        {isSelected ? '收起提交' : '查看提交'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(assignment)}
                        className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deletingId === assignment.id}
                        className="ml-2 px-3 py-2 rounded-xl border border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50"
                      >
                        {deletingId === assignment.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-4 space-y-3">
                      {isLoadingSubmissionsFor === assignment.id ? (
                        <div className="text-xs font-bold text-zinc-400">正在加载提交...</div>
                      ) : submissions.length === 0 ? (
                        <div className="text-xs font-bold text-zinc-400">暂无学生提交</div>
                      ) : submissions.map((submission) => {
                        const draft = gradeDrafts[submission.id] || { grade: '', feedback: '' };
                        return (
                          <div key={submission.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {submission.studentName} · {submission.status}
                              </p>
                              <span className="text-[10px] font-black text-zinc-400">
                                {submission.submissionDate ? new Date(submission.submissionDate).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{submission.content || '无提交内容'}</p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={draft.grade}
                                onChange={(e) => setGradeDrafts(prev => ({
                                  ...prev,
                                  [submission.id]: { ...draft, grade: e.target.value }
                                }))}
                                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                                placeholder="分数"
                              />
                              <input
                                value={draft.feedback}
                                onChange={(e) => setGradeDrafts(prev => ({
                                  ...prev,
                                  [submission.id]: { ...draft, feedback: e.target.value }
                                }))}
                                className="md:col-span-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                                placeholder="评语"
                              />
                              <button
                                onClick={() => handleGradeSubmission(assignment.id, submission.id)}
                                disabled={isGradingId === submission.id}
                                className="px-3 py-2 rounded-lg bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black disabled:opacity-50"
                              >
                                {isGradingId === submission.id ? '保存中...' : '保存评分'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {filteredAssignments.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-black disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-black disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                {editingAssignmentId ? '编辑作业' : '发布新作业'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                关闭
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">作业标题</label>
                  <input
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    placeholder="例如：第 3 章课后作业"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">课程</label>
                  <select
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={formData.courseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                    disabled={courses.length === 0}
                  >
                    <option value="">{courses.length === 0 ? '暂无可用课程' : '选择课程'}</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                  {courses.length === 0 && (
                    <p className="text-[10px] text-rose-500">当前教师暂无授课课程，无法发布作业</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">截止时间</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                  <p className="text-[10px] text-zinc-400">格式：yyyy-mm-dd hh:mm</p>
                </div>
              </div>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                placeholder="作业说明"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={editingAssignmentId ? handleUpdateAssignment : handleCreateAssignment}
                disabled={isCreating || isUpdating || courses.length === 0}
                className="px-4 h-10 rounded-xl bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAssignmentId
                  ? (isUpdating ? '保存中...' : '保存修改')
                  : (isCreating ? '发布中...' : '发布作业')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TeacherCheckinPublishPage: React.FC = () => {
  const { courses, profileId } = useData();
  const showToast = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    startAt: '',
    endAt: ''
  });

  const formatForDateTimeInput = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const getDefaultTimeWindow = () => {
    const now = new Date();
    const start = formatForDateTimeInput(now);
    const end = formatForDateTimeInput(new Date(now.getTime() + 10 * 60 * 1000));
    return { start, end };
  };

  const formatDateTime = (value: string) => {
    if (!value) return '-';
    const text = value.replace(' ', 'T');
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const toApiLocalDateTime = (value: string) => value ? `${value}:00` : '';

  const fetchSessions = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const data = await attendanceSessionsApi.getTeacherSessions(profileId);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || '签到场次加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [profileId]);

  const openCreateModal = () => {
    const defaults = getDefaultTimeWindow();
    setFormData({
      title: '',
      courseId: courses[0]?.id || '',
      startAt: defaults.start,
      endAt: defaults.end
    });
    setModalOpen(true);
  };

  const applyQuickDuration = (minutes: number) => {
    const start = formData.startAt || getDefaultTimeWindow().start;
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      startAt: start,
      endAt: formatForDateTimeInput(endDate)
    }));
  };

  const handleCreate = async () => {
    if (!profileId) return;
    if (!formData.title.trim() || !formData.courseId || !formData.startAt || !formData.endAt) {
      showToast('请完整填写签到场次信息', 'error');
      return;
    }
    setCreating(true);
    try {
      await attendanceSessionsApi.create({
        title: formData.title.trim(),
        courseId: formData.courseId,
        teacherId: profileId,
        startAt: toApiLocalDateTime(formData.startAt),
        endAt: toApiLocalDateTime(formData.endAt),
      });
      showToast('签到场次发布成功', 'success');
      setModalOpen(false);
      fetchSessions();
    } catch (err: any) {
      showToast(err?.message || '签到场次发布失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await attendanceSessionsApi.closeSession(id);
      showToast('签到场次已关闭', 'success');
      fetchSessions();
    } catch (err: any) {
      showToast(err?.message || '关闭失败', 'error');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">签到发布</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">发布签到场次后，学生可在时间窗口内完成签到。</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 h-10 rounded-xl bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
        >
          发布签到
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">签到场次列表</h3>
          <button
            onClick={fetchSessions}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            刷新
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-xs font-bold text-zinc-400">正在加载签到场次...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-xs font-bold text-zinc-400">暂无签到场次</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sessions.map((item) => {
              const isOpen = item.status === 'OPEN';
              return (
                <div key={item.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{item.title}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                      {item.courseName} · {formatDateTime(item.startAt)} - {formatDateTime(item.endAt)}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1">签到码：{item.checkinCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      isOpen
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {isOpen ? '进行中' : '已关闭'}
                    </span>
                    {isOpen && (
                      <button
                        onClick={() => handleClose(item.id)}
                        disabled={closingId === item.id}
                        className="px-3 py-2 rounded-xl border border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50"
                      >
                        {closingId === item.id ? '关闭中...' : '关闭签到'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">发布签到场次</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                关闭
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">场次标题</label>
                <input
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                  placeholder="例如：第6周 周三第1节签到"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">课程</label>
                  <select
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={formData.courseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                  >
                    <option value="">选择课程</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">开始时间</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={formData.startAt}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setFormData(prev => {
                        if (!prev.endAt) return { ...prev, startAt: nextStart };
                        const startDate = new Date(nextStart);
                        const endDate = new Date(prev.endAt);
                        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate > startDate) {
                          return { ...prev, startAt: nextStart };
                        }
                        return {
                          ...prev,
                          startAt: nextStart,
                          endAt: formatForDateTimeInput(new Date(startDate.getTime() + 10 * 60 * 1000))
                        };
                      });
                    }}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">结束时间</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={formData.endAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">快速时长</span>
                    {[
                      { label: '5分钟', mins: 5 },
                      { label: '10分钟', mins: 10 },
                      { label: '15分钟', mins: 15 },
                      { label: '本节课', mins: 45 },
                    ].map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => applyQuickDuration(item.mins)}
                        className="px-2.5 h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 h-10 rounded-xl bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black disabled:opacity-50"
              >
                {creating ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
