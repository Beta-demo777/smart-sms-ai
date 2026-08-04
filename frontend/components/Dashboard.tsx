
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BookOpen,
  Trophy,
  Target,
  CheckCircle2,
  Circle,
  FileText,
  AlertTriangle,
  Sparkles,
  Zap,
  ShieldCheck,
  Activity as ActivityIcon
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { SkeletonCard } from './Skeleton';
import { PageType, User } from '../types';
import { riskApi, studentsApi, scoresApi, examsApi } from '../services/api';

interface DashboardProps {
  user: User;
  onNavigate?: (page: PageType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { students, courses, activities, teachers, isLoading, profileId } = useData();
  const [riskAlerts, setRiskAlerts] = useState<Array<{
    studentId: string;
    name: string;
    studentNumber: string;
    className: string;
    gpa: number | null;
    attendance: number | null;
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    tags: string[];
  }>>([]);
  const [riskLoading, setRiskLoading] = useState(false);

  const isAdmin = user.role === 'admin';
  const isStudent = user.role === 'student';
  const isTeacher = user.role === 'teacher';

  const [systemStats, setSystemStats] = useState<{ totalStudents: number; averageGpa: number; averageAttendance: number } | null>(null);

  const loadAdminStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const stats = await studentsApi.getStats();
      setSystemStats(stats);
    } catch (e) {
      console.error("Failed to load admin stats", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin, loadAdminStats]);

  // ── Admin Stats (dynamic from API) ───────────────────────────────────────
  const totalStudents = systemStats ? systemStats.totalStudents : students.length;
  const avgGpa = systemStats ? systemStats.averageGpa.toFixed(2) : (totalStudents > 0
    ? (students.reduce((acc, s) => acc + (s.gpa || 0), 0) / totalStudents).toFixed(2)
    : '0.00');
  const rawAvgAttendance = systemStats ? systemStats.averageAttendance : (totalStudents > 0
    ? Math.round(students.reduce((acc, s) => acc + (s.attendance || 0), 0) / totalStudents)
    : 0);
  const avgAttendance = rawAvgAttendance > 0 ? rawAvgAttendance : '--';
  const activeCoursesCount = courses.length;
  const enrolledStudentsCount = students.filter(s => s.status === '在读').length;
  const highGpaCount = students.filter(s => Number(s.gpa) >= 3.5).length;
  const lowAttendanceCount = students.filter(s => Number(s.attendance) < 80).length;
  const highGpaRate = totalStudents > 0 ? Math.round((highGpaCount / totalStudents) * 100) : 0;
  const activeTeacherCount = teachers.filter(t => t.status === '在职').length;

  // ── Student: use profileId from auth/me for reliable lookup ─────────────
  const [studentStats, setStudentStats] = useState<{
    gpa: number; totalExams: number; avgScore: number; maxScore: number; minScore: number; totalCredits?: number;
  } | null>(null);
  const [studentTrend, setStudentTrend] = useState<Array<{ name: string; score: number }>>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  // profileId directly identifies the student/teacher entity — no email guessing needed
  const myStudentRecord = isStudent && profileId
    ? students.find(s => s.id === profileId)
    : null;

  const myGpa = studentStats ? studentStats.gpa.toFixed(2) : (myStudentRecord ? Number(myStudentRecord.gpa ?? 0).toFixed(2) : '--');
  const myAttendance = myStudentRecord ? Number(myStudentRecord.attendance ?? 0).toFixed(1) : '--';
  const myScoreCount = studentStats?.totalExams ?? 0;
  const myEnrolledCourseCount = myStudentRecord?.enrolledCourses?.length ?? 0;
  const myTotalCredits = studentStats?.totalCredits ?? 0;

  const loadStudentStats = useCallback(async () => {
    if (!profileId || !isStudent) return;
    setScoresLoading(true);
    try {
      const [stats, scoreList, examList] = await Promise.all([
        scoresApi.getStudentStats(profileId),
        scoresApi.getByStudent(profileId).catch(() => []),
        examsApi.getAll().catch(() => []),
      ]);
      if (stats) setStudentStats(stats);

      const examById = new Map<string, any>((examList || []).map((e: any) => [e.id, e]));
      const bucket = new Map<string, { sum: number; count: number; name: string }>();

      (scoreList || []).forEach((s: any) => {
        if (typeof s?.scoreValue !== 'number') return;
        const exam = examById.get(s?.exam?.id);
        const fallbackCourse = s?.exam?.course;
        const courseId = exam?.course?.id || fallbackCourse?.id;
        const courseName = exam?.course?.name || fallbackCourse?.name || '未命名课程';
        if (!courseId) return;

        const maxScore = Number(exam?.maxScore || 100);
        if (!maxScore || maxScore <= 0) return;

        const ratio = Math.max(0, Math.min(1, s.scoreValue / maxScore));
        const normalizedScore = ratio * 100;
        const prev = bucket.get(courseId) || { sum: 0, count: 0, name: courseName };
        prev.sum += normalizedScore;
        prev.count += 1;
        bucket.set(courseId, prev);
      });

      const trend = Array.from(bucket.entries())
        .map(([, item]) => ({
          name: item.name,
          score: Number((item.sum / Math.max(1, item.count)).toFixed(1)),
        }))
        .sort((a, b) => b.score - a.score);

      setStudentTrend(trend);
    } catch {
      // fallback to student record GPA if stats API fails
      setStudentTrend([]);
    } finally {
      setScoresLoading(false);
    }
  }, [profileId, isStudent]);

  useEffect(() => {
    if (isStudent) {
      loadStudentStats();
    }
  }, [isStudent, loadStudentStats]);

  useEffect(() => {
    if (!isAdmin && !isTeacher) return;
    let cancelled = false;
    const loadRiskAlerts = async () => {
      setRiskLoading(true);
      try {
        const data = await riskApi.getStudents(30);
        if (!cancelled) {
          setRiskAlerts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRiskAlerts([]);
        }
        console.error('Failed to load risk alerts', error);
      } finally {
        if (!cancelled) {
          setRiskLoading(false);
        }
      }
    };
    loadRiskAlerts();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isTeacher]);

  // Compute per-course score bars from real data; fallback to current average score point
  const scoreChartData = useMemo(() => {
    if (studentTrend.length > 0) return studentTrend;
    const currentAvg = Number(studentStats?.avgScore ?? 0);
    return [{ name: '当前', score: Number.isFinite(currentAvg) ? Number(currentAvg.toFixed(1)) : 0 }];
  }, [studentTrend, studentStats?.avgScore]);
  const chartW = 720;
  const chartH = 260;
  const padX = 34;
  const padY = 20;
  const minScore = 0;
  const maxScore = 100;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const barGap = 10;
  const barCount = Math.max(1, scoreChartData.length);
  const rawBarW = (plotW - barGap * (barCount - 1)) / barCount;
  const barW = Math.max(16, Math.min(56, rawBarW));
  const usedW = barW * barCount + barGap * (barCount - 1);
  const startX = padX + (plotW - usedW) / 2;
  const chartBars = scoreChartData.map((d, i) => {
    const x = startX + i * (barW + barGap);
    const clamped = Math.max(minScore, Math.min(maxScore, d.score));
    const barH = (clamped / (maxScore - minScore)) * plotH;
    const y = chartH - padY - barH;
    return { ...d, x, y, barH };
  });

  // ── Teacher stats ─────────────────────────────────────────────────────────
  const myTeacherRecord = isTeacher && profileId
    ? teachers.find(t => t.id === profileId)
    : null;

  const myCourses = isTeacher && myTeacherRecord
    ? courses.filter(c => c.teacherId === myTeacherRecord.id || c.teacher === myTeacherRecord.name)
    : [];

  // Count students enrolled in teacher's courses (rough proportional heuristic)
  const myStudentCount = myCourses.length > 0
    ? Math.max(students.length > 0 ? Math.round(students.length / Math.max(courses.length, 1) * myCourses.length) : 0, 0)
    : 0;

  // ── Stat cards per role ──────────────────────────────────────────────────
  const adminStats = [
    { label: '全校学生总数', value: totalStudents.toString(), change: `在读 ${enrolledStudentsCount}`, trend: 'up', icon: Users, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '系统平均 GPA', value: avgGpa, change: `优良率 ${highGpaRate}%`, trend: Number(avgGpa) >= 3.0 ? 'up' : 'down', icon: TrendingUp, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '全校平均出勤', value: `${avgAttendance}%`, change: `预警 ${lowAttendanceCount} 人`, trend: lowAttendanceCount > 0 ? 'down' : 'up', icon: CalendarCheck, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '正在运行课程', value: activeCoursesCount.toString(), change: `在职教师 ${activeTeacherCount}`, trend: activeCoursesCount > 0 ? 'up' : 'down', icon: GraduationCap, color: 'text-zinc-900 dark:text-zinc-100' },
  ];

  const teacherStats = [
    { label: '授课班级', value: myCourses.length.toString() || '--', change: '本学期', trend: 'up', icon: GraduationCap, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '学生总数', value: myStudentCount > 0 ? myStudentCount.toString() : students.length.toString(), change: '统计值', trend: 'up', icon: Users, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '全校平均出勤', value: `${avgAttendance}%`, change: rawAvgAttendance >= 90 ? '良好' : '偏低', trend: rawAvgAttendance >= 90 ? 'up' : 'down', icon: CalendarCheck, color: 'text-zinc-900 dark:text-zinc-100' },
    { label: '全校平均 GPA', value: avgGpa, change: Number(avgGpa) >= 3.0 ? '较好' : '关注', trend: Number(avgGpa) >= 3.0 ? 'up' : 'down', icon: TrendingUp, color: 'text-zinc-900 dark:text-zinc-100' },
  ];

  const studentStatCards = [
    {
      label: '当前 GPA',
      value: scoresLoading ? '…' : myGpa,
      change: Number(myGpa) >= 3.5 ? 'Top 10%' : Number(myGpa) >= 3.0 ? '良好' : '需提升',
      trend: Number(myGpa) >= 3.0 ? 'up' : 'down',
      icon: Trophy,
      color: 'text-zinc-900 dark:text-zinc-100'
    },
    {
      label: '已完成考试',
      value: scoresLoading ? '…' : myScoreCount.toString(),
      change: studentStats ? `均分 ${studentStats.avgScore.toFixed(1)}` : `共 ${activeCoursesCount} 门课程`,
      trend: 'up',
      icon: Target,
      color: 'text-zinc-900 dark:text-zinc-100'
    },
    {
      label: '学期出勤率',
      value: myAttendance !== '--' ? `${myAttendance}%` : '--',
      change: Number(myAttendance) >= 95 ? '优秀' : Number(myAttendance) >= 80 ? '良好' : '需关注',
      trend: Number(myAttendance) >= 80 ? 'up' : 'down',
      icon: CalendarCheck,
      color: 'text-zinc-900 dark:text-zinc-100'
    },
    {
      label: '选修课程数',
      value: myEnrolledCourseCount.toString(),
      change: myTotalCredits > 0 ? `已修 ${myTotalCredits} 学分` : '暂无已修学分',
      trend: 'up',
      icon: BookOpen,
      color: 'text-zinc-900 dark:text-zinc-100'
    },
  ];

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const [tasks, setTasks] = useState([
    { id: '1', title: '人工智能大作业提交', dueDate: '剩余 2天', completed: false, priority: 'urgent' },
    { id: '2', title: '图书馆借阅到期', dueDate: '明天 10:00', completed: false, priority: 'info' },
    { id: '3', title: '英语口语在线测评', dueDate: '3月18日', completed: true, priority: 'success' },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const stats = isStudent ? studentStatCards : (isTeacher ? teacherStats : adminStats);
  const lastActivityTime = activities.length > 0 ? activities[0]?.time : '暂无';
  const totalUsersSnapshot = students.length + teachers.length;
  const canOpenAdminLogs = isAdmin && typeof onNavigate === 'function';
  const handleRiskAction = (studentName?: string) => {
    if (!onNavigate) return;
    if (studentName && studentName !== '系统提示') {
      localStorage.setItem('studentListIntent', JSON.stringify({ searchTerm: studentName }));
    } else {
      localStorage.removeItem('studentListIntent');
    }
    onNavigate('students');
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Welcome */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
                {isStudent ? `欢迎回来, ${user.name}` : (isTeacher ? `工作愉快, ${user.name} 老师` : '系统运行监控')}
              </h1>
              <p className="text-sm font-medium text-zinc-500 max-w-xl leading-relaxed">
                {isStudent ? '保持良好的学习节奏，今天有新的课程安排需要关注。' : (isTeacher ? '今日教学任务已同步，请检查待批改作业。' : '全校教学数据实时同步中，网络状态良好，暂无严重安全告警。')}
              </p>
            </div>
            {isAdmin && (
              <div className="hidden md:flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">系统在线</span>
              </div>
            )}
          </div>

          {/* Admin Top Cards */}
          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 p-8 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group min-h-[200px]">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ActivityIcon size={80} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">系统数据快照</p>
                  <h4 className="text-5xl font-black tracking-tighter">{totalUsersSnapshot}</h4>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold opacity-80 mt-8">
                  <Zap size={14} /> 最近操作: {lastActivityTime}
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[200px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">全校注册学生</p>
                    <h4 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{totalStudents.toLocaleString()}</h4>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100">
                    <Users size={20} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded-lg w-fit">
                  <TrendingUp size={12} /> 实时同步自数据库
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[200px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">活跃课程总数</p>
                    <h4 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{activeCoursesCount}</h4>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-sky-500 bg-sky-50 dark:bg-sky-900/10 px-3 py-1.5 rounded-lg w-fit">
                  <ShieldCheck size={12} /> 本学期已开设课程
                </div>
              </div>
            </div>
          )}

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : stats.map((stat, idx) => (
                <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform">
                      <stat.icon size={18} />
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                      {stat.change}
                      {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stat.value}</h3>
                  </div>
                </div>
              ))}
          </div>

          {/* Content Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Charts or Risks */}
            <div className="lg:col-span-2 space-y-8">
              {isAdmin || isTeacher ? (
                <div className="bg-zinc-50 dark:bg-zinc-800/30 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Sparkles size={18} className="text-zinc-400" />
                      教务风险智能预警
                    </h3>
                    <button
                      onClick={() => onNavigate?.('students')}
                      className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest"
                    >
                      查看全部
                    </button>
                  </div>
                  <div className="space-y-3">
                    {riskLoading ? (
                      <p className="text-sm text-zinc-400 text-center py-8">风险数据加载中...</p>
                    ) : riskAlerts.length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-8">暂无风险学生数据</p>
                    ) : riskAlerts.slice(0, 6).map((alert, i) => {
                      const isHigh = String(alert.severity).toUpperCase() === 'HIGH';
                      const icon = isHigh ? AlertTriangle : TrendingUp;
                      const statusColor = isHigh ? 'text-rose-500' : 'text-amber-500';
                      const reasonParts: string[] = [];
                      if (alert.attendance !== null && alert.attendance !== undefined) {
                        reasonParts.push(`出勤率 ${Number(alert.attendance).toFixed(1)}%`);
                      }
                      if (alert.gpa !== null && alert.gpa !== undefined) {
                        reasonParts.push(`GPA ${Number(alert.gpa).toFixed(2)}`);
                      }
                      if (Array.isArray(alert.tags) && alert.tags.length > 0) {
                        reasonParts.push(`风险标签 ${alert.tags.join('、')}`);
                      }
                      const reason = reasonParts.length > 0 ? reasonParts.join('，') : '需重点关注';
                      return (
                      <div key={i} className="group p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-between hover:border-zinc-300 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 ${statusColor}`}>
                            {React.createElement(icon, { size: 18 })}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {alert.name} <span className="text-zinc-400 font-normal mx-1">/</span> {alert.className || '未分班'}
                            </h4>
                            <p className="text-xs text-zinc-500 font-medium">{reason}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRiskAction(alert.name)}
                          className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          处理
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-800/30 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <TrendingUp size={18} className="text-zinc-400" />
                      各课程成绩
                    </h3>
                    {studentStats?.avgScore != null && (
                      <span className="text-xs font-black text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
                        当前均分: {Number(studentStats.avgScore).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="h-72">
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH}`}
                      className="w-full h-full"
                      role="img"
                      aria-label="各课程成绩柱状图"
                    >
                      <defs>
                        <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isDark ? '#fafafa' : '#27272a'} stopOpacity="0.95" />
                          <stop offset="100%" stopColor={isDark ? '#d4d4d8' : '#71717a'} stopOpacity="0.75" />
                        </linearGradient>
                      </defs>
                      <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke={isDark ? '#3f3f46' : '#e4e4e7'} strokeWidth="1" />
                      <line x1={padX} y1={padY} x2={padX} y2={chartH - padY} stroke={isDark ? '#3f3f46' : '#e4e4e7'} strokeWidth="1" />
                      {chartBars.map((p) => (
                        <g key={p.name}>
                          <rect
                            x={p.x}
                            y={p.y}
                            width={barW}
                            height={p.barH}
                            rx="6"
                            fill="url(#barFill)"
                          />
                          <text x={p.x + barW / 2} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={isDark ? '#d4d4d8' : '#52525b'}>
                            {p.score.toFixed(1)}
                          </text>
                          <text x={p.x + barW / 2} y={chartH - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={isDark ? '#a1a1aa' : '#71717a'}>
                            {p.name.length > 8 ? `${p.name.slice(0, 8)}…` : p.name}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  {myScoreCount === 0 && !scoresLoading && (
                    <p className="text-xs text-zinc-400 text-center mt-2">暂无历史成绩记录，仅展示当前点位</p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Tasks or Activity */}
            <div className="space-y-8">
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 h-full">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {isStudent ? <BookOpen size={18} className="text-zinc-400" /> : <Clock size={18} className="text-zinc-400" />}
                    {isStudent ? '待办任务' : '操作日志'}
                  </h3>
                </div>
                <div className="space-y-4">
                  {(isStudent ? tasks : activities.slice(0, 6)).map((item: any) => (
                    <div key={item.id} className="flex gap-4 items-start group p-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                      {isStudent ? (
                        <button onClick={() => toggleTask(item.id)} className="mt-1 transition-colors">
                          {item.completed ? <CheckCircle2 className="text-zinc-300 dark:text-zinc-600" size={20} /> : <Circle className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" size={20} />}
                        </button>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-2.5 shrink-0" />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-sm font-bold transition-all ${item.completed ? 'text-zinc-400 dark:text-zinc-600 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {isStudent ? item.title : `${item.user} ${item.action}`}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mt-1">
                          {isStudent ? item.dueDate : item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!isStudent && activities.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-4">暂无操作日志</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (isStudent) return;
                    if (canOpenAdminLogs) onNavigate?.('admin-logs');
                  }}
                  className="w-full mt-8 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  {isStudent ? '查看全部日程' : '查看全部日志'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
