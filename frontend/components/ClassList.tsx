
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Class, Student } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { useData } from '../contexts/DataContext';
import { studentsApi } from '../services/api';
import {
  Pencil,
  Trash2,
  Search,
  X,
  Plus,
  Save,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  Square,
  Users,
  GraduationCap,
  Building,
  CalendarDays,
  Shapes,
  User as UserIcon
} from 'lucide-react';

const ClassList: React.FC = () => {
  const {
    classes,
    teachers,
    students,
    addClass,
    updateClass,
    deleteClass,
    batchDeleteClasses,
    updateStudent,
    refreshData,
    currentUser
  } = useData();
  const isTeacher = currentUser?.role === 'teacher';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('全部');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Class; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | null>(null);
  const [classStudentsRemote, setClassStudentsRemote] = useState<Student[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [classStudentsError, setClassStudentsError] = useState<string | null>(null);
  const [allStudentsRemote, setAllStudentsRemote] = useState<Student[]>([]);
  const [allStudentsLoading, setAllStudentsLoading] = useState(false);
  const [allStudentsError, setAllStudentsError] = useState<string | null>(null);
  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [moveTargetClassId, setMoveTargetClassId] = useState('');

  const [formData, setFormData] = useState<Partial<Class>>({
    name: '', id: '', department: '', advisor: '', studentCount: 0, year: new Date().getFullYear(), status: 'active'
  });

  const processedClasses = useMemo(() => {
    let result = [...classes];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower) ||
        c.department.toLowerCase().includes(lower) ||
        c.advisor.toLowerCase().includes(lower)
      );
    }
    if (filterStatus !== '全部') {
      result = result.filter(c => c.status === filterStatus);
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
  }, [classes, searchTerm, filterStatus, sortConfig]);

  const handleRequestSort = (key: keyof Class) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const totalPages = Math.ceil(processedClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = processedClasses.slice(startIndex, startIndex + itemsPerPage);
  const maxStudentCount = Math.max(1, ...processedClasses.map(c => c.studentCount || 0));

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedClasses.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      paginatedClasses.forEach(c => newSelected.add(c.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能删除班级。');
      return;
    }
    if (confirm(`确定要物理删除选中的 ${selectedIds.size} 个班级吗？`)) {
      batchDeleteClasses(selectedIds);
      setSelectedIds(new Set());
    }
  };

  const handleOpenEdit = (cls: Class) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能编辑班级。');
      return;
    }
    setEditingClass(cls);
    setFormData({ ...cls });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (cls: Class) => {
    setEditingClass(cls);
    setFormData({ ...cls });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTeacher) {
      alert('教师账号为只读权限，不能修改班级。');
      return;
    }
    if (modalMode === 'view') return;

    if (modalMode === 'create') {
      const newClass = {
        ...formData,
        status: formData.status || 'active'
      } as Class;
      addClass(newClass);
    } else {
      if (editingClass) {
        updateClass({ ...editingClass, ...formData } as Class);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能删除班级。');
      return;
    }
    if (confirm('确定删除该班级吗？')) {
      deleteClass(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleOpenCreate = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能新增班级。');
      return;
    }
    setModalMode('create');
    setFormData({
      name: '',
      id: '',
      department: '',
      advisor: '',
      studentCount: 0,
      year: new Date().getFullYear(),
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const loadClassStudents = async (classId: string) => {
    setClassStudentsLoading(true);
    setClassStudentsError(null);
    try {
      const pageSize = 200;
      const first = await studentsApi.getPage(0, pageSize, undefined, undefined, classId);
      const firstList = (first?.content || []).map((s: any) => ({
        ...s,
        class: s.classId || s.class || '',
      })) as Student[];

      const totalPages = Number(first?.totalPages || 1);
      if (totalPages <= 1) {
        setClassStudentsRemote(firstList);
        return;
      }

      const restPageIndexes = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const restPages = await Promise.all(
        restPageIndexes.map((page) => studentsApi.getPage(page, pageSize, undefined, undefined, classId))
      );
      const restList = restPages.flatMap((res: any) =>
        (res?.content || []).map((s: any) => ({
          ...s,
          class: s.classId || s.class || '',
        }))
      ) as Student[];

      setClassStudentsRemote([...firstList, ...restList]);
    } catch (err: any) {
      setClassStudentsRemote([]);
      setClassStudentsError(err?.message || '获取班级学生失败');
    } finally {
      setClassStudentsLoading(false);
    }
  };

  const loadAllStudents = async () => {
    setAllStudentsLoading(true);
    setAllStudentsError(null);
    try {
      const pageSize = 200;
      const first = await studentsApi.getPage(0, pageSize);
      const firstList = (first?.content || []).map((s: any) => ({
        ...s,
        class: s.classId || s.class || '',
      })) as Student[];

      const totalPages = Number(first?.totalPages || 1);
      if (totalPages <= 1) {
        setAllStudentsRemote(firstList);
        return;
      }

      const restPageIndexes = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const restPages = await Promise.all(
        restPageIndexes.map((page) => studentsApi.getPage(page, pageSize))
      );
      const restList = restPages.flatMap((res: any) =>
        (res?.content || []).map((s: any) => ({
          ...s,
          class: s.classId || s.class || '',
        }))
      ) as Student[];

      setAllStudentsRemote([...firstList, ...restList]);
    } catch (err: any) {
      setAllStudentsRemote([]);
      setAllStudentsError(err?.message || '获取学生列表失败');
    } finally {
      setAllStudentsLoading(false);
    }
  };

  const handleOpenStudents = (cls: Class) => {
    setSelectedClassForStudents(cls);
    void loadClassStudents(cls.id);
    setIsStudentsModalOpen(true);
  };

  const classStudents = useMemo(() => {
    if (!selectedClassForStudents) return [];
    return classStudentsRemote;
  }, [classStudentsRemote, selectedClassForStudents]);

  const availableStudents = useMemo(() => {
    if (!selectedClassForStudents) return [];
    const keyword = candidateKeyword.trim().toLowerCase();
    return allStudentsRemote
      .filter(s => s.class !== selectedClassForStudents.id)
      .filter(s => {
        if (!keyword) return true;
        return (
          s.name.toLowerCase().includes(keyword) ||
          s.studentNumber.toLowerCase().includes(keyword)
        );
      });
  }, [allStudentsRemote, selectedClassForStudents, candidateKeyword]);

  const handleAssignStudentToCurrentClass = async (student: Student) => {
    if (!selectedClassForStudents || isTeacher) return;
    await (updateStudent as any)({ ...student, class: selectedClassForStudents.id });
    await refreshData();
    await loadClassStudents(selectedClassForStudents.id);
    await loadAllStudents();
  };

  const openMoveStudent = (student: Student) => {
    setMovingStudent(student);
    setMoveTargetClassId(student.class || '');
  };

  const handleConfirmMove = async () => {
    if (isTeacher || !movingStudent) return;
    if (!moveTargetClassId) return;
    await (updateStudent as any)({ ...movingStudent, class: moveTargetClassId });
    setMovingStudent(null);
    await refreshData();
    if (selectedClassForStudents) {
      await loadClassStudents(selectedClassForStudents.id);
    }
    await loadAllStudents();
  };

  const handleRemoveStudentFromClass = async (student: Student) => {
    if (isTeacher) return;
    if (!confirm('确定将该学生移出当前班级吗？')) return;
    await (updateStudent as any)({ ...student, class: '' });
    await refreshData();
    if (selectedClassForStudents) {
      await loadClassStudents(selectedClassForStudents.id);
    }
    await loadAllStudents();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">

      {/* 工具栏 */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="搜索班级名称、院系、班主任..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
            {['全部', 'active', 'graduated'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterStatus === s
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
              >
                {s === '全部' ? '全部' : s === 'active' ? '在读' : '毕业'}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
          <button onClick={() => { setSearchTerm(''); setFilterStatus('全部'); setSortConfig(null); setCurrentPage(1); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

        <div className="flex items-center gap-2 w-full lg:w-auto">
          {!isTeacher && (
            <button onClick={handleOpenCreate} className="flex-1 lg:flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95">
              <Plus size={14} /> 新增班级
            </button>
          )}
        </div>
      </div>

      {/* 批量操作悬浮条 */}
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
            <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[11px] font-bold">
              <Trash2 size={14} /> 批量删除
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 ml-1"></div>

          <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 表格容器 */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                    {selectedIds.size === paginatedClasses.length && paginatedClasses.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('name')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">班级信息 {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('department')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">所属院系 {sortConfig?.key === 'department' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">班主任</th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('studentCount')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">人数 {sortConfig?.key === 'studentCount' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 text-center">状态</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedClasses.length > 0 ? paginatedClasses.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`group transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 ${selectedIds.has(c.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}
                >
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(c.id)} className="p-1">
                      {selectedIds.has(c.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-400 rounded-lg flex items-center justify-center">
                        <Shapes size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 transition-colors">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                            <CalendarDays size={10} />
                            <span className="text-[10px] font-bold">{c.year}级</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{c.department}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={12} className="text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{c.advisor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 cursor-pointer group/stat" onClick={() => handleOpenStudents(c)}>
                    <div className="flex items-center gap-2 relative">
                      <Users size={12} className="text-zinc-400 group-hover/stat:text-blue-600 transition-colors" />
                      <div className="w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden group-hover/stat:ring-2 ring-zinc-300 dark:ring-zinc-600 transition-all">
                        <div className="h-full bg-zinc-900 group-hover/stat:bg-blue-600 transition-colors" style={{ width: `${(c.studentCount / maxStudentCount) * 100}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 group-hover/stat:text-blue-600 transition-colors">{c.studentCount} 人</span>

                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                        点击查看学生名单
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                      }`}>
                      {c.status === 'active' ? '在读' : '毕业'}
                    </span>
                  </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenStudents(c)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Eye size={14} /></button>
                        {!isTeacher && (
                          <>
                            <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <Shapes size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配班级</p>
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
            <span>共 {processedClasses.length} 个班级</span>
            <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <div className="flex items-center gap-1.5">
              <span>每页:</span>
              <span className="font-bold">{itemsPerPage}</span>
            </div>
            {/* The original select element was here. The instruction seems to remove it and replace with a static span. */}
            {/* The provided snippet was malformed, so I'm interpreting the intent as removing the select and showing the value. */}
            {/* If the intent was to fix an error *within* the select, more context would be needed. */}
            {/* Given "Fix `setItemsPerPage` error" and the provided snippet, it looks like the select element was causing an issue or is no longer desired. */}
            {/* I'm removing the select element as per the implied change in the provided snippet. */}
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
            {modalMode !== 'view' ? (
              <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                    {modalMode === 'create' ? <Plus size={20} /> : <Pencil size={20} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '新增班级信息' : '编辑班级信息'}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Class Management System</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
              </div>
            ) : (
              <div className="flex justify-end p-6 pb-0 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
              </div>
            )}

            <form onSubmit={handleSave} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {modalMode !== 'view' && (
                <>
                  {/* Section: 基本信息 */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">基本信息</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">班级名称 <span className="text-rose-500">*</span></label>
                        <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 计算机科学 21-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">所属院系</label>
                        <input className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 计算机学院" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">班主任</label>
                        <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.advisorId || ''}
                          onChange={e => {
                            const t = teachers.find(t => t.id === e.target.value);
                            setFormData({ ...formData, advisorId: t?.id, advisor: t?.name });
                          }}>
                          <option value="">请选择班主任...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.department}) - {t.status}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: 状态与统计 */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">状态与统计</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">入学年份</label>
                        <input type="number" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">当前人数</label>
                        <input type="number" min="0" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.studentCount} onChange={e => setFormData({ ...formData, studentCount: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">当前状态</label>
                        <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                          <option value="active">在读 Active</option>
                          <option value="graduated">毕业 Graduated</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Section: 班级成员列表 (仅查看模式) */}
              {modalMode === 'view' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/30 pb-2">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest">班级成员</h4>
                    <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                      共 {students.filter(s => s.class === formData.id).length} 人
                    </span>
                  </div>
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">姓名</th>
                          <th className="px-4 py-3">学号</th>
                          <th className="px-4 py-3">性别</th>
                          <th className="px-4 py-3">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {students.filter(s => s.class === formData.id).length > 0 ? (
                          students.filter(s => s.class === formData.id).map(student => (
                            <tr key={student.id} className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                                <img
                                  src={resolveAvatar(student.avatar, student.id || student.studentNumber || student.name)}
                                  className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800"
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name);
                                  }}
                                />
                                {student.name}
                              </td>
                              <td className="px-4 py-3 text-zinc-500 font-mono">{student.studentNumber}</td>
                              <td className="px-4 py-3 text-zinc-500">{student.gender}</td>
                              <td className="px-4 py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${student.status === '在读' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                                  {student.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">暂无学生</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </form>

            <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">取消</button>
              {modalMode !== 'view' && (
                <button type="button" onClick={(e) => handleSave(e as any)} className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2">
                  <Save size={16} /> 保存档案
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isStudentsModalOpen && selectedClassForStudents && createPortal(
        <div className="fixed inset-0 z-[110] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                  <Users className="text-zinc-600" size={28} /> {selectedClassForStudents.name} 学生名单
                </h3>
                <p className="text-sm font-bold text-zinc-500 mt-2">班主任: {selectedClassForStudents.advisor} • 班级人数: {selectedClassForStudents.studentCount}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isTeacher && (
                  <button
                    onClick={async () => {
                      const nextOpen = !isAddExistingOpen;
                      setIsAddExistingOpen(nextOpen);
                      if (nextOpen) {
                        await loadAllStudents();
                      }
                    }}
                    className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-black tracking-widest hover:bg-black transition-colors"
                  >
                    移入现有学生
                  </button>
                )}
                <button onClick={() => setIsStudentsModalOpen(false)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900">
              {isAddExistingOpen && !isTeacher && (
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-zinc-400" />
                    <input
                      value={candidateKeyword}
                      onChange={e => setCandidateKeyword(e.target.value)}
                      placeholder="搜索可移入学生（姓名/学号）"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {allStudentsLoading && (
                      <div className="text-xs text-zinc-400 py-4 text-center">正在加载全量学生...</div>
                    )}
                    {!allStudentsLoading && allStudentsError && (
                      <div className="text-xs text-rose-500 py-4 text-center">{allStudentsError}</div>
                    )}
                    {!allStudentsLoading && !allStudentsError && availableStudents.slice(0, 50).map(student => (
                      <div key={student.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700">
                        <div className="text-xs">
                          <div className="font-bold text-zinc-800 dark:text-zinc-100">{student.name} <span className="text-zinc-400">({student.studentNumber})</span></div>
                          <div className="text-zinc-500">当前班级：{classes.find(c => c.id === student.class)?.name || '未分配'}</div>
                        </div>
                        <button onClick={() => handleAssignStudentToCurrentClass(student)} className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-zinc-900 text-white hover:bg-black transition-colors">
                          移入本班
                        </button>
                      </div>
                    ))}
                    {!allStudentsLoading && !allStudentsError && availableStudents.length === 0 && (
                      <div className="text-xs text-zinc-400 py-4 text-center">暂无可移入学生</div>
                    )}
                  </div>
                </div>
              )}

              {classStudentsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-60">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent" />
                  <p className="mt-3 text-sm font-bold text-zinc-500">正在加载班级学生...</p>
                </div>
              ) : classStudentsError ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold text-rose-500">{classStudentsError}</p>
                </div>
              ) : classStudents.length > 0 ? (
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">姓名</th>
                        <th className="px-4 py-3">学号</th>
                        <th className="px-4 py-3">性别</th>
                        <th className="px-4 py-3">GPA</th>
                        <th className="px-4 py-3">出勤</th>
                        <th className="px-4 py-3">状态</th>
                        {!isTeacher && <th className="px-4 py-3 text-right">操作</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {classStudents.map(student => (
                        <tr key={student.id} className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <img
                              src={resolveAvatar(student.avatar, student.id || student.studentNumber || student.name)}
                              className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800"
                              alt=""
                              onError={(e) => { (e.target as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name); }}
                            />
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 font-mono">{student.studentNumber}</td>
                          <td className="px-4 py-3 text-zinc-500">{student.gender}</td>
                          <td className="px-4 py-3 text-zinc-500">{student.gpa}</td>
                          <td className="px-4 py-3 text-zinc-500">{student.attendance}%</td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${student.status === '在读' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                              {student.status}
                            </span>
                          </td>
                          {!isTeacher && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openMoveStudent(student)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="改换班级"><Pencil size={14} /></button>
                                <button onClick={() => handleRemoveStudentFromClass(student)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="移出班级"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center opacity-50">
                  <Users size={32} className="text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-3 text-sm font-bold text-zinc-400">该班级暂无学生</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end">
              <button onClick={() => setIsStudentsModalOpen(false)} className="px-8 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                关闭
              </button>
            </div>

            {movingStudent && !isTeacher && (
              <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5 space-y-4">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">改换班级</div>
                  <div className="text-xs text-zinc-500">学生：{movingStudent.name}（{movingStudent.studentNumber}）</div>
                  <select
                    value={moveTargetClassId}
                    onChange={e => setMoveTargetClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
                  >
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setMovingStudent(null)} className="px-4 py-2 text-xs font-black rounded-lg border border-zinc-200 dark:border-zinc-700">取消</button>
                    <button onClick={handleConfirmMove} className="px-4 py-2 text-xs font-black rounded-lg bg-zinc-900 text-white">确认换班</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClassList;
