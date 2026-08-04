import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    UserX,
    Clock,
    CheckCircle2,
    Eye,
    Pencil,
    Trash2,
    Plus,
    Save
} from 'lucide-react';
import { Student, Attendance } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { studentsApi, attendanceApi, riskApi } from '../services/api';
import { useData } from '../contexts/DataContext';

interface AttendancePageProps {
    userRole: 'admin' | 'teacher' | 'student';
}

// ── helpers ────────────────────────────────────────────────────────────────────
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const STATUS_CONFIG = {
    PRESENT: { label: '出勤', icon: CheckCircle2, active: 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800' },
    LATE: { label: '迟到', icon: Clock, active: 'bg-amber-50  border-amber-200  text-amber-600  dark:bg-amber-900/20  dark:border-amber-800' },
    ABSENT: { label: '缺勤', icon: UserX, active: 'bg-rose-50   border-rose-200   text-rose-600   dark:bg-rose-900/20   dark:border-rose-800' },
    LEAVE: { label: '请假', icon: UserCheck, active: 'bg-blue-50   border-blue-200   text-blue-600   dark:bg-blue-900/20   dark:border-blue-800' },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;
type AttendanceRange = 'month' | 'last3' | 'all';

const computeAttendanceRateFromLogs = (logs: Attendance[]): number | null => {
    if (!Array.isArray(logs) || logs.length === 0) return null;
    const effectiveAttendance = logs.filter(
        (log) => log.status === 'PRESENT' || log.status === 'LATE' || log.status === 'LEAVE'
    ).length;
    return Number(((effectiveAttendance / logs.length) * 100).toFixed(1));
};

const extractLeaveReason = (notes?: string): string => {
    if (!notes) return '';
    const normalized = notes.replace(/\s+/g, ' ').trim();

    // New normalized format: 请假已批准｜类型：xx｜事由：xxx
    const cnMatch = normalized.match(/事由[:：]\s*(.+)$/);
    if (cnMatch?.[1]) return cnMatch[1].trim();

    // Legacy format: Approved Leave: TYPE. Reason: xxx
    const enMatch = normalized.match(/Reason:\s*(.+)$/i);
    if (enMatch?.[1]) return enMatch[1].trim();

    return normalized;
};

const formatAttendanceNotes = (status?: StatusKey, notes?: string, compact = false): string => {
    if (!notes) return '—';
    if (status !== 'LEAVE') return notes;

    const reason = extractLeaveReason(notes);
    if (!reason) return '请假已批准';
    if (compact) {
        const shortReason = reason.length > 24 ? `${reason.slice(0, 24)}...` : reason;
        return `已批准请假｜${shortReason}`;
    }
    return `请假已批准｜事由：${reason}`;
};

// ── Month calendar sub-component ───────────────────────────────────────────────
interface MonthlyRecord { date: string; status: StatusKey; studentId: string; }

const MonthCalendar: React.FC<{
    year: number; month: number;
    records: MonthlyRecord[];
    students: Student[];
    activeStudentIds: Set<string>;
}> = ({ year, month, records, students, activeStudentIds }) => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // 0=Sun…6=Sat, shift to Mon-first
    const startOffset = (firstDay.getDay() + 6) % 7;

    // Group records by date
    const byDate: Record<string, MonthlyRecord[]> = {};
    records.forEach(r => {
        byDate[r.date] = byDate[r.date] || [];
        byDate[r.date].push(r);
    });

    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    const cells: (number | null)[] = [
        ...Array(startOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const getRate = (day: number) => {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecords = byDate[key] || [];
        const relevantRecords = dayRecords.filter(r => activeStudentIds.has(r.studentId));
        if (relevantRecords.length === 0 || students.length === 0) return null;
        const present = relevantRecords.filter(
            r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'LEAVE'
        ).length;
        return Math.round((present / students.length) * 100);
    };

    return (
        <div className="p-6">
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map(d => (
                    <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 py-2">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;
                    const rate = getRate(day);
                    const isToday = new Date().getFullYear() === year &&
                        new Date().getMonth() + 1 === month &&
                        new Date().getDate() === day;
                    let bg = 'bg-zinc-50 dark:bg-zinc-800/30';
                    if (rate !== null) {
                        bg = rate >= 90 ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                            rate >= 70 ? 'bg-amber-50 dark:bg-amber-900/20' :
                                'bg-rose-50 dark:bg-rose-900/20';
                    }
                    return (
                        <div key={day}
                            className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-colors ${bg} ${isToday ? 'border-zinc-900 dark:border-zinc-100' : 'border-transparent'}`}>
                            <span className={`text-xs font-bold ${isToday ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{day}</span>
                            {rate !== null && (
                                <span className="text-[9px] font-black text-zinc-500">{rate}%</span>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 justify-end">
                {[['bg-emerald-100 dark:bg-emerald-900/40', '≥90%'], ['bg-amber-100 dark:bg-amber-900/40', '70-89%'], ['bg-rose-100 dark:bg-rose-900/40', '<70%']].map(([cls, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-md ${cls}`} />
                        <span className="text-[10px] text-zinc-400 font-bold">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────
const AttendancePage: React.FC<AttendancePageProps> = ({ userRole }) => {
    const { students: allStudents, classes, courses, profileId } = useData();

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance>>({});
    const [monthRecords, setMonthRecords] = useState<any[]>([]);
    const [monthlyCountMap, setMonthlyCountMap] = useState<Record<string, number>>({});
    const [totalCountMap, setTotalCountMap] = useState<Record<string, number>>({});
    const [monthlyDetailMap, setMonthlyDetailMap] = useState<Record<string, Attendance[]>>({});
    const [allDetailMap, setAllDetailMap] = useState<Record<string, Attendance[]>>({});
    const [detailRange, setDetailRange] = useState<AttendanceRange>('month');
    const [detailModalStudent, setDetailModalStudent] = useState<Student | null>(null);
    const [recordFormOpen, setRecordFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<Attendance | null>(null);
    const [recordForm, setRecordForm] = useState<{ date: string; status: StatusKey; notes: string }>({
        date: formatDate(new Date()),
        status: 'PRESENT',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [riskAttendanceMap, setRiskAttendanceMap] = useState<Record<string, number>>({});
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [studentKeyword, setStudentKeyword] = useState('');
    const [onlyUnmarked, setOnlyUnmarked] = useState(false);

    const teacherCourseIds = useMemo(() => new Set(courses.map(c => c.id)), [courses]);

    // ── Scope students by role + filters ─────────────────────────────────────
    const students = useMemo(() => {
        let scoped: Student[] = [];
        if (userRole === 'student') {
            const me = allStudents.find(s => s.id === profileId);
            scoped = me ? [me] : [];
        } else if (userRole === 'teacher') {
            scoped = allStudents.filter(s =>
                (s.enrolledCourses || []).some(courseId => teacherCourseIds.has(courseId))
            );
        } else {
            scoped = allStudents;
        }

        if (selectedClassId) {
            scoped = scoped.filter(s => s.class === selectedClassId);
        }

        if (selectedCourseId) {
            scoped = scoped.filter(s => (s.enrolledCourses || []).includes(selectedCourseId));
        }

        return scoped;
    }, [userRole, allStudents, profileId, teacherCourseIds, selectedClassId, selectedCourseId]);

    const displayedStudents = useMemo(() => {
        const kw = studentKeyword.trim().toLowerCase();
        return students.filter(s => {
            const matchKeyword = !kw || s.name.toLowerCase().includes(kw) || s.studentNumber.toLowerCase().includes(kw);
            const matchUnmarked = !onlyUnmarked || !attendanceMap[s.id];
            return matchKeyword && matchUnmarked;
        });
    }, [students, studentKeyword, onlyUnmarked, attendanceMap]);

    // ── Load daily attendance ──────────────────────────────────────────────────
    const fetchDaily = useCallback(async () => {
        setLoading(true);
        try {
            const data = await attendanceApi.getDailyAttendance(formatDate(selectedDate));
            const map: Record<string, Attendance> = {};
            if (Array.isArray(data)) {
                data.forEach((a: any) => { map[a.studentId] = a; });
            }
            setAttendanceMap(map);
        } catch {
            setAttendanceMap({});
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    // ── Load monthly attendance ────────────────────────────────────────────────
    const fetchMonthly = useCallback(async () => {
        setLoading(true);
        try {
            const data = await attendanceApi.getMonthlyAttendance(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1
            );
            setMonthRecords(Array.isArray(data) ? data : []);
        } catch {
            setMonthRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    // ── Load monthly counts for daily table column ────────────────────────────
    const fetchMonthlyCounts = useCallback(async () => {
        try {
            const data = await attendanceApi.getMonthlyAttendance(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1
            );
            const next: Record<string, number> = {};
            const details: Record<string, Attendance[]> = {};
            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    const sid = item?.studentId;
                    if (!sid) return;
                    next[sid] = (next[sid] || 0) + 1;
                    details[sid] = details[sid] || [];
                    details[sid].push(item as Attendance);
                });
                Object.keys(details).forEach((sid) => {
                    details[sid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
            }
            setMonthlyCountMap(next);
            setMonthlyDetailMap(details);
        } catch {
            setMonthlyCountMap({});
            setMonthlyDetailMap({});
        }
    }, [selectedDate]);

    useEffect(() => {
        if (viewMode === 'daily') fetchDaily();
        else fetchMonthly();
    }, [viewMode, fetchDaily, fetchMonthly]);

    useEffect(() => {
        fetchMonthlyCounts();
    }, [fetchMonthlyCounts]);

    const fetchTotalCounts = useCallback(async () => {
        if (students.length === 0) {
            setTotalCountMap({});
            setAllDetailMap({});
            return;
        }
        try {
            const entries = await Promise.all(
                students.map(async (student) => {
                    try {
                        const records = await attendanceApi.getStudentAttendance(student.id);
                        const normalized = Array.isArray(records) ? (records as Attendance[]) : [];
                        normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        return [student.id, normalized] as const;
                    } catch {
                        return [student.id, [] as Attendance[]] as const;
                    }
                })
            );
            const allMap = Object.fromEntries(entries);
            setAllDetailMap(allMap);
            const totalMap = Object.fromEntries(
                entries.map(([studentId, records]) => [studentId, records.length])
            );
            setTotalCountMap(totalMap);
        } catch {
            setTotalCountMap({});
            setAllDetailMap({});
        }
    }, [students]);

    useEffect(() => {
        fetchTotalCounts();
    }, [fetchTotalCounts]);

    useEffect(() => {
        if (userRole === 'student') {
            setRiskAttendanceMap({});
            return;
        }
        let cancelled = false;
        const loadRiskAttendance = async () => {
            try {
                const data = await riskApi.getStudents(500);
                if (cancelled) return;
                const next: Record<string, number> = {};
                if (Array.isArray(data)) {
                    data.forEach((item: any) => {
                        if (!item?.studentId) return;
                        if (typeof item.attendance === 'number') {
                            next[item.studentId] = item.attendance;
                        }
                    });
                }
                setRiskAttendanceMap(next);
            } catch {
                if (!cancelled) setRiskAttendanceMap({});
            }
        };
        loadRiskAttendance();
        return () => { cancelled = true; };
    }, [userRole]);

    // ── Update status ──────────────────────────────────────────────────────────
    const handleStatusChange = async (studentId: string, status: StatusKey) => {
        const previous = attendanceMap[studentId];
        const isDeselecting = previous?.status === status;

        if (isDeselecting) {
            // Optimistic delete
            setAttendanceMap(prev => {
                const newMap = { ...prev };
                delete newMap[studentId];
                return newMap;
            });
            try {
                if (previous?.id) {
                    await attendanceApi.deleteAttendance(previous.id);
                }
                fetchMonthlyCounts();
                fetchTotalCounts();
            } catch {
                // Revert delete
                if (previous) setAttendanceMap(prev => ({ ...prev, [studentId]: previous }));
            }
        } else {
            // Optimistic update
            setAttendanceMap(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], studentId, date: formatDate(selectedDate), status } as any
            }));
            try {
                const res = await attendanceApi.checkIn({
                    studentId, status, notes: '',
                    date: formatDate(selectedDate),
                });
                // Update map with real ID from backend
                setAttendanceMap(prev => ({ ...prev, [studentId]: res }));
                fetchMonthlyCounts();
                fetchTotalCounts();
            } catch {
                // Revert update
                if (previous) {
                    setAttendanceMap(prev => ({ ...prev, [studentId]: previous }));
                } else {
                    setAttendanceMap(prev => { const n = { ...prev }; delete n[studentId]; return n; });
                }
            }
        }
    };

    const handleDateChange = (delta: number) => {
        const d = new Date(selectedDate);
        if (viewMode === 'daily') d.setDate(d.getDate() + delta);
        else d.setMonth(d.getMonth() + delta);
        setSelectedDate(d);
    };

    const activeStudentIds = useMemo(() => new Set(students.map(s => s.id)), [students]);
    const scopedAttendance = useMemo(
        () => Object.values(attendanceMap).filter(a => activeStudentIds.has(a.studentId)),
        [attendanceMap, activeStudentIds]
    );

    const presentCount = scopedAttendance.filter(a => a.status === 'PRESENT').length;
    const lateCount = scopedAttendance.filter(a => a.status === 'LATE').length;
    const leaveCount = scopedAttendance.filter(a => a.status === 'LEAVE').length;
    const absentCount = scopedAttendance.filter(a => a.status === 'ABSENT').length;
    const attendanceRate = students.length > 0
        ? Math.round(((presentCount + lateCount + leaveCount) / students.length) * 100)
        : 0;
    const studentsWithHistory = students.filter(s => (totalCountMap[s.id] || 0) > 0);
    const cumulativeAttendanceAvgLabel = (() => {
        if (studentsWithHistory.length === 0) return '--';
        const values = studentsWithHistory
            .map((student) => {
                const computed = computeAttendanceRateFromLogs(allDetailMap[student.id] || []);
                if (computed !== null) return computed;
                if (typeof riskAttendanceMap[student.id] === 'number') return riskAttendanceMap[student.id];
                return Number(student.attendance ?? 0);
            })
            .filter((v) => Number.isFinite(v));
        if (values.length === 0) return '--';
        return `${Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)}%`;
    })();
    const modalLogs = useMemo(() => {
        if (!detailModalStudent) return [] as Attendance[];
        if (detailRange === 'month') {
            return monthlyDetailMap[detailModalStudent.id] || [];
        }
        const full = allDetailMap[detailModalStudent.id] || [];
        if (detailRange === 'all') return full;
        const rangeStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 2, 1);
        const rangeEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
        return full.filter((log) => {
            const d = new Date(log.date);
            return d >= rangeStart && d <= rangeEnd;
        });
    }, [detailModalStudent, detailRange, monthlyDetailMap, allDetailMap, selectedDate]);

    const monthLabel = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const detailRangeLabel = detailRange === 'month'
        ? `${monthLabel}`
        : detailRange === 'last3'
            ? '近3个月'
            : '全部历史';

    const detailEmptyText = detailRange === 'month'
        ? '该月暂无考勤记录'
        : detailRange === 'last3'
            ? '近3个月暂无考勤记录'
            : '暂无历史考勤记录';

    const openCreateRecord = () => {
        if (!detailModalStudent) return;
        setEditingLog(null);
        setRecordForm({
            date: formatDate(selectedDate),
            status: 'PRESENT',
            notes: ''
        });
        setRecordFormOpen(true);
    };

    const openEditRecord = (log: Attendance) => {
        setEditingLog(log);
        setRecordForm({
            date: log.date,
            status: log.status as StatusKey,
            notes: log.notes || ''
        });
        setRecordFormOpen(true);
    };

    const refreshAfterRecordChange = async () => {
        if (viewMode === 'daily') await fetchDaily();
        else await fetchMonthly();
        await fetchMonthlyCounts();
        await fetchTotalCounts();
    };

    const openDetailModal = (student: Student, range: AttendanceRange = 'month') => {
        setDetailModalStudent(student);
        setDetailRange(range);
        setRecordFormOpen(false);
        setEditingLog(null);
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!detailModalStudent) return;
        try {
            if (editingLog?.id) {
                await attendanceApi.deleteAttendance(editingLog.id);
            }
            await attendanceApi.createRecord({
                studentId: detailModalStudent.id,
                status: recordForm.status,
                notes: recordForm.notes || '',
                date: recordForm.date
            });
            setRecordFormOpen(false);
            setEditingLog(null);
            await refreshAfterRecordChange();
        } catch (err) {
            console.error('保存考勤记录失败', err);
        }
    };

    const handleDeleteRecord = async (log: Attendance) => {
        if (!confirm('确定删除该条考勤记录吗？')) return;
        try {
            await attendanceApi.deleteAttendance(log.id);
            await refreshAfterRecordChange();
        } catch (err) {
            console.error('删除考勤记录失败', err);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
            {/* Toolbar */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative">
                {/* Date display */}
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-1">
                    <CalendarIcon size={16} className="text-zinc-400" />
                    {viewMode === 'daily'
                        ? selectedDate.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
                    }
                </p>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    {/* Class / course filters */}
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-widest outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        >
                            <option value="">全部班级</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-widest outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        >
                            <option value="">全部课程</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>

                    <input
                        value={studentKeyword}
                        onChange={(e) => setStudentKeyword(e.target.value)}
                        placeholder="搜索学生姓名/学号"
                        className="h-9 px-3 w-44 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-zinc-700 dark:text-zinc-200 tracking-widest outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                    />
                    <button
                        onClick={() => setOnlyUnmarked(v => !v)}
                        className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${onlyUnmarked
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                            }`}
                    >
                        仅看未打卡
                    </button>

                    {/* Prev / next navigator */}
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl h-9">
                        <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-l-xl transition-colors text-zinc-500">
                            <ChevronLeft size={14} />
                        </button>
                        <div className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 w-28 text-center border-x border-zinc-200 dark:border-zinc-700 h-full flex items-center justify-center">
                            {viewMode === 'daily' ? formatDate(selectedDate) : `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-r-xl transition-colors text-zinc-500">
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
                        {(['daily', 'monthly'] as const).map(m => (
                            <button key={m} onClick={() => setViewMode(m)}
                                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                                {m === 'daily' ? '日视图' : '月视图'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
                    </div>
                ) : viewMode === 'daily' ? (
                    /* ── Daily view ─────────────────────────────────────── */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-16">#</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">学生</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">本月考勤次数</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">考勤状态</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">备注</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {displayedStudents.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-16 text-zinc-400 text-sm">暂无学生数据</td></tr>
                                ) : displayedStudents.map((student, index) => {
                                    const att = attendanceMap[student.id];
                                    const status = att?.status as StatusKey | undefined;
                                    return (
                                        <tr key={student.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 transition-colors">
                                            <td className="px-6 py-3 text-xs font-bold text-zinc-400">{index + 1}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold overflow-hidden shrink-0">
                                                        <img
                                                            src={resolveAvatar(student.avatar, student.id || student.studentNumber || student.name)}
                                                            className="w-full h-full object-cover"
                                                            alt=""
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name);
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{student.name}</p>
                                                        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{student.studentNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <button
                                                        onClick={() => openDetailModal(student, 'month')}
                                                        className="inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                                        title="查看本月考勤明细"
                                                    >
                                                        {monthlyCountMap[student.id] || 0}
                                                    </button>
                                                        <button
                                                            onClick={() => openDetailModal(student, 'all')}
                                                            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                            title="查看全部历史考勤"
                                                        >
                                                        历史 {totalCountMap[student.id] || 0}
                                                        </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(Object.keys(STATUS_CONFIG) as StatusKey[]).map(s => {
                                                        const Icon = STATUS_CONFIG[s].icon;
                                                        return (
                                                            <button key={s}
                                                                onClick={() => handleStatusChange(student.id, s)}
                                                                disabled={userRole === 'student'}
                                                                title={STATUS_CONFIG[s].label}
                                                                className={`p-1.5 rounded-lg border transition-all ${status === s ? STATUS_CONFIG[s].active : 'border-transparent text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600'} ${userRole === 'student' ? 'cursor-not-allowed opacity-60' : ''}`}>
                                                                <Icon size={15} />
                                                            </button>
                                                        );
                                                    })}
                                                    {status && (
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ml-1 ${status === 'PRESENT' ? 'text-emerald-500' :
                                                            status === 'LATE' ? 'text-amber-500' :
                                                                status === 'ABSENT' ? 'text-rose-500' : 'text-blue-500'
                                                            }`}>{STATUS_CONFIG[status].label}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 italic">
                                                {formatAttendanceNotes(status, att?.notes, true)}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {(() => {
                                                    const historyCount = totalCountMap[student.id] || 0;
                                                    if (historyCount === 0) {
                                                        return (
                                                            <span className="mr-2 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                                                                累计 --
                                                            </span>
                                                        );
                                                    }
                                                    const computed = computeAttendanceRateFromLogs(allDetailMap[student.id] || []);
                                                    const cumulative = computed ?? riskAttendanceMap[student.id] ?? Number(student.attendance ?? 0);
                                                    return (
                                                        <span className={`mr-2 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                            cumulative < 80
                                                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
                                                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'
                                                        }`}>
                                                            累计 {cumulative.toFixed(1)}%
                                                        </span>
                                                    );
                                                })()}
                                                <button
                                                    onClick={() => openDetailModal(student, 'all')}
                                                    className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                                    title="查看考勤明细"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ── Monthly calendar view ──────────────────────────── */
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <MonthCalendar
                            year={selectedDate.getFullYear()}
                            month={selectedDate.getMonth() + 1}
                            records={monthRecords}
                            students={students}
                            activeStudentIds={activeStudentIds}
                        />
                    </div>
                )}

                {/* Status Footer */}
                <div className="flex-none px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>共 {students.length} 位学生</span>
                        {displayedStudents.length !== students.length && (
                            <span>（当前显示 {displayedStudents.length} 位）</span>
                        )}
                        {viewMode === 'daily' && (
                            <>
                                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
                                <span className="text-emerald-500">出勤 {presentCount}</span>
                                <span className="text-amber-500">迟到 {lateCount}</span>
                                <span className="text-blue-500">请假 {leaveCount}</span>
                                <span className="text-rose-500">缺勤 {absentCount}</span>
                                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
                                <span>今日出勤率 {attendanceRate}%</span>
                                <span>累计出勤率(风控) {cumulativeAttendanceAvgLabel}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {detailModalStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                    {detailModalStudent.name} · {detailRangeLabel} 考勤记录
                                </h3>
                                <p className="text-[10px] font-bold text-zinc-400 mt-1">
                                    共 {modalLogs.length} 条记录
                                </p>
                            </div>
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                {([
                                    { key: 'month', label: '本月' },
                                    { key: 'last3', label: '近3个月' },
                                    { key: 'all', label: '全部' }
                                ] as { key: AttendanceRange; label: string }[]).map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => setDetailRange(item.key)}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${detailRange === item.key
                                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                            : 'text-zinc-500 dark:text-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-100'
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openCreateRecord}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black"
                                >
                                    <span className="inline-flex items-center gap-1"><Plus size={12} /> 新增记录</span>
                                </button>
                                <button
                                    onClick={() => { setDetailModalStudent(null); setRecordFormOpen(false); setEditingLog(null); }}
                                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    关闭
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4 space-y-2">
                            {recordFormOpen && (
                                <form onSubmit={handleSaveRecord} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input
                                        type="date"
                                        required
                                        value={recordForm.date}
                                        onChange={e => setRecordForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                                    />
                                    <select
                                        value={recordForm.status}
                                        onChange={e => setRecordForm(prev => ({ ...prev, status: e.target.value as StatusKey }))}
                                        className="px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                                    >
                                        {(Object.keys(STATUS_CONFIG) as StatusKey[]).map(s => (
                                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="备注（可选）"
                                        value={recordForm.notes}
                                        onChange={e => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                                        className="px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs md:col-span-2"
                                    />
                                    <div className="md:col-span-4 flex justify-end gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setRecordFormOpen(false); setEditingLog(null); }}
                                            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <span className="inline-flex items-center gap-1"><Save size={12} /> {editingLog ? '保存修改' : '新增记录'}</span>
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalLogs.length === 0 ? (
                                <div className="py-10 text-center text-xs font-bold text-zinc-400">{detailEmptyText}</div>
                            ) : modalLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between gap-3"
                                >
                                    <div>
                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{log.date}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {formatAttendanceNotes(log.status as StatusKey, log.notes)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                            log.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                            log.status === 'LATE' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                                            log.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' :
                                            'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                            {STATUS_CONFIG[log.status as StatusKey]?.label || log.status}
                                        </span>
                                        <button
                                            onClick={() => openEditRecord(log)}
                                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            title="修改"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRecord(log)}
                                            className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            title="删除"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
