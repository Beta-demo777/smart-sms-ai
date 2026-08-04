import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Plus,
    Filter,
    Download,
    CheckSquare,
    Square,
    Trash2,
    Pencil,
    BookOpen,
    CalendarDays,
    Award,
    ClipboardCheck,
    ChevronLeft,
    ChevronRight,
    X,
    Save
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Exam, Course } from '../types';
import { examsApi, coursesApi } from '../services/api';
import { useData } from '../contexts/DataContext';

interface ExamListProps {
    onSendMessage: (message: string) => void;
    userRole: string;
    onEnterGrades?: (examId: string) => void;
}

const ExamList: React.FC<ExamListProps> = ({ onSendMessage, userRole, onEnterGrades }) => {
    const { courses: scopedCourses } = useData();
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<Exam>>({
        title: '',
        date: '',
        maxScore: 100,
        description: ''
    });
    const [selectedCourseId, setSelectedCourseId] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [examsData, coursesData] = await Promise.all([
                examsApi.getAll(),
                coursesApi.getAll(0, 100) // Fetch all courses for dropdown
            ]);
            if (userRole === 'teacher') {
                const allowedCourseIds = new Set(scopedCourses.map(c => c.id));
                setExams((examsData || []).filter((exam: any) => allowedCourseIds.has(exam.course?.id)));
                setCourses(scopedCourses);
            } else {
                setExams(examsData);
                setCourses(coursesData.content || []); // Handle pagination response
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userRole, scopedCourses]);

    const getTeacherName = (exam: Exam) => {
        const matchedCourse = courses.find(c => c.id === exam.course?.id);
        if (matchedCourse?.teacher) return matchedCourse.teacher;
        const rawTeacher = (exam.course as any)?.teacher;
        if (typeof rawTeacher === 'string') return rawTeacher;
        if (rawTeacher?.name) return rawTeacher.name;
        return '待分配';
    };

    const filteredExams = useMemo(() => {
        return exams.filter(exam =>
            exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.course.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [exams, searchQuery]);

    const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
    const paginatedExams = filteredExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedExams.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(paginatedExams.map(e => e.id)));
    };

    // CRUD Handlers
    const handleOpenCreate = () => {
        setModalMode('create');
        setFormData({ title: '', date: new Date().toISOString().split('T')[0], maxScore: 100, description: '' });
        setSelectedCourseId('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (exam: Exam) => {
        setModalMode('edit');
        setFormData({
            id: exam.id,
            title: exam.title,
            date: exam.date,
            maxScore: exam.maxScore,
            description: exam.description
        });
        setSelectedCourseId(exam.course.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                if (!selectedCourseId) {
                    alert('请选择所属课程');
                    return;
                }
                await examsApi.create(formData, selectedCourseId);
            } else {
                // For update, the backend might need a complete object or specific fields
                // Assuming update endpoint handles partial updates or we send what's needed
                await examsApi.update(formData.id!, {
                    ...formData,
                    course: { id: selectedCourseId } // Assuming structure
                });
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            alert('保存失败: ' + (error.message || '未知错误'));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定要删除这场考试吗？相关的成绩记录也会被删除。')) {
            try {
                await examsApi.delete(id);
                setExams(prev => prev.filter(e => e.id !== id));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } catch (error) {
                console.error("Failed to delete exam", error);
            }
        }
    };

    const handleBatchDelete = async () => {
        if (confirm(`确定要删除选中的 ${selectedIds.size} 场考试吗？`)) {
            // Sequential delete for simplicity, in real app use batch API
            for (const id of selectedIds) {
                try {
                    await examsApi.delete(id);
                } catch (e) {
                    console.error(`Failed to delete ${id}`, e);
                }
            }
            await fetchData();
            setSelectedIds(new Set());
        }
    };


    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
            {/* Toolbar */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative">
                <div className="relative flex-1 w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索考试名称或课程..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                </div>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block"></div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <button className="flex-1 lg:flex-none px-3 h-9 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
                        <Filter size={14} /> 筛选
                    </button>
                    {selectedIds.size > 0 && (
                        <button onClick={handleBatchDelete} className="flex-1 lg:flex-none px-3 h-9 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all">
                            <Trash2 size={14} /> 删除 ({selectedIds.size})
                        </button>
                    )}
                    <button className="flex items-center gap-2 px-4 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all h-9">
                        <Download size={14} />
                        导出
                    </button>
                    <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95 h-9">
                        <Plus size={14} />
                        新建考试
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-zinc-100 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 text-left w-12 whitespace-nowrap">
                                    <button onClick={toggleSelectAll} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
                                        {selectedIds.size === paginatedExams.length && paginatedExams.length > 0 ? (
                                            <CheckSquare size={16} className="text-zinc-900 dark:text-zinc-100" />
                                        ) : (
                                            <Square size={16} className="text-zinc-300 dark:text-zinc-600" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">考试名称</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-40 whitespace-nowrap">所属课程</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-28 whitespace-nowrap">授课教师</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-32 whitespace-nowrap">考试日期</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-24 whitespace-nowrap">满分</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-24 whitespace-nowrap">状态</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest w-40 whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {paginatedExams.length > 0 ? paginatedExams.map((exam) => (
                                <tr key={exam.id} className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 group transition-all ${selectedIds.has(exam.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}>
                                    <td className="px-6 py-3 w-12 whitespace-nowrap">
                                        <button onClick={() => toggleSelect(exam.id)} className="p-1">
                                            {selectedIds.has(exam.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 font-bold">
                                                <Award size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{exam.title}</p>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">ID: {exam.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 w-40 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                            <BookOpen size={14} />
                                            <span className="text-xs font-bold truncate">{exam.course?.name || '未知课程'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 w-28 whitespace-nowrap">
                                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 truncate">{getTeacherName(exam)}</span>
                                    </td>
                                    <td className="px-6 py-3 w-32 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                            <CalendarDays size={14} />
                                            <span className="text-xs font-bold">{exam.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 w-24 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{exam.maxScore}分</span>
                                    </td>
                                    <td className="px-6 py-3 w-24 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-tight">已发布</span>
                                    </td>
                                    <td className="px-6 py-3 w-40 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => onEnterGrades?.(exam.id)}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 text-white rounded text-[10px] font-bold hover:bg-zinc-700 transition-colors mr-2"
                                            >
                                                <ClipboardCheck size={12} />
                                                录入成绩
                                            </button>
                                            <button onClick={() => handleOpenEdit(exam)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Pencil size={14} /></button>
                                            <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                                <Award size={32} className="text-zinc-300 dark:text-zinc-600" />
                                            </div>
                                            <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">暂无考试安排</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex-none px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-20">
                    <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>共 {filteredExams.length} 场考试</span>
                        <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                        <div className="flex items-center gap-1.5">
                            <span>每页 10</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-colors"><ChevronLeft size={14} /></button>
                        <span className="text-[9px] font-black mx-1 text-zinc-600 dark:text-zinc-300">{currentPage} / {totalPages || 1}</span>
                        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-colors"><ChevronRight size={14} /></button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-900">
                                    {modalMode === 'create' ? <Plus size={20} /> : <Pencil size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '新建考试' : '编辑考试'}</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Exam Management</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">考试名称 <span className="text-rose-500">*</span></label>
                                <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 2024春季期末考试" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">所属课程 <span className="text-rose-500">*</span></label>
                                    <select
                                        required
                                        value={selectedCourseId}
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm appearance-none"
                                        disabled={courses.length === 0}
                                    >
                                        <option value="">选择课程...</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>{course.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">满分值 <span className="text-rose-500">*</span></label>
                                    <input type="number" required min="1" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.maxScore} onChange={e => setFormData({ ...formData, maxScore: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">考试日期 <span className="text-rose-500">*</span></label>
                                <input type="date" required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">描述</label>
                                <textarea className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-medium text-sm h-24 resize-none" placeholder="关于该考试的说明..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    取消
                                </button>
                                <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 dark:shadow-none active:scale-95">
                                    <Save size={16} />
                                    {modalMode === 'create' ? '立即创建' : '保存修改'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ExamList;
