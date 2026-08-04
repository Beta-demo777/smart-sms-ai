
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Teacher } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { useData } from '../contexts/DataContext';
import {
  Pencil,
  Trash2,
  Search,
  X,
  CheckCircle2,
  UserPlus,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  Square,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  ArrowUpDown,
  Download,
  Upload,
  Fingerprint,
  School
} from 'lucide-react';

const TeacherList: React.FC = () => {
  const {
    teachers,
    courses,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    batchDeleteTeachers,
    batchUpdateTeacherStatus
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('全部');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Teacher; direction: 'asc' | 'desc' }>({ key: 'teacherNumber', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isTeachingModalOpen, setIsTeachingModalOpen] = useState(false);
  const [teachingTeacher, setTeachingTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '', teacherNumber: '', id: '', title: '讲师', department: '', email: '', phone: '', status: '在职', joinDate: new Date().toISOString().split('T')[0], researchArea: ''
  });

  const normalizeStatus = (status?: string) => {
    if (!status) return '在职';
    if (status === 'active') return '在职';
    if (status === 'on_leave') return '休假';
    if (status === 'resigned') return '离职';
    return status;
  };

  const processedTeachers = useMemo(() => {
    let result = [...teachers];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.name.includes(searchTerm) ||
        t.teacherNumber.toLowerCase().includes(lower) ||
        t.id.toLowerCase().includes(lower) ||
        t.department.includes(searchTerm)
      );
    }
    if (filterStatus !== '全部') {
      result = result.filter(t => normalizeStatus(t.status) === filterStatus);
    }
    if (sortConfig) {
      result.sort((a, b) => {
        // @ts-ignore
        const aVal = a[sortConfig.key];
        // @ts-ignore
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [teachers, searchTerm, filterStatus, sortConfig]);

  const handleRequestSort = (key: keyof Teacher) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const totalPages = Math.ceil(processedTeachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeachers = processedTeachers.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTeachers.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      paginatedTeachers.forEach(t => newSelected.add(t.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchStatus = (status: Teacher['status']) => {
    batchUpdateTeacherStatus(selectedIds, status);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm(`确定要物理删除选中的 ${selectedIds.size} 名教师档案吗？`)) {
      batchDeleteTeachers(selectedIds);
      setSelectedIds(new Set());
    }
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ ...teacher });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ ...teacher });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleOpenTeaching = (teacher: Teacher) => {
    setTeachingTeacher(teacher);
    setIsTeachingModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    try {
      if (modalMode === 'create') {
        const newTeacher = {
          ...formData,
          ...formData,
          avatar: buildAvatarUrl(formData.teacherNumber || formData.name),
          joinDate: formData.joinDate || new Date().toISOString().split('T')[0]
        } as Teacher;
        await addTeacher(newTeacher);
      } else {
        if (editingTeacher) {
          await updateTeacher({ ...editingTeacher, ...formData } as Teacher);
        }
      }
      setIsModalOpen(false);
    } catch {
      // keep modal open on validation or network errors
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除该教师档案吗？此操作将同时删除关联的用户账户，无法撤销！')) {
      try {
        await deleteTeacher(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
      }
    }
  };

  const teachingCourses = useMemo(() => {
    if (!teachingTeacher) return [];
    const teacherName = teachingTeacher.name?.trim();
    return courses.filter(course =>
      (course.teacherId && course.teacherId === teachingTeacher.id) ||
      (teacherName && course.teacher === teacherName)
    );
  }, [courses, teachingTeacher]);

  const teachingStats = useMemo(() => {
    const totalCourses = teachingCourses.length;
    const totalStudents = teachingCourses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
    const totalCredits = teachingCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    return { totalCourses, totalStudents, totalCredits };
  }, [teachingCourses]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">

      {/* 工具栏 */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative min-h-[72px]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="搜索教师姓名、工号、院系..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
            {['全部', '在职', '休假', '离职'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterStatus === s
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
          <button onClick={() => { setSearchTerm(''); setFilterStatus('全部'); setSortConfig({ key: 'teacherNumber', direction: 'asc' }); setCurrentPage(1); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => { setModalMode('create'); setFormData({ name: '', teacherNumber: '', id: '', title: '讲师', department: '', status: '在职', joinDate: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="flex-1 lg:flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95">
            <UserPlus size={14} /> 新增教师
          </button>
        </div>
      </div>

      {/* 批量操作悬浮条 - New Design */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[80] 
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 
          shadow-2xl shadow-zinc-200/50 dark:shadow-black/50
          pl-6 pr-4 py-3 rounded-full flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-900 dark:bg-zinc-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm shadow-zinc-200 dark:shadow-none">
              {selectedIds.size}
            </div>
            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">已选定</span>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700"></div>

          <div className="flex gap-1">
            <button onClick={() => handleBatchStatus('在职')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-[11px] font-bold">
              <CheckCircle2 size={14} /> 设为在职
            </button>
            <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[11px] font-bold">
              <Trash2 size={14} /> 删除
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 ml-1"></div>

          <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 表格容器 */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-scroll custom-scrollbar relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                    {paginatedTeachers.every(t => selectedIds.has(t.id)) && paginatedTeachers.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('teacherNumber')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">教师信息 {sortConfig?.key === 'teacherNumber' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('title')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">职称 {sortConfig?.key === 'title' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">所属院系</th>
                <th className="px-6 py-3">联系方式</th>
                <th className="px-6 py-3 text-center">状态</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedTeachers.length > 0 ? paginatedTeachers.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`group transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 ${selectedIds.has(t.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}
                >
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(t.id)} className="p-1">
                      {selectedIds.has(t.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={resolveAvatar(t.avatar, t.id || t.teacherNumber || t.name)}
                        className="w-10 h-10 rounded-xl object-cover border border-white dark:border-zinc-700 shadow-sm"
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = buildAvatarUrl(t.id || t.teacherNumber || t.name);
                        }}
                      />
                      <div>
                        <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 transition-colors">{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1 text-zinc-900 dark:text-zinc-300 font-black"><Fingerprint size={10} /> {t.teacherNumber}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{t.title}</span>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{t.department?.trim() || '未分配院系'}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400"><Mail size={10} /> {t.email}</div>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500"><Phone size={10} /> {t.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${normalizeStatus(t.status) === '在职' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      normalizeStatus(t.status) === '休假' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                      }`}>
                      {normalizeStatus(t.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenTeaching(t)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Eye size={14} /></button>
                      <button onClick={() => handleOpenEdit(t)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <School size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配教师</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex-none px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            <span>共 {processedTeachers.length} 位教师</span>
            <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <div className="flex items-center gap-1.5">
              <span>每页:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent border-none p-0 text-[9px] font-black outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
              >
                {[10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-[9px] font-black mx-1 text-zinc-600 dark:text-zinc-300">{currentPage} / {totalPages || 1}</span>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                  {modalMode === 'create' ? <UserPlus size={20} /> : <Pencil size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '录入新教师档案' : (modalMode === 'edit' ? '编辑教师档案' : '查看教师档案')}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Faculty Management System</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
            </div>

            <form id="teacher-form" onSubmit={handleSave} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Section: 基本信息 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">教师姓名 <span className="text-rose-500">*</span></label>
                    <input required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="输入姓名" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">教职工号 <span className="text-rose-500">*</span></label>
                    <input required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="如: T1001" value={formData.teacherNumber} onChange={e => setFormData({ ...formData, teacherNumber: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">职称</label>
                    <select disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}>
                      <option value="教授">教授</option>
                      <option value="副教授">副教授</option>
                      <option value="讲师">讲师</option>
                      <option value="助教">助教</option>
                      <option value="外籍教授">外籍教授</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">所属院系</label>
                    <input disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 计算机学院" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Section: 联系与状态 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">联系方式与状态</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">电子邮箱</label>
                    <input type="email" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="teacher@school.edu" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">联系电话</label>
                    <input type="tel" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="13800000000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">入职日期</label>
                    <input type="date" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.joinDate} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">当前状态</label>
                    <select disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                      <option value="在职">在职 Active</option>
                      <option value="休假">休假 On Leave</option>
                      <option value="离职">离职 Resigned</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: 研究方向 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">学术研究</h4>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">主要研究方向</label>
                  <input disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 人工智能, 分布式系统" value={formData.researchArea} onChange={e => setFormData({ ...formData, researchArea: e.target.value })} />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">取消</button>
              {modalMode !== 'view' && (
                <button type="submit" form="teacher-form" className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2">
                  <Save size={16} /> 保存档案
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isTeachingModalOpen && teachingTeacher && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-700">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-zinc-100">教师授课情况</h3>
                  <p className="text-[10px] font-bold text-zinc-500">
                    {teachingTeacher.name} · {teachingTeacher.teacherNumber}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsTeachingModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">授课门数</p>
                  <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{teachingStats.totalCourses}</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">覆盖学生</p>
                  <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{teachingStats.totalStudents}</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">总学分</p>
                  <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{teachingStats.totalCredits}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  授课课程列表
                </div>
                {teachingCourses.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-400">当前未匹配到授课课程</div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {teachingCourses.map(course => (
                      <div key={course.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{course.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {course.schedule || '未设置时间'} · {course.location || '未设置教室'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">{course.enrolled || 0}/{course.maxCapacity || 0} 人</p>
                          <p className="text-[11px] text-zinc-400">{course.credits || 0} 学分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setIsTeachingModalOpen(false)}
                className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeacherList;
