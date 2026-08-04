import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Pencil,
    MapPin,
    BookOpen,
    Search,
    AlertCircle
} from 'lucide-react';
import { Course, Classroom, ScheduleItem } from '../types';
import { coursesApi, classroomsApi, schedulesApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ScheduleManager: React.FC = () => {
    const getDefaultSemester = () => {
        const now = new Date();
        const year = now.getFullYear();
        const term = now.getMonth() + 1 <= 6 ? 'SPRING' : 'FALL';
        return `${year}-${term}`;
    };

    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const showToast = useToast();

    const [formData, setFormData] = useState({
        courseId: '',
        classroomId: '',
        dayOfWeek: 'MONDAY',
        startTime: '',
        endTime: '',
        semester: getDefaultSemester()
    });

    useEffect(() => {
        fetchData();
    }, []);

    const filteredSchedules = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return schedules;

        return schedules.filter(item => {
            const courseName = item.course?.name?.toLowerCase() || '';
            const classroomName = item.classroom?.name?.toLowerCase() || '';
            const semester = item.semester?.toLowerCase() || '';
            const day = String(item.dayOfWeek || '').toLowerCase();
            return courseName.includes(q) || classroomName.includes(q) || semester.includes(q) || day.includes(q);
        });
    }, [schedules, keyword]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedulesData, coursesData, classroomsData] = await Promise.all([
                schedulesApi.getAll(),
                coursesApi.getAll(),
                classroomsApi.getAll()
            ]);
            setSchedules(schedulesData);
            setCourses(coursesData.content || coursesData);
            setClassrooms(classroomsData.content || classroomsData);
        } catch (error: any) {
            console.error("Failed to fetch data", error);
            showToast(error?.message || '排课数据加载失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.startTime || !formData.endTime) {
            showToast('请先完整选择开始/结束时间', 'error');
            return;
        }
        // HH:mm string compare works for same-day time ordering
        if (formData.startTime >= formData.endTime) {
            showToast(`结束时间需晚于开始时间（当前 ${formData.startTime} - ${formData.endTime}）`, 'error');
            return;
        }
        setSubmitting(true);
        try {
            if (editingScheduleId) {
                await schedulesApi.update(editingScheduleId, formData);
            } else {
                await schedulesApi.create(formData);
            }
            await fetchData();
            setEditingScheduleId(null);
            // Reset editable fields
            setFormData(prev => ({ ...prev, courseId: '', classroomId: '', startTime: '', endTime: '' }));
            showToast(editingScheduleId ? '排课修改成功' : '排课添加成功', 'success');
        } catch (error: any) {
            showToast(error?.message || (editingScheduleId ? '排课修改失败' : '排课添加失败'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTimeForInput = (value: string) => {
        if (!value) return '';
        // backend may return HH:mm:ss; input[type=time] prefers HH:mm
        return value.length >= 5 ? value.slice(0, 5) : value;
    };

    const handleStartEdit = (item: ScheduleItem) => {
        setEditingScheduleId(item.id);
        setFormData({
            courseId: item.course?.id || '',
            classroomId: item.classroom?.id || '',
            dayOfWeek: item.dayOfWeek || 'MONDAY',
            startTime: formatTimeForInput(item.startTime),
            endTime: formatTimeForInput(item.endTime),
            semester: item.semester || getDefaultSemester()
        });
    };

    const handleCancelEdit = () => {
        setEditingScheduleId(null);
        setFormData(prev => ({
            ...prev,
            courseId: '',
            classroomId: '',
            dayOfWeek: 'MONDAY',
            startTime: '',
            endTime: '',
            semester: getDefaultSemester()
        }));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条排课吗？')) return;
        try {
            await schedulesApi.delete(id);
            setSchedules(prev => prev.filter(s => s.id !== id));
            showToast('排课已删除', 'success');
        } catch (error: any) {
            console.error("Failed to delete", error);
            showToast(error?.message || '删除排课失败', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
            {/* Toolbar */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <BookOpen size={16} className="text-zinc-400" />
                        排课管理 <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md text-[10px]">{schedules.length}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="搜索课程、教室、星期、学期..."
                            className="pl-9 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400 w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area - Split View */}
            <div className="flex-1 flex min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
                {/* Left Panel: Schedule List (Flexible) */}
                <div className="flex-1 flex flex-col min-h-0 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">时间 / 地点 / 学期</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">课程信息</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredSchedules.map(item => (
                                    <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 transition-colors group">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                    <Calendar size={14} className="text-zinc-400" /> {item.dayOfWeek}
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium flex items-center gap-2">
                                                    <Clock size={14} className="text-zinc-300" /> {item.startTime} - {item.endTime}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-[10px] font-bold text-zinc-500">
                                                        <MapPin size={10} /> {item.classroom?.name}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-[10px] font-bold text-zinc-500">
                                                        {item.semester}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-zinc-500 shadow-inner">
                                                    <BookOpen size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 tracking-tight">{item.course?.name}</p>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">ID: {item.course.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => handleStartEdit(item)}
                                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors"
                                                    title="编辑排课"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-300 hover:text-rose-600 rounded-lg transition-colors"
                                                    title="删除排课"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredSchedules.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-16 text-center">
                                            <div className="inline-flex items-center gap-2 text-zinc-400 text-xs font-bold">
                                                <AlertCircle size={14} />
                                                暂无符合条件的排课记录
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {loading && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-16 text-center">
                                            <div className="inline-flex items-center gap-2 text-zinc-400 text-xs font-bold">
                                                <Clock size={14} className="animate-pulse" />
                                                正在加载排课数据...
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel: Add Schedule Form (Fixed Width) */}
                <div className="w-[380px] flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10 transition-all duration-300 overflow-y-auto custom-scrollbar">
                    <div className="p-6 sticky top-0 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 z-20 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none">
                            {editingScheduleId ? <Pencil size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                        </div>
                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{editingScheduleId ? '编辑排课' : '添加新排课'}</h3>
                    </div>

                    <div className="p-6 pt-2">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">课程</label>
                                <div className="relative group">
                                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                                    <select
                                        value={formData.courseId}
                                        onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 appearance-none shadow-sm cursor-pointer"
                                        required
                                    >
                                        <option value="">选择课程...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">教室</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                                    <select
                                        value={formData.classroomId}
                                        onChange={e => setFormData({ ...formData, classroomId: e.target.value })}
                                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 appearance-none shadow-sm cursor-pointer"
                                        required
                                    >
                                        <option value="">选择教室...</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.capacity}人)</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">星期</label>
                                    <select
                                        value={formData.dayOfWeek}
                                        onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                        className="w-full px-3 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 appearance-none shadow-sm cursor-pointer"
                                    >
                                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">学期</label>
                                    <input
                                        type="text"
                                        value={formData.semester}
                                        onChange={e => setFormData({ ...formData, semester: e.target.value })}
                                        className="w-full px-3 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">开始时间</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                                        <input
                                            type="time"
                                            step={60}
                                            value={formData.startTime}
                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full pl-9 pr-3 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">结束时间</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
                                        <input
                                            type="time"
                                            step={60}
                                            value={formData.endTime}
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full pl-9 pr-3 py-3 bg-white dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100 rounded-xl outline-none transition-all text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 border-dashed">
                                <div className="flex items-center gap-2">
                                    {editingScheduleId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 py-3.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-2xl font-black transition-all uppercase tracking-widest text-xs border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                        >
                                            取消编辑
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs shadow-xl shadow-zinc-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                                    >
                                        {editingScheduleId ? <Pencil size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                                        {submitting ? '提交中...' : (editingScheduleId ? '保存修改' : '确认排课')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleManager;
