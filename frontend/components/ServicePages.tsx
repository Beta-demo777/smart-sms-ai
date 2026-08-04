
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LeaveRequest } from '../types';
import { leavesApi, scoresApi, assignmentsApi, attendanceApi, attendanceSessionsApi, schedulesApi } from '../services/api';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import {
  FileText,
  Plus,
  Send,
  MapPin,
  HelpCircle,
  CalendarDays,
  Clock,
  ChevronRight,
  TrendingUp,
  Award,
  BookMarked,
  ArrowUpRight,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UploadCloud,
  Timer,
  Sparkles
} from 'lucide-react';

export const LeaveRequestPage: React.FC = () => {
  const { currentUser, profileId } = useData();
  const effectiveStudentId = profileId || currentUser?.id || '';
  const showToast = useToast();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'PERSONAL' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: '',
    urgency: 'NORMAL'
  });

  const fetchHistory = async () => {
    if (!effectiveStudentId) return;
    setLoading(true);
    try {
      const data = await leavesApi.getStudentRequests(effectiveStudentId);
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch leave history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [effectiveStudentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveStudentId) return;
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      showToast('请完整填写申请信息', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await leavesApi.submitRequest({
        studentId: effectiveStudentId,
        type: formData.type,
        startDate: formData.startDate.split('T')[0], // Extract date
        endDate: formData.endDate.split('T')[0],
        reason: formData.reason
      });
      showToast('申请提交成功', 'success');
      setFormData({
        type: 'PERSONAL',
        startDate: '',
        endDate: '',
        reason: '',
        urgency: 'NORMAL'
      });
      fetchHistory();
    } catch (err) {
      showToast('提交失败，请稍后重试', 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return '已通过 (Approved)';
      case 'PENDING': return '审核中 (Pending)';
      case 'REJECTED': return '已拒绝 (Rejected)';
      default: return status;
    }
  };

  const formatLeaveType = (type: string) => {
    switch (type) {
      case 'SICK': return '病假 (Sick Leave)';
      case 'PERSONAL': return '事假 (Personal)';
      case 'OTHER': return '公假 (Official)';
      default: return type;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText size={16} className="text-zinc-400" />
            请假申请 <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md text-[10px]">{history.length} 条记录</span>
          </h2>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        {/* Left Panel: Form (Fixed Width) */}
        <div className="w-full lg:w-[480px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 overflow-y-auto custom-scrollbar">
          <div className="p-6 lg:p-8">
            <div className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-2">发起新申请</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">请如实填写请假信息。病假需附医院证明。</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">请假类型</label>
                  <div className="relative group">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-bold text-zinc-700 dark:text-zinc-200 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="SICK">病假 (Sick)</option>
                      <option value="PERSONAL">事假 (Personal)</option>
                      <option value="OTHER">公假 (Official)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">紧急程度</label>
                  <div className="relative group">
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                    <select
                      value={formData.urgency}
                      onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-bold text-zinc-700 dark:text-zinc-200 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="NORMAL">普通 (Normal)</option>
                      <option value="URGENT">紧急 (Urgent)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">开始日期</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">结束日期</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">事由说明</label>
                <textarea
                  rows={6}
                  required
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-none transition-all text-sm text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 shadow-sm"
                  placeholder="请详细说明请假原因..."
                  style={{ minHeight: '120px' }}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black shadow-lg shadow-zinc-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {submitting ? <Timer className="animate-spin" size={16} /> : <Send size={16} />}
                提交申请
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel: History (Flexible) */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="p-6 lg:p-8 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 px-1">最近申请记录</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-20 opacity-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <FileText size={48} className="mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">暂无申请记录</p>
                </div>
              ) : history.map((req) => (
                <div key={req.id} className="group bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${req.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/30' :
                        req.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-900/30' :
                          'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/30'
                        }`}>
                        {req.status === 'APPROVED' ? <CheckCircle2 size={20} /> : req.status === 'PENDING' ? <Timer size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatLeaveType(req.type)}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${req.status === 'APPROVED' ? 'text-emerald-600' : req.status === 'PENDING' ? 'text-amber-600' : 'text-rose-600'
                            }`}>{getStatusLabel(req.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500">
                      <CalendarDays size={12} /> {req.startDate} 至 {req.endDate}
                    </div>
                  </div>
                  <div className="pl-[52px]">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 leading-relaxed">
                      {req.reason}
                    </p>
                    {req.reviewComment && (
                      <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border-l-4 border-zinc-200 dark:border-zinc-700">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">审批反馈 By: {req.reviewerName || '系统'}</p>
                        <p className="text-[11px] text-zinc-500 italic">{req.reviewComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CheckInPage: React.FC = () => {
  const { profileId } = useData();
  const showToast = useToast();
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [checkinCode, setCheckinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const selectedSession = useMemo(
    () => activeSessions.find((s) => s.id === selectedSessionId),
    [activeSessions, selectedSessionId]
  );

  const hasCheckedInForSelectedSession = useMemo(() => {
    if (!selectedSession) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return attendanceRecords.some((record: any) => {
      if (record?.status !== 'PRESENT') return false;
      const recordDate = String(record?.date || '').slice(0, 10);
      if (recordDate !== todayStr) return false;
      const notes = String(record?.notes || '');
      return notes.includes(`签到场次: ${selectedSession.title}`);
    });
  }, [attendanceRecords, selectedSession]);

  const loadCheckInData = useCallback(async (preferredSessionId?: string) => {
    if (!profileId) return;
    try {
      const [attendance, sessions] = await Promise.all([
        attendanceApi.getStudentAttendance(profileId),
        attendanceSessionsApi.getActiveSessionsForStudent(profileId),
      ]);
      const nextSessions = Array.isArray(sessions) ? sessions : [];
      setAttendanceRecords(Array.isArray(attendance) ? attendance : []);
      setActiveSessions(nextSessions);
      if (!nextSessions.length) {
        setSelectedSessionId('');
        return;
      }
      const hasPreferred = preferredSessionId && nextSessions.some((s) => s.id === preferredSessionId);
      setSelectedSessionId(hasPreferred ? preferredSessionId! : nextSessions[0].id);
    } catch (err) {
      console.error("Failed to load check-in data", err);
    }
  }, [profileId]);

  useEffect(() => {
    const initPage = async () => {
      if (!profileId) return;
      setLoading(true);
      await loadCheckInData();
      setLoading(false);
    };
    initPage();
  }, [profileId, loadCheckInData]);

  const handleCheckIn = async () => {
    if (!profileId) return;
    if (!selectedSessionId) {
      showToast('当前无可签到课程', 'error');
      return;
    }
    setCheckingIn(true);
    try {
      if (!checkinCode.trim()) {
        showToast('请输入签到码', 'error');
        setCheckingIn(false);
        return;
      }
      await attendanceSessionsApi.checkInBySession(selectedSessionId, profileId, checkinCode);
      showToast('签到成功！', 'success');
      setCheckinCode('');
      await loadCheckInData(selectedSessionId);
    } catch (err) {
      showToast('签到失败，请稍后重试', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">快捷签到</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">点击下方按钮即可完成课程签到。</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none relative overflow-hidden transition-all duration-500">
        {loading ? (
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent"></div>
        ) : (
          <>
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600"></div>

            <div className="w-40 h-40 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-10 relative group">
              <div className={`absolute inset-0 bg-zinc-400/10 rounded-full scale-150 blur-3xl transition-opacity duration-1000 ${hasCheckedInForSelectedSession ? 'opacity-0' : 'opacity-100 animate-pulse'}`}></div>
              <div className={`absolute inset-0 bg-zinc-400/20 rounded-full ${checkingIn || hasCheckedInForSelectedSession ? '' : 'animate-ping'}`}></div>

              {hasCheckedInForSelectedSession ? (
                <CheckCircle2 size={64} className="text-emerald-500 relative z-10 animate-in zoom-in duration-500" />
              ) : (
                <UserCheck size={64} className="text-zinc-700 dark:text-zinc-300 relative z-10" />
              )}
            </div>

            <div className="text-center space-y-4 px-6 max-w-md">
              {activeSessions.length > 0 && (
                <div className="text-left bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">当前可签到场次</p>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  >
                    {activeSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} · {s.courseName}
                      </option>
                    ))}
                  </select>
                  <input
                    value={checkinCode}
                    onChange={(e) => setCheckinCode(e.target.value.toUpperCase())}
                    placeholder="输入签到码"
                    className="w-full mt-2 h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
              )}
              {activeSessions.length > 0 ? (
                <div>
                  <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-black rounded-full uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 mb-2">
                    已发布签到场次
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                    {hasCheckedInForSelectedSession ? '当前场次已签到' : '确认参与课程'}
                  </h3>
                </div>
              ) : (
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  当前无可签到课程
                </h3>
              )}

              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                {hasCheckedInForSelectedSession
                  ? '您的出勤记录已实时同步至后台考勤系统。'
                  : (activeSessions.length > 0 ? '请输入签到码后完成本次课程签到。' : '请等待教师发布签到场次。')}
              </p>

              <button
                type="button"
                disabled={checkingIn || hasCheckedInForSelectedSession || !selectedSessionId}
                onClick={handleCheckIn}
                className={`mt-8 px-16 py-5 rounded-[2rem] font-black shadow-2xl transition-all flex items-center gap-3 active:scale-95 disabled:shadow-none disabled:active:scale-100
                  ${hasCheckedInForSelectedSession
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 cursor-default'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-zinc-200 dark:shadow-none hover:scale-105 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50'
                  }`}
              >
                {checkingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    正在提交...
                  </>
                ) : hasCheckedInForSelectedSession ? (
                  <>
                    <CheckCircle2 size={20} />
                    已签到
                  </>
                ) : (
                  '立即签到'
                )}
              </button>
            </div>

            <div className="mt-12 flex items-center gap-2 py-1.5 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-100 dark:border-zinc-800">
              <Clock size={12} /> {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const WikiPage: React.FC = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">校园百科</h2>
      <p className="text-slate-500 dark:text-slate-400 font-medium">快速查询校园政策与生活指南。</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { q: '如何申请奖学金？', tag: '政策' },
        { q: '宿舍供暖时间？', tag: '生活' },
        { q: '图书馆预约规则？', tag: '学术' },
      ].map((item, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group">
          <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-md mb-4 uppercase tracking-widest">{item.tag}</span>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.q}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">点击查看详细的操作指南与政策文件...</p>
        </div>
      ))}
    </div>
  </div>
);

export const SchedulePage: React.FC = () => {
  const { currentUser, profileId } = useData();
  const showToast = useToast();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedCourseId, setFocusedCourseId] = useState<string | null>(null);
  const [focusedCourseName, setFocusedCourseName] = useState<string>('');

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!profileId || !currentUser) return;
      setLoading(true);
      try {
        let items: ScheduleItem[] = [];
        if (currentUser.role === 'student') {
          items = await schedulesApi.getForStudent(profileId);
        } else if (currentUser.role === 'teacher') {
          items = await schedulesApi.getForTeacher(profileId);
        } else {
          items = await schedulesApi.getAll();
        }
        setScheduleItems(items);
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [profileId, currentUser]);

  useEffect(() => {
    const raw = localStorage.getItem('scheduleIntent');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.courseId) {
        setFocusedCourseId(parsed.courseId);
        setFocusedCourseName(parsed.courseName || '');
        showToast(`已定位课程：${parsed.courseName || '目标课程'}`, 'info');
      }
    } catch {
      // ignore malformed intent
    } finally {
      localStorage.removeItem('scheduleIntent');
    }
  }, []);

  const getSlot = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const dayMap: Record<string, string> = {
    'MONDAY': '周一',
    'TUESDAY': '周二',
    'WEDNESDAY': '周三',
    'THURSDAY': '周四',
    'FRIDAY': '周五',
    'SATURDAY': '周六',
    'SUNDAY': '周日'
  };

  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500 overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Calendar Header */}
          <div className="grid grid-cols-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <div className="p-4 flex items-center justify-center border-r border-slate-100 dark:border-slate-800/50">
              <CalendarDays className="text-indigo-600 dark:text-indigo-400" size={18} />
            </div>
            {dayOrder.map(d => (
              <div key={d} className="p-4 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/50 last:border-r-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{d.slice(0, 3)}</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{dayMap[d]}</span>
              </div>
            ))}
          </div>

          {/* Time Slots Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-8 divide-x divide-slate-100 dark:divide-slate-800/50 min-h-full">
              {['morning', 'afternoon', 'evening'].map((slot, slotIdx) => (
                <React.Fragment key={slot}>
                  {/* Row Header (Vertical) */}
                  <div className={`col-start-1 p-6 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 font-black text-slate-400 dark:text-slate-600 sticky left-0 z-10 
                    ${slot === 'morning' ? 'text-amber-500' : slot === 'afternoon' ? 'text-indigo-500' : 'text-purple-500'}`}>
                    <span className="text-xs">{slot === 'morning' ? '上午' : slot === 'afternoon' ? '下午' : '晚上'}</span>
                    <span className="text-[9px] uppercase tracking-tighter mt-1 opacity-50">{slot}</span>
                  </div>

                  {dayOrder.map(day => {
                    const item = scheduleItems.find(s => s.dayOfWeek === day && getSlot(s.startTime) === slot);
                    return (
                      <div key={day + slot} className="bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50 min-h-[160px] p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                        {item ? (
                          <div className={`h-full w-full p-4 rounded-3xl shadow-sm border flex flex-col items-start justify-between transition-all group-hover:shadow-md group-hover:-translate-y-0.5 relative overflow-hidden ${
                            focusedCourseId && item.course?.id === focusedCourseId
                              ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/20 dark:ring-zinc-100/30'
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50'
                          }`}>
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="w-full">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{item.course?.credits} CREDITS</span>
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                              </div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight mb-2 uppercase">{item.course?.name}</h4>
                              {focusedCourseId && item.course?.id === focusedCourseId && (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                                  已定位
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 w-full">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                <MapPin size={10} className="text-slate-300" />
                                <span>{item.classroom?.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                <Clock size={10} className="text-slate-300" />
                                <span>{item.startTime} - {item.endTime}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={16} className="text-slate-200 dark:text-slate-800" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Footer Stats Bar */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本周共有 {scheduleItems.length} 节课程</span>
              </div>
              {focusedCourseId && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">已定位: {focusedCourseName || focusedCourseId}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前学期: 2023-FALL</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Smart-SMS <Sparkles size={10} /> Immersive View
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const GradesPage: React.FC = () => {
  const { profileId } = useData();
  const showToast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profileId) return;
      setLoading(true);
      setError(null);
      try {
        const [statsData, scoresData] = await Promise.all([
          scoresApi.getStudentStats(profileId),
          scoresApi.getByStudent(profileId)
        ]);
        setStats(statsData);
        setScores(scoresData);
      } catch (err) {
        setError('成绩数据加载失败，请稍后重试');
        showToast('成绩数据加载失败，请稍后重试', 'error');
        console.error("Failed to fetch academic stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent"></div>
      </div>
    );
  }

  const formatGradedAt = (value?: string) => {
    if (!value) return '未记录';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '未记录';
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">成绩看板</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">查看当前学术等第与详情。</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 dark:bg-zinc-100 p-8 rounded-3xl text-white dark:text-zinc-900 shadow-sm relative overflow-hidden group border border-zinc-800 dark:border-zinc-200">
          <TrendingUp className="absolute right-[-10%] top-[-10%] w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-500 mb-2">GPA</p>
          <h4 className="text-5xl font-black">{stats?.gpa?.toFixed(2) || '0.00'}</h4>
          <p className="text-[9px] text-zinc-300 dark:text-zinc-500 mt-4 font-bold flex items-center gap-1">
            <CheckCircle2 size={10} /> 基于 {stats?.totalExams || 0} 次考试计算
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <BookMarked className="absolute right-[-10%] top-[-10%] w-32 h-32 opacity-5" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">已修学分</p>
          <h4 className="text-5xl font-black text-zinc-900 dark:text-zinc-100">{stats?.totalCredits || 0}</h4>
          <p className="text-[9px] text-zinc-400 mt-4 font-bold">总课程学分累积</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <Award className="absolute right-[-10%] top-[-10%] w-32 h-32 opacity-5" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">专业排名</p>
          <h4 className="text-5xl font-black text-zinc-900 dark:text-zinc-100">{stats?.rank || '-'}</h4>
          <p className="text-[9px] text-zinc-400 mt-4 font-bold">全院学术排名统计</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ClipboardList className="text-zinc-900 dark:text-zinc-100" size={18} /> 最近考核详情
          </h3>
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{scores.length} 个项目</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">考核科目</th>
                <th className="px-8 py-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">得分</th>
                <th className="px-8 py-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">反馈</th>
                <th className="px-8 py-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">考核时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {scores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-zinc-400 text-xs font-bold bg-white dark:bg-zinc-900">
                    暂无考核记录
                  </td>
                </tr>
              ) : scores.map((score: any) => (
                <tr key={score.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{score.exam?.title}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{score.scoreValue}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic line-clamp-1">{score.feedback || '无'}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-[10px] font-bold text-zinc-400">{formatGradedAt(score.gradedAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AssignmentsPage: React.FC = () => {
  const { profileId } = useData();
  const showToast = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, submissionsData] = await Promise.all([
        assignmentsApi.getForStudent(profileId),
        assignmentsApi.getStudentSubmissions(profileId)
      ]);
      setAssignments(assignmentsData);
      setSubmissions(submissionsData);
    } catch (err) {
      setError('作业数据加载失败，请稍后重试');
      showToast('作业数据加载失败，请稍后重试', 'error');
      console.error("Failed to fetch assignments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const handleSubmit = async (assignmentId: string) => {
    const content = (drafts[assignmentId] || '').trim();
    if (!profileId || !content) {
      showToast('请编写提交内容', 'error');
      return;
    }
    setSavingId(assignmentId);
    try {
      await assignmentsApi.submit({
        assignmentId,
        studentId: profileId,
        content
      });
      showToast('作业提交成功', 'success');
      setEditingId(null);
      setDrafts((prev) => ({ ...prev, [assignmentId]: '' }));
      await fetchData();
    } catch (err) {
      showToast('提交失败', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {error && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-900/40 border border-rose-200/70 dark:border-rose-900/40 text-xs font-black"
          >
            重试
          </button>
        </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-2 py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
            <ClipboardList size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">暂无待处理作业</p>
          </div>
        ) : assignments.map((item) => {
          const submission = submissions.find(s => s.assignmentId === item.id);
          const isOverdue = new Date(item.dueDate) < new Date();

          return (
            <div key={item.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${submission ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}>
                  {submission ? <CheckCircle2 size={24} /> : <ClipboardList size={24} />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">{item.title}</h4>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase">{item.courseName} • {item.teacherName}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-400" />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isOverdue && !submission ? 'text-rose-500' : 'text-zinc-500'}`}>
                    截止: {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {submission && (
                  <span className="text-[10px] font-black uppercase px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">
                    {submission.status === 'GRADED' ? `分数: ${submission.grade}` : '已提交'}
                  </span>
                )}
              </div>

              {editingId === item.id ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <textarea
                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    placeholder="输入作业内容或提交说明..."
                    rows={4}
                    value={drafts[item.id] || ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSubmit(item.id)}
                      disabled={savingId === item.id}
                      className="flex-1 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black shadow-sm hover:bg-black dark:hover:bg-zinc-200 transition-all"
                    >
                      {savingId === item.id ? '提交中...' : '确认提交'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={savingId === item.id}
                      className="px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled={submission && submission.status === 'GRADED'}
                  onClick={() => {
                    setEditingId(item.id);
                    setDrafts((prev) => ({ ...prev, [item.id]: submission?.content || '' }));
                  }}
                  className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all ${submission
                    ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-none'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-zinc-200'
                    }`}
                >
                  {submission ? '修改提交' : '立即提交'}
                </button>
              )}

              {submission?.teacherFeedback && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-xl">
                  <p className="text-[10px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1">
                    <AlertCircle size={10} /> 教师评语
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 italic leading-relaxed">
                    “{submission.teacherFeedback}”
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
