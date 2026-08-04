import React, { useState, useRef, useEffect } from "react";
import { PageType, User } from "../types";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BrainCircuit,
  Settings,
  Search,
  Bell,
  LogOut,
  Hexagon,
  FileUser,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileText,
  MapPin,
  HelpCircle,
  BarChart3,
  ClipboardList,
  Library,
  BookmarkCheck,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Sun,
  Moon,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  UserCheck,
  Maximize2,
  History,
  ShieldAlert,
  HardDrive,
  UsersRound,
  FileSearch,
  MousePointer2,
  ArrowRightToLine,
  Ban,
  User as UserIcon,
  ChevronDown,
  School,
  Briefcase,
  Shapes,
  Building2,
} from "lucide-react";
import { aiApi, notificationsApi } from "../services/api";

const getNotificationIcon = (type?: string) => {
  switch (type) {
    case "ACTIVITY":
    case "SUCCESS":
      return <CheckCircle2 className="text-emerald-500" size={14} />;
    case "MAINTENANCE":
    case "WARNING":
      return <AlertCircle className="text-amber-500" size={14} />;
    case "EMERGENCY":
    case "ERROR":
      return <X className="text-rose-500" size={14} />;
    case "EXAM":
      return <Clock className="text-violet-500" size={14} />;
    case "STUDENT_AFFAIRS":
      return <UserIcon className="text-sky-500" size={14} />;
    case "TEACHING":
    case "INFO":
    default:
      return <Info className="text-blue-500" size={14} />;
  }
};
import { buildAvatarUrl, resolveAvatar } from "../utils/avatar";
import { Reorder } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LayoutProps {
  children: React.ReactNode;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  user: User;
  onLogout: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: "控制面板",
  students: "学生管理",
  teachers: "教师管理",
  classes: "班级管理",
  departments: "院系管理",
  majors: "专业管理",
  classrooms: "教室管理",
  profile: "学籍档案",
  schedule: "我的课表",
  "my-courses": "我的课程",
  "campus-courses": "校园选课",
  grades: "我的成绩",
  assignments: "作业提交",
  leave: "请假申请",
  checkin: "位置签到",

  "teacher-courses": "我的授课",
  "teacher-schedule": "教师课表",
  "teacher-assignments": "作业管理",
  "teacher-checkin-publish": "签到发布",
  "ai-insights": "学术分析",
  settings: "系统设置",
  "ai-chat": "AI 对话工作站",
  "admin-users": "全校用户管理",
  "admin-courses": "课程管理",
  "admin-logs": "监控日志",
  "grades-manage": "成绩管理",
  "attendance-manage": "考勤管理",
  "leave-approval": "请假审批",
  "schedule-manage": "排课管理",
  "admin-notifications": "通知公告管理",
};

const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  setActivePage,
  user,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("layout.sidebarCollapsed");
    if (saved == null) return true;
    return saved === "true";
  });
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState<PageType[]>(["dashboard"]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    page: PageType;
  } | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "light";
  });
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: `你好 ${user.name}，我是你的智能校园助理。有什么我可以帮你的吗？`,
    },
  ]);

  const [notifications, setNotifications] = useState<any[]>([]);

  const notificationRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const assistantMessagesRef = useRef<HTMLDivElement>(null);
  const assistantMessagesEndRef = useRef<HTMLDivElement>(null);
  const assistantInputRef = useRef<HTMLInputElement>(null);

  const scrollAssistantToBottom = (behavior: ScrollBehavior = "smooth") => {
    assistantMessagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    // Poll for notifications every 30 seconds
    const fetchNotifications = async () => {
      try {
        const res = await notificationsApi.getUserNotifications(
          user.id || "current-user",
          user.role,
        );
        if (Array.isArray(res)) {
          setNotifications(res);
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Reduce to 10s for better responsiveness

    // Listen for manual update triggers (e.g., when sending a new notification)
    const handleManualUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener("notification-updated", handleManualUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notification-updated", handleManualUpdate);
    };
  }, [user.id]);

  // Sync activePage to openTabs
  // Sync activePage to openTabs
  useEffect(() => {
    setOpenTabs((prev) => {
      if (prev.includes(activePage)) return prev;
      return [...prev, activePage];
    });
  }, [activePage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("layout.sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (!isAssistantOpen) return;
    const raf = requestAnimationFrame(() => scrollAssistantToBottom("auto"));
    return () => cancelAnimationFrame(raf);
  }, [isAssistantOpen]);

  useEffect(() => {
    if (!isAssistantOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || "";
      const editing =
        tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (editing) return;

      e.preventDefault();
      assistantInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAssistantOpen]);

  useEffect(() => {
    if (!isAssistantOpen) return;
    const raf = requestAnimationFrame(() => scrollAssistantToBottom("smooth"));
    return () => cancelAnimationFrame(raf);
  }, [messages, isTyping, isAssistantOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const closeTab = (e: React.MouseEvent | null, page: PageType) => {
    if (e) e.stopPropagation();
    if (page === "dashboard") return;
    const newTabs = openTabs.filter((t) => t !== page);
    setOpenTabs(newTabs);
    if (activePage === page) {
      setActivePage(newTabs[newTabs.length - 1]);
    }
    setContextMenu(null);
  };

  const closeOtherTabs = (page: PageType) => {
    const newTabs = openTabs.filter((t) => t === "dashboard" || t === page);
    setOpenTabs(newTabs);
    setActivePage(page);
    setContextMenu(null);
  };

  const closeRightTabs = (page: PageType) => {
    const index = openTabs.indexOf(page);
    const newTabs = openTabs.slice(0, index + 1);
    if (!newTabs.includes("dashboard")) newTabs.unshift("dashboard");
    setOpenTabs(newTabs);
    if (!newTabs.includes(activePage)) setActivePage(page);
    setContextMenu(null);
  };

  const closeAllTabs = () => {
    setOpenTabs(["dashboard"]);
    setActivePage("dashboard");
    setContextMenu(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      target.classList.add("opacity-40");
    });
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const newTabs = [...openTabs];
    const draggedItem = newTabs[draggedIdx];
    newTabs.splice(draggedIdx, 1);
    newTabs.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setOpenTabs(newTabs);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIdx(null);
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("opacity-40");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleContextMenu = (e: React.MouseEvent, page: PageType) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, page });
  };

  const menuGroups = [
    {
      title: "概览",
      items: [
        {
          id: "dashboard",
          label: "控制面板",
          icon: LayoutDashboard,
          roles: ["admin", "teacher", "student"],
        },
        {
          id: "ai-insights",
          label: "学术分析",
          icon: BrainCircuit,
          roles: ["admin", "teacher"],
        },
      ],
    },
    {
      title: "教务教学",
      items: [
        {
          id: "teacher-courses",
          label: "我的授课",
          icon: GraduationCap,
          roles: ["teacher"],
        },
        {
          id: "teacher-schedule",
          label: "教师课表",
          icon: CalendarDays,
          roles: ["teacher"],
        },
        {
          id: "teacher-assignments",
          label: "作业管理",
          icon: ClipboardList,
          roles: ["teacher"],
        },
        {
          id: "teacher-checkin-publish",
          label: "签到发布",
          icon: CalendarCheck,
          roles: ["teacher"],
        },
        {
          id: "profile",
          label: "学籍档案",
          icon: FileUser,
          roles: ["student"],
        },
        {
          id: "schedule",
          label: "我的课表",
          icon: CalendarDays,
          roles: ["student"],
        },
        {
          id: "my-courses",
          label: "我的课程",
          icon: BookmarkCheck,
          roles: ["student"],
        },
        {
          id: "campus-courses",
          label: "校园选课",
          icon: Library,
          roles: ["student", "admin"],
        },
        {
          id: "grades",
          label: "我的成绩",
          icon: BarChart3,
          roles: ["student"],
        },
        {
          id: "assignments",
          label: "作业提交",
          icon: ClipboardList,
          roles: ["student"],
        },
        { id: "leave", label: "请假申请", icon: FileText, roles: ["student"] },
        { id: "checkin", label: "位置签到", icon: MapPin, roles: ["student"] },
      ],
    },
    {
      title: "管理中心",
      items: [
        {
          id: "admin-users",
          label: "用户管理",
          icon: UsersRound,
          roles: ["admin"],
        },
        {
          id: "students",
          label: "学生管理",
          icon: Users,
          roles: ["admin", "teacher"],
        },
        {
          id: "teachers",
          label: "教师管理",
          icon: Briefcase,
          roles: ["admin"],
        },
        {
          id: "classes",
          label: "班级管理",
          icon: Shapes,
          roles: ["admin", "teacher"],
        },
        {
          id: "admin-courses",
          label: "课程管理",
          icon: HardDrive,
          roles: ["admin"],
        },
        {
          id: "attendance-manage",
          label: "考勤管理",
          icon: CalendarCheck,
          roles: ["teacher", "admin"],
        },
        {
          id: "grades-manage",
          label: "成绩管理",
          icon: ClipboardCheck,
          roles: ["teacher", "admin"],
        },
        {
          id: "departments",
          label: "院系管理",
          icon: Building2,
          roles: ["admin"],
        },
        { id: "majors", label: "专业管理", icon: BookOpen, roles: ["admin"] },
        {
          id: "classrooms",
          label: "教室管理",
          icon: School,
          roles: ["admin", "teacher"],
        },
        {
          id: "schedule-manage",
          label: "排课管理",
          icon: CalendarDays,
          roles: ["admin"],
        },
        {
          id: "leave-approval",
          label: "请假审批",
          icon: UserCheck,
          roles: ["teacher", "admin"],
        },
        {
          id: "admin-notifications",
          label: "通知公告管理",
          icon: Bell,
          roles: ["admin"],
        },
        {
          id: "admin-logs",
          label: "监控日志",
          icon: FileSearch,
          roles: ["admin"],
        },
      ],
    },
    {
      title: "系统",
      items: [
        { id: "settings", label: "系统设置", icon: Settings, roles: ["admin"] },
      ],
    },
  ];

  const roleLabel =
    user.role === "admin"
      ? "系统管理员"
      : user.role === "teacher"
        ? "教师"
        : "学生";

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);
    requestAnimationFrame(() => scrollAssistantToBottom("smooth"));
    try {
      const res = await aiApi.chat(
        userMsg,
        `你是一个智能校园助理。当前用户是${user.name}（角色：${user.role}）。请结合校园管理场景回答问题。`,
        user.id,
      );
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: res?.response || "抱歉，没能理解。" },
      ]);
      requestAnimationFrame(() => scrollAssistantToBottom("smooth"));
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", text: "连接服务失败。" }]);
      requestAnimationFrame(() => scrollAssistantToBottom("smooth"));
    } finally {
      setIsTyping(false);
    }
  };

  // Fix: Added 'classes' to isFullScreenPage
  const isFullScreenPage = [
    "schedule",
    "teacher-schedule",
    "admin-notifications",
    "majors",
    "ai-chat",
    "students",
    "teachers",
    "classes",
    "admin-courses",
    "departments",
    "classrooms",
    "admin-users",
    "grades-manage",
    "attendance-manage",
    "leave-approval",
    "schedule-manage",
    "campus-courses",
    "leave",
    "ai-insights",
    "settings",
    "profile",
    "dashboard",
    "admin-logs",
  ].includes(activePage);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex transition-[width] duration-500 ease-in-out relative z-20 will-change-[width] ${isCollapsed ? "w-20" : "w-72"}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center shadow-sm hover:text-zinc-900 transition-all z-30"
        >
          {isCollapsed ? (
            <ChevronRight size={12} className="dark:text-zinc-300" />
          ) : (
            <ChevronLeft size={12} className="dark:text-zinc-300" />
          )}
        </button>

        <div className="flex flex-col h-full overflow-hidden">
          <div
            className={`flex items-center transition-all duration-500 ease-in-out ${isCollapsed ? "pl-5 py-6 gap-0" : "pl-6 py-6 gap-4"}`}
          >
            <div className="w-10 h-10 min-w-[40px] bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shrink-0 z-10 relative">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-center whitespace-nowrap ${isCollapsed ? "w-0 opacity-0 -translate-x-4" : "w-40 opacity-100 translate-x-0"}`}
            >
              <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Smart-SMS
              </h1>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                Administrator
              </p>
            </div>
          </div>
          <nav className="flex-1 px-3 space-y-3 mt-2 pb-8 overflow-y-auto custom-scrollbar">
            {menuGroups.map((group, groupIndex) => {
              const visibleItems = group.items.filter((item) =>
                item.roles.includes(user.role),
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={groupIndex}>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActivePage(item.id as PageType)}
                          className={`group w-full flex items-center transition-all duration-300 ease-out relative rounded-xl h-9 shrink-0 overflow-hidden ${isCollapsed ? "pl-[19px] gap-0" : "px-4 gap-3"} ${isActive ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                        >
                          <Icon
                            size={18}
                            className={`shrink-0 transition-transform duration-300 ${isActive ? "scale-100" : "group-hover:scale-110"}`}
                          />
                          <span
                            className={`text-xs font-bold truncate transition-all duration-300 ease-in-out whitespace-nowrap ${isCollapsed ? "w-0 opacity-0" : "w-32 opacity-100"}`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-zinc-50 dark:bg-zinc-950 min-w-0 transition-all duration-500 ease-in-out">
        {activePage !== "ai-chat" && (
          <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 shrink-0">
            <div className="h-16 px-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                <History size={14} />
                <button
                  onClick={() => setActivePage("dashboard")}
                  className="hover:text-zinc-900 transition-colors text-[10px] uppercase tracking-widest font-black"
                >
                  Smart-SMS
                </button>
                <ChevronRight size={10} />
                <span className="text-zinc-900 dark:text-zinc-200 font-black text-[10px] uppercase tracking-widest">
                  {PAGE_LABELS[activePage]}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-100 dark:border-zinc-800"
                >
                  {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={() => setIsAssistantOpen(true)}
                  className="p-2 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-300 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-200"
                >
                  <Hexagon size={18} />
                </button>
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className={`p-2 rounded-xl transition-all border ${isNotificationsOpen ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 border-zinc-300" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 border-zinc-100 dark:border-zinc-800"}`}
                  >
                    <div className="relative">
                      <Bell size={18} />
                      {notifications.some((n) => !n.read) && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900" />
                      )}
                    </div>
                  </button>
                  {isNotificationsOpen && (
                    <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 font-black text-sm text-zinc-900 dark:text-zinc-100">
                        通知中心
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0 flex gap-3"
                            >
                              <div className="mt-0.5 shrink-0">
                                {getNotificationIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs font-bold transition-colors mb-1 ${n.read ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
                                >
                                  {n.title}
                                </p>
                                <p className="text-[10px] text-zinc-500 underline-offset-2 leading-relaxed line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="text-[8px] text-zinc-400 mt-1 font-bold uppercase tracking-tight">
                                  {new Date(
                                    n.createdAt || Date.now(),
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              暂无新通知
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

                {/* 头像与下拉菜单 */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`flex items-center gap-3 pl-2 py-1.5 pr-2 rounded-xl transition-all border ${isProfileOpen ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    <img
                      src={resolveAvatar(
                        user.avatar,
                        user.id || user.username || user.name,
                      )}
                      className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = buildAvatarUrl(
                          user.id || user.username || user.name,
                        );
                      }}
                    />
                    <div className="hidden lg:block text-right">
                      <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 leading-none">
                        {user.name}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">
                        {roleLabel}
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-zinc-400 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-5 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-4">
                          <img
                            src={resolveAvatar(
                              user.avatar,
                              user.id || user.username || user.name,
                            )}
                            className="w-12 h-12 rounded-xl border border-white dark:border-zinc-700 shadow-sm"
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                buildAvatarUrl(
                                  user.id || user.username || user.name,
                                );
                            }}
                          />
                          <div>
                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                              {user.name}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              {roleLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => {
                            setActivePage("profile");
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl transition-all"
                        >
                          <UserIcon size={14} /> 个人档案
                        </button>
                        <button
                          onClick={() => {
                            setActivePage("settings");
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-xl transition-all"
                        >
                          <Settings size={14} /> 系统设置
                        </button>
                      </div>

                      <div className="p-2 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                        >
                          <LogOut size={14} /> 退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Reorder.Group
              axis="x"
              values={openTabs}
              onReorder={setOpenTabs}
              className="h-12 px-6 flex items-center gap-2 overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 font-sans"
            >
              {openTabs.map((tab) => (
                <Reorder.Item
                  key={tab}
                  value={tab}
                  onContextMenu={(e) => handleContextMenu(e, tab)}
                  onClick={() => setActivePage(tab)}
                  className={`group flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors duration-200 relative shrink-0 cursor-grab active:cursor-grabbing select-none border ${
                    activePage === tab
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 shadow-sm"
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  }`}
                  whileDrag={{ scale: 1.05 }}
                  style={{ zIndex: activePage === tab ? 10 : 1 }}
                >
                  <span className="whitespace-nowrap pointer-events-none">
                    {PAGE_LABELS[tab]}
                  </span>
                  {tab !== "dashboard" && (
                    <div
                      onClick={(e) => closeTab(e, tab)}
                      className={`shrink-0 transition-opacity p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer ${activePage === tab ? "opacity-100 text-zinc-400 hover:text-zinc-900" : "opacity-0 group-hover:opacity-100 text-zinc-400"}`}
                    >
                      <X size={10} className="pointer-events-none" />
                    </div>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </header>
        )}

        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed z-[999] w-48 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => closeTab(null, contextMenu.page)}
              disabled={contextMenu.page === "dashboard"}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
            >
              <X size={14} /> 关闭当前页
            </button>
            <button
              onClick={() => closeOtherTabs(contextMenu.page)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <MousePointer2 size={14} /> 关闭其他页
            </button>
            <button
              onClick={() => closeRightTabs(contextMenu.page)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <ArrowRightToLine size={14} /> 关闭右侧所有页
            </button>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />
            <button
              onClick={closeAllTabs}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
            >
              <Ban size={14} /> 关闭所有页
            </button>
          </div>
        )}

        {/* 主内容区域：根据页面类型决定是否全屏/无边距 */}
        <div
          className={`flex-1 overflow-y-auto relative z-0 bg-zinc-50 dark:bg-zinc-950 ${isFullScreenPage ? "p-0 overflow-hidden" : "p-4 lg:p-6"} custom-scrollbar`}
        >
          {children}
        </div>

        {/* AI Assistant Sidebar */}
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isAssistantOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        >
          <div
            className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
            onClick={() => setIsAssistantOpen(false)}
          ></div>
          <div
            className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl transition-transform duration-500 transform ${isAssistantOpen ? "translate-x-0" : "translate-x-full"} flex flex-col`}
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-900 text-white">
              <div className="flex items-center gap-3">
                <Hexagon size={20} />
                <h3 className="font-black">AI 智能校园助理</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsAssistantOpen(false);
                    setActivePage("ai-chat");
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  onClick={() => setIsAssistantOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div
              ref={assistantMessagesRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-950/20 custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium ${msg.role === "user" ? "bg-zinc-900 text-white rounded-br-none" : "bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-bl-none"}`}
                  >
                    {msg.role === "user" ? (
                      msg.text
                    ) : (
                      <div className="leading-6 text-zinc-700 dark:text-zinc-200 [&_p]:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-1 [&_pre]:my-2 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-200 [&_pre]:dark:border-zinc-700 [&_pre]:bg-zinc-50 [&_pre]:dark:bg-zinc-900 [&_pre]:p-3 [&_code]:bg-zinc-100 [&_code]:dark:bg-zinc-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-4 rounded-2xl text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-bl-none flex items-center gap-2 text-zinc-500 dark:text-zinc-300">
                    <Loader2 size={14} className="animate-spin" />
                    <span>AI 正在思考中...</span>
                  </div>
                </div>
              )}
              <div ref={assistantMessagesEndRef} />
            </div>
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <input
                  ref={assistantInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={isTyping ? "AI 正在处理中..." : "输入消息..."}
                  disabled={isTyping}
                  className="w-full pl-6 pr-12 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs dark:text-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !chatInput.trim()}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-zinc-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTyping ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Layout;
