import React, { useState, useEffect, useMemo } from "react";
import {
  BookMarked,
  PieChart as PieChartIcon,
  ShieldCheck,
  FileUser,
  TrendingUp,
  Award,
  Zap,
  Activity,
  Calendar,
  Mail,
  Smartphone,
  MapPin,
  Lock,
  Cpu,
  Fingerprint,
  Users,
  Star,
  BookOpen,
  Trophy,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Save,
  Clock,
  User as UserIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { User, Role } from "../types";
import { buildAvatarUrl, resolveAvatar } from "../utils/avatar";
import { useData } from "../contexts/DataContext";
import { activitiesApi } from "../services/api";
import { assignmentsApi, scoresApi } from "../services/api";

interface UserProfileProps {
  user: User;
}

const systemLoadData = [
  { time: "08:00", load: 30 },
  { time: "10:00", load: 85 },
  { time: "12:00", load: 45 },
  { time: "14:00", load: 92 },
  { time: "16:00", load: 70 },
  { time: "18:00", load: 20 },
];

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "security" | "activity"
  >("overview");
  const [mounted, setMounted] = useState(false);
  const [activityItems, setActivityItems] = useState<
    {
      action: string;
      target?: string;
      time: string;
      category?: string;
      level?: string;
    }[]
  >([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [scoreStats, setScoreStats] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const { students, teachers, profileId, courses, activities } = useData();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user.role === "admin";
  const isTeacher = user.role === "teacher";
  const isStudent = user.role === "student";

  const roleLabels: Record<Role, string> = {
    admin: "系统总调度官",
    teacher: "学术导师",
    student: "卓越学者计划成员",
  };

  const renderOverview = () => {
    if (isAdmin) return renderAdminOverview();
    if (isTeacher) return renderTeacherOverview();
    return renderStudentOverview();
  };

  useEffect(() => {
    if (activeTab !== "overview") return;
    if (!isStudent || !profileId) return;

    let isActive = true;
    setOverviewLoading(true);
    setOverviewError(null);

    Promise.all([
      scoresApi.getStudentStats(profileId),
      assignmentsApi.getForStudent(profileId),
      assignmentsApi.getStudentSubmissions(profileId),
    ])
      .then(([statsData, assignmentsData, submissionsData]) => {
        if (!isActive) return;
        setScoreStats(statsData);
        setAssignments(assignmentsData || []);
        setSubmissions(submissionsData || []);
      })
      .catch((err: any) => {
        if (!isActive) return;
        setOverviewError(err?.message || "获取档案概览数据失败");
      })
      .finally(() => {
        if (!isActive) return;
        setOverviewLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeTab, isStudent, profileId]);

  useEffect(() => {
    if (activeTab !== "activity") return;
    if (!user?.username) return;

    let isActive = true;
    setActivityLoading(true);
    setActivityError(null);

    activitiesApi
      .getAll(0, 12, { user: user.username })
      .then((res: any) => {
        if (!isActive) return;
        const content = res?.content || [];
        setActivityItems(
          content.map((item: any) => ({
            action: item.action,
            target: item.target,
            time: item.time,
            category: item.category,
            level: item.level,
          })),
        );
      })
      .catch((err: any) => {
        if (!isActive) return;
        setActivityError(err?.message || "获取活动轨迹失败");
        setActivityItems([]);
      })
      .finally(() => {
        if (!isActive) return;
        setActivityLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeTab, user?.username]);

  const profileStudent =
    isStudent && profileId
      ? students.find((s) => s.id === profileId)
      : undefined;
  const profileTeacher =
    isTeacher && profileId
      ? teachers.find((t) => t.id === profileId)
      : undefined;

  const teacherCourses = useMemo(() => {
    if (!isTeacher) return [];
    if (courses && courses.length > 0) return courses;
    const teacherId = profileTeacher?.id;
    const teacherName = profileTeacher?.name || user?.name || "";
    const teacherNumber = profileTeacher?.teacherNumber || user?.username || "";
    const nameLower = teacherName.toLowerCase();
    const numberLower = teacherNumber.toLowerCase();
    return (courses || []).filter((course) => {
      const courseTeacher = (course.teacher || "").toLowerCase();
      return Boolean(
        (teacherId && course.teacherId === teacherId) ||
        (teacherName && courseTeacher === nameLower) ||
        (teacherNumber && courseTeacher === numberLower),
      );
    });
  }, [courses, isTeacher, profileTeacher, user?.name, user?.username]);

  const teacherActivityCount = useMemo(() => {
    if (!isTeacher || !user?.username) return 0;
    return (activities || []).filter((item) => item.user === user.username)
      .length;
  }, [activities, isTeacher, user?.username]);

  const teacherRadarData = useMemo(() => {
    if (!isTeacher) return [];
    const courseCount = teacherCourses.length;
    const totalEnrolled = teacherCourses.reduce(
      (sum, c) => sum + (c.enrolled || 0),
      0,
    );
    const totalCapacity = teacherCourses.reduce(
      (sum, c) => sum + (c.maxCapacity || 0),
      0,
    );
    const avgCredits =
      courseCount > 0
        ? teacherCourses.reduce((sum, c) => sum + (c.credits || 0), 0) /
          courseCount
        : 0;
    const avgClassSize = courseCount > 0 ? totalEnrolled / courseCount : 0;
    const capacityRate = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0;

    const toRadar = (value: number, max: number) => {
      if (max <= 0) return 0;
      return Math.round(Math.min(1, Math.max(0, value / max)) * 150);
    };

    return [
      { subject: "课程数量", A: toRadar(courseCount, 6), full: 150 },
      { subject: "学生规模", A: toRadar(totalEnrolled, 200), full: 150 },
      { subject: "课堂负载", A: toRadar(capacityRate, 1), full: 150 },
      { subject: "学分强度", A: toRadar(avgCredits, 4), full: 150 },
      { subject: "班级规模", A: toRadar(avgClassSize, 50), full: 150 },
      { subject: "教学活跃", A: toRadar(teacherActivityCount, 20), full: 150 },
    ];
  }, [isTeacher, teacherCourses, teacherActivityCount]);

  const teacherSummary = useMemo(() => {
    if (!isTeacher) {
      return {
        courseCount: 0,
        totalEnrolled: 0,
        avgCredits: 0,
        capacityRate: 0,
      };
    }
    const courseCount = teacherCourses.length;
    const totalEnrolled = teacherCourses.reduce(
      (sum, c) => sum + (c.enrolled || 0),
      0,
    );
    const totalCapacity = teacherCourses.reduce(
      (sum, c) => sum + (c.maxCapacity || 0),
      0,
    );
    const avgCredits =
      courseCount > 0
        ? teacherCourses.reduce((sum, c) => sum + (c.credits || 0), 0) /
          courseCount
        : 0;
    const capacityRate = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0;
    return { courseCount, totalEnrolled, avgCredits, capacityRate };
  }, [isTeacher, teacherCourses]);

  const hasTeacherRadarData =
    teacherRadarData.length > 0 && teacherRadarData.some((item) => item.A > 0);

  const displayName = profileStudent?.name || profileTeacher?.name || user.name;
  const displayEmail =
    profileStudent?.email ||
    profileTeacher?.email ||
    user.email ||
    "未设置邮箱";
  const displayAvatar = resolveAvatar(
    profileStudent?.avatar || profileTeacher?.avatar || user.avatar,
    user.id || user.username || user.name,
  );
  const attendanceRate = profileStudent?.attendance ?? 0;
  const totalAssignments = assignments.length;
  const submittedAssignments = useMemo(() => {
    const ids = new Set(
      (submissions || []).map((s: any) => s.assignmentId || s.assignment?.id),
    );
    return ids.size;
  }, [submissions]);
  const submissionRate =
    totalAssignments > 0 ? submittedAssignments / totalAssignments : 0;
  const totalCredits = scoreStats?.totalCredits ?? 0;
  const totalExams = scoreStats?.totalExams ?? 0;
  const gpaValue = scoreStats?.gpa ?? profileStudent?.gpa ?? 0;
  const avgScore =
    scoreStats?.avgScore ?? (gpaValue ? (gpaValue / 4) * 100 : 0);
  const maxScore = scoreStats?.maxScore ?? 0;
  const minScore = scoreStats?.minScore ?? 0;
  const hasOverviewData =
    Boolean(scoreStats) ||
    totalAssignments > 0 ||
    submittedAssignments > 0 ||
    attendanceRate > 0 ||
    gpaValue > 0;

  const studentSkillData = useMemo(() => {
    const toRadar = (value: number, max: number) => {
      if (max <= 0) return 0;
      return Math.round(Math.min(1, Math.max(0, value / max)) * 150);
    };

    return [
      { subject: "学业成绩", A: toRadar(avgScore, 100), full: 150 },
      { subject: "GPA 表现", A: toRadar(gpaValue, 4), full: 150 },
      { subject: "考勤稳定", A: toRadar(attendanceRate, 100), full: 150 },
      { subject: "作业完成", A: toRadar(submissionRate, 1), full: 150 },
      { subject: "学术活跃", A: toRadar(totalExams, 12), full: 150 },
      { subject: "学分积累", A: toRadar(totalCredits, 30), full: 150 },
    ];
  }, [
    avgScore,
    gpaValue,
    attendanceRate,
    submissionRate,
    totalExams,
    totalCredits,
  ]);

  const radarPoints = useMemo(() => {
    const values = studentSkillData.map((item) => {
      const ratio =
        item.full > 0 ? Math.min(1, Math.max(0, item.A / item.full)) : 0;
      return ratio;
    });
    const count = Math.max(1, values.length);
    const center = 120;
    const radius = 88;
    return values.map((ratio, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const r = radius * ratio;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  }, [studentSkillData]);

  const radarLabels = useMemo(() => {
    const count = Math.max(1, studentSkillData.length);
    const center = 120;
    const radius = 104;
    return studentSkillData.map((item, i) => {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      return {
        label: item.subject,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });
  }, [studentSkillData]);
  const primaryIdLabel = isStudent ? "学号" : isTeacher ? "工号" : "账号";
  const primaryIdValue = isStudent
    ? profileStudent?.studentNumber || user.username
    : isTeacher
      ? profileTeacher?.teacherNumber || user.username
      : user.username;

  // 管理员概览
  const renderAdminOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Cpu size={16} className="text-zinc-500" /> 系统实时负载率
          </h3>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
            运行正常
          </span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={systemLoadData}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "#27272a" : "#f4f4f5"}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  backgroundColor: isDark ? "#18181b" : "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="load"
                stroke={isDark ? "#e4e4e7" : "#18181b"}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLoad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-zinc-500" /> 安全特权
          </h4>
          <ul className="space-y-3">
            {[
              "全局数据访问",
              "用户权限锁死/释放",
              "系统底层日志审计",
              "API 接口管理",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400"
              >
                <CheckCircle2
                  size={12}
                  className="text-zinc-900 dark:text-zinc-100"
                />{" "}
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-zinc-500" /> 系统备份记录
          </h4>
          <div className="space-y-2">
            {[
              { date: "今天 04:00", size: "2.4 GB", status: "成功" },
              { date: "昨天 04:00", size: "2.3 GB", status: "成功" },
            ].map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700/50"
              >
                <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                  {log.date}
                </span>
                <span className="text-[9px] font-bold text-zinc-400">
                  {log.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 教师概览
  const renderTeacherOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "授课课程",
            value: teacherSummary.courseCount,
            meta: "本学期",
          },
          {
            label: "授课学生",
            value: teacherSummary.totalEnrolled,
            meta: "已选人数",
          },
          {
            label: "课堂负载",
            value: `${Math.round(teacherSummary.capacityRate * 100)}%`,
            meta: `平均学分 ${teacherSummary.avgCredits.toFixed(1)}`,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {card.label}
            </p>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
              {card.value}
            </p>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">
              {card.meta}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Star size={16} className="text-zinc-500" /> 教学质量评价
          </h3>
        </div>
        {!hasTeacherRadarData && (
          <div className="text-xs font-bold text-zinc-500 mb-4">
            暂无课程与教学数据，开设课程后将生成评价图谱。
          </div>
        )}
        <div className="space-y-3">
          {teacherRadarData.map((item) => {
            const ratio =
              item.full > 0 ? Math.min(1, Math.max(0, item.A / item.full)) : 0;
            return (
              <div key={item.subject} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black text-zinc-500">
                  <span className="text-zinc-700 dark:text-zinc-200">
                    {item.subject}
                  </span>
                  <span>{Math.round(ratio * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <BookOpen size={14} className="text-zinc-500" /> 教学项目与课程
        </h4>
        <div className="space-y-3">
          {teacherCourses.length === 0 && (
            <div className="text-[10px] font-bold text-zinc-400">
              暂无课程记录。
            </div>
          )}
          {teacherCourses.map((course, i) => (
            <div
              key={`${course.id}-${i}`}
              className="p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1 line-clamp-1">
                {course.name}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black text-zinc-400 uppercase">
                  学分 {course.credits}
                </span>
                <span className="text-[9px] font-black text-zinc-500">
                  已选 {course.enrolled || 0}/{course.maxCapacity || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 学生概览
  const renderStudentOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {overviewLoading && (
        <div className="text-xs font-bold text-zinc-500">
          正在加载档案概览数据...
        </div>
      )}
      {!overviewLoading && overviewError && (
        <div className="text-xs font-bold text-rose-500">{overviewError}</div>
      )}
      {!overviewLoading && !overviewError && !hasOverviewData && (
        <div className="text-xs font-bold text-zinc-500">
          暂无学习数据，完成一次成绩/作业后将自动生成图谱。
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-6">
        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 xl:order-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-zinc-500" /> 专业能力图谱
            </h3>
          </div>
          <div className="space-y-4">
            <div className="min-w-[220px]">
              {hasOverviewData ? (
                <div className="h-64 flex items-start justify-center pt-1">
                  <svg width="240" height="240" viewBox="0 0 240 240">
                    <g
                      stroke={isDark ? "#27272a" : "#e4e4e7"}
                      strokeWidth="1"
                      fill="none"
                    >
                      <polygon points="120,32 196,72 208,152 120,208 32,152 44,72" />
                      <polygon points="120,52 180,82 190,146 120,190 50,146 60,82" />
                      <polygon points="120,72 164,92 172,140 120,172 68,140 76,92" />
                    </g>
                    <polygon
                      points={radarPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={
                        isDark
                          ? "rgba(228,228,231,0.25)"
                          : "rgba(24,24,27,0.25)"
                      }
                      stroke={isDark ? "#e4e4e7" : "#18181b"}
                      strokeWidth="2"
                    />
                    {radarPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill={isDark ? "#e4e4e7" : "#18181b"}
                      />
                    ))}
                    {radarLabels.map((l, i) => (
                      <text
                        key={i}
                        x={l.x}
                        y={l.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={isDark ? "#d4d4d8" : "#71717a"}
                      >
                        {l.label}
                      </text>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="text-xs font-bold text-zinc-500">
                  暂无数据，完成作业或成绩统计后自动生成雷达图。
                </div>
              )}
            </div>
            <div className="space-y-3">
              {studentSkillData.map((item) => {
                const ratio =
                  item.full > 0
                    ? Math.min(1, Math.max(0, item.A / item.full))
                    : 0;
                return (
                  <div key={item.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-zinc-500">
                      <span className="text-zinc-700 dark:text-zinc-200">
                        {item.subject}
                      </span>
                      <span>{Math.round(ratio * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 xl:order-1">
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" /> 学习关键指标
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "平均成绩",
                value: avgScore ? avgScore.toFixed(1) : "—",
                meta: "近阶段",
                percent: Math.min(100, Math.max(0, avgScore)),
              },
              {
                name: "最高分",
                value: maxScore ? maxScore.toFixed(1) : "—",
                meta: "最高纪录",
                percent: Math.min(100, Math.max(0, maxScore)),
              },
              {
                name: "出勤率",
                value: `${Math.round(attendanceRate)}%`,
                meta: "最近统计",
                percent: Math.min(100, Math.max(0, attendanceRate)),
              },
              {
                name: "作业完成率",
                value: `${Math.round(submissionRate * 100)}%`,
                meta: `${submittedAssignments}/${totalAssignments || 0}`,
                percent: Math.min(100, Math.max(0, submissionRate * 100)),
              },
              {
                name: "最低分",
                value: minScore ? minScore.toFixed(1) : "—",
                meta: "最低纪录",
                percent: Math.min(100, Math.max(0, minScore)),
              },
              {
                name: "累计学分",
                value: `${totalCredits}`,
                meta: "已完成",
                percent: Math.min(100, Math.max(0, (totalCredits / 30) * 100)),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {item.name}
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                      {item.value}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center">
                    <Award size={16} className="text-amber-500" />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-zinc-400">
                  {item.meta}
                </p>
                <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
      {/* Main Content - Split View */}
      <div className="flex-1 flex min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        {/* Left Panel: Profile Card & Nav (Fixed Width) */}
        <div className="w-[320px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-[2rem] p-6 text-center border border-zinc-200 dark:border-zinc-700/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-900/5 dark:bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-110"></div>
            <div className="relative inline-block mb-4">
              <img
                src={displayAvatar}
                className="w-24 h-24 rounded-2xl border-4 border-white dark:border-zinc-700 shadow-xl object-cover"
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src = buildAvatarUrl(
                    user.id || user.username || user.name,
                  );
                }}
              />
              <div className="absolute -bottom-2 -right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-1.5 rounded-lg shadow-lg">
                <ShieldCheck size={14} />
              </div>
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              {displayName}
            </h2>
            <span className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">
              {roleLabels[user.role]}
            </span>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                <Mail size={12} /> {displayEmail}
              </div>
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                <UserIcon size={12} /> {primaryIdLabel}: {primaryIdValue}
              </div>
              {isStudent && profileStudent?.class && (
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                  <BookMarked size={12} /> 班级: {profileStudent.class}
                </div>
              )}
              {isTeacher && profileTeacher?.department && (
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                  <Users size={12} /> 院系: {profileTeacher.department}
                </div>
              )}
              {isTeacher && profileTeacher?.title && (
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                  <Award size={12} /> 职称: {profileTeacher.title}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-xs shadow-lg shadow-zinc-200 dark:shadow-none hover:scale-105 transition-transform">
                编辑档案
              </button>
              <button className="py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                下载简历
              </button>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: "overview", label: "档案概览", icon: FileUser },
              { id: "security", label: "安全与隐私", icon: Lock },
              { id: "activity", label: "活动轨迹", icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/50 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/30"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Panel: Content Area (Flexible) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900 relative p-8 lg:p-12">
          <div className="max-w-3xl mx-auto">
            {activeTab === "overview" && renderOverview()}

            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2 mb-8">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                    安全与访问控制
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    保护您的数字身份，管理登录权限与数据可见性。
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700">
                        <Fingerprint size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                          双重身份验证 (2FA)
                        </p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                          为账号增加额外安全保护
                        </p>
                      </div>
                    </div>
                    <div className="w-10 h-5 bg-zinc-900 dark:bg-zinc-100 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white dark:bg-zinc-900 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                          公开范围设置
                        </p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                          控制数据可见性
                        </p>
                      </div>
                    </div>
                    <select className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-[10px] font-black text-zinc-600 dark:text-zinc-300 outline-none">
                      <option>仅自己可见</option>
                      <option>仅导师可见</option>
                      <option>全校公开</option>
                    </select>
                  </div>
                </div>

                <button className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all">
                  <Save size={14} /> 保存安全配置
                </button>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  最近活跃轨迹
                </h3>
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-100 dark:bg-zinc-800"></div>
                  {activityLoading && (
                    <div className="text-xs text-zinc-500 font-bold">
                      正在加载活动轨迹...
                    </div>
                  )}
                  {!activityLoading && activityError && (
                    <div className="text-xs text-rose-500 font-bold">
                      {activityError}
                    </div>
                  )}
                  {!activityLoading &&
                    !activityError &&
                    activityItems.length === 0 && (
                      <div className="text-xs text-zinc-500 font-bold">
                        暂无活动记录。
                      </div>
                    )}
                  {!activityLoading &&
                    !activityError &&
                    activityItems.map((item, i) => (
                      <div
                        key={`${item.action}-${item.time}-${i}`}
                        className="relative"
                      >
                        <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-400"></div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                              {item.action}
                            </span>
                            {item.target && (
                              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                {item.target}
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                              {item.time}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-medium">
                            {item.category && (
                              <span className="mr-2">
                                分类: {item.category}
                              </span>
                            )}
                            {item.level && <span>等级: {item.level}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
