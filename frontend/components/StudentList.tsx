
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Student } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { useData } from '../contexts/DataContext';
import {
  Pencil,
  Trash2,
  Users,
  Search,
  X,
  ArrowUpDown,
  Download,
  CheckCircle2,
  GraduationCap,
  Upload,
  CheckSquare,
  Square,
  RotateCcw,
  UserPlus,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Fingerprint,
  BookOpen
} from 'lucide-react';
import { StudentViewCoursesModal } from './StudentViewCoursesModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentBatchActionBar } from './StudentBatchActionBar';

const StudentList: React.FC = () => {
  const {
    students,
    studentTotalElements,
    fetchStudentsPage,
    classes,
    courses,
    addStudent,
    updateStudent,
    deleteStudent,
    batchDeleteStudents,
    batchUpdateStudentStatus,
    currentUser
  } = useData();
  const isTeacher = currentUser?.role === 'teacher';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('全部');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' }>({ key: 'studentNumber', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '', studentNumber: '', id: '', class: '', gender: '男', age: 20, email: '', gpa: 0, attendance: 100, status: '在读', enrollmentDate: new Date().toISOString().split('T')[0]
  });

  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [selectedStudentForCourses, setSelectedStudentForCourses] = useState<Student | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('studentListIntent');
    if (!raw) return;
    try {
      const intent = JSON.parse(raw) as { searchTerm?: string; filterStatus?: string };
      if (intent.searchTerm) setSearchTerm(intent.searchTerm);
      if (intent.filterStatus && ['全部', '在读', '休学', '毕业'].includes(intent.filterStatus)) {
        setFilterStatus(intent.filterStatus);
      }
      setCurrentPage(1);
    } catch {
      // ignore malformed intent
    } finally {
      localStorage.removeItem('studentListIntent');
    }
  }, []);

  // Debounced effect to fetch students when filters/pagination changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudentsPage(
        currentPage - 1,
        itemsPerPage,
        searchTerm,
        filterStatus,
        undefined,
        sortConfig ? `${sortConfig.key},${sortConfig.direction}` : undefined
      );
    }, 300); // 300ms debounce for search terms
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, searchTerm, filterStatus, sortConfig, fetchStudentsPage]);

  // When filters sort or search change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.ceil(studentTotalElements / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const displayedStudents = useMemo(() => {
    if (!sortConfig) return students;
    const sorted = [...students];
    sorted.sort((a: any, b: any) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [students, sortConfig]);

  const handleRequestSort = (key: keyof Student) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedStudents.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      displayedStudents.forEach(s => newSelected.add(s.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchStatus = (status: Student['status']) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能批量修改学生状态。');
      return;
    }
    batchUpdateStudentStatus(selectedIds, status);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能批量删除学生。');
      return;
    }
    if (confirm(`确定要物理删除选中的 ${selectedIds.size} 名学生档案吗？`)) {
      batchDeleteStudents(selectedIds);
      setSelectedIds(new Set());
    }
  };

  const handleOpenEdit = (student: Student) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能编辑学生档案。');
      return;
    }
    setEditingStudent(student);
    setFormData({ ...student });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleOpenCourses = (student: Student) => {
    setSelectedStudentForCourses(student);
    setIsCoursesModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTeacher) {
      alert('教师账号为只读权限，不能修改学生档案。');
      return;
    }
    if (modalMode === 'view') return;

    try {
      if (modalMode === 'create') {
        const newStudent = {
          ...formData,
          avatar: formData.avatar || buildAvatarUrl(formData.studentNumber || formData.name),
          enrollmentDate: formData.enrollmentDate || new Date().toISOString().split('T')[0]
        } as Student;
        await addStudent(newStudent);
      } else {
        if (editingStudent) {
          await updateStudent({ ...editingStudent, ...formData } as Student);
        }
      }
      setIsModalOpen(false);
    } catch {
      // keep modal open on validation or network errors
    }
  };

  const handleDelete = async (id: string) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能删除学生。');
      return;
    }
    if (confirm('确定删除该学生档案吗？此操作将同时删除关联的用户账户，无法撤销！')) {
      try {
        await deleteStudent(id);
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

  const handleExport = () => {
    // Only exporting current page students for now, for full export a backend API is needed.
    const headers = ['学号', '姓名', '班级', 'GPA', '出勤率', '状态'];
    const rows = students.map(s => [s.studentNumber, s.name, s.class, s.gpa, `${s.attendance}%`, s.status]);
    const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SmartSMS_Report.csv`;
    link.click();
  };

  const handleImportMock = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能导入学生。');
      return;
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        alert(`模拟导入成功！`);
        const mockImported: Student = {
          id: 'S' + Math.floor(Math.random() * 10000),
          studentNumber: '2024' + Math.floor(Math.random() * 10000),
          name: '新进学生',
          age: 20,
          gender: '男',
          email: 'import@test.com',
          class: '新班级',
          enrollmentDate: new Date().toISOString().split('T')[0],
          gpa: 3.0,
          attendance: 100,
          status: '在读',
          avatar: buildAvatarUrl('imported')
        };
        addStudent(mockImported);
      }
    };
    fileInput.click();
  };

  const handleOpenCreate = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能录入新生。');
      return;
    }
    setModalMode('create');
    setFormData({ name: '', studentNumber: '', id: '', class: '', status: '在读', gender: '男', age: 20, gpa: 0, attendance: 100, enrollmentDate: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">

      {/* 工具栏 */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative min-h-[72px]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="快速检索姓名、学号、班级..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
            {['全部', '在读', '休学', '毕业'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterStatus === s
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
          <button onClick={() => { setSearchTerm(''); setFilterStatus('全部'); setSortConfig({ key: 'studentNumber', direction: 'asc' }); setCurrentPage(1); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

        <div className="flex items-center gap-2 w-full lg:w-auto">
          {!isTeacher && (
            <button onClick={handleImportMock} className="flex-1 lg:flex-none px-3 h-9 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
              <Upload size={14} /> 导入
            </button>
          )}
          <button onClick={handleExport} className="flex-1 lg:flex-none px-3 h-9 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
            <Download size={14} /> 导出
          </button>
          {!isTeacher && (
            <button onClick={handleOpenCreate} className="flex-1 lg:flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95">
              <UserPlus size={14} /> 录入新生
            </button>
          )}
        </div>
      </div>

      {/* 批量操作悬浮条 */}
      {!isTeacher && (
        <StudentBatchActionBar
          selectedCount={selectedIds.size}
          onBatchStatus={handleBatchStatus}
          onBatchDelete={handleBatchDelete}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* 表格容器 */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-scroll custom-scrollbar relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm mx-auto hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                    {displayedStudents.every(s => selectedIds.has(s.id)) && displayedStudents.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('studentNumber')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">学生信息 {sortConfig?.key === 'studentNumber' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">行政班级</th>
                <th className="px-6 py-3 text-center cursor-pointer group" onClick={() => handleRequestSort('gpa')}>
                  <div className="flex items-center justify-center gap-1.5 group-hover:text-zinc-900 transition-colors">GPA {sortConfig?.key === 'gpa' ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 text-center">状态</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {displayedStudents.length > 0 ? displayedStudents.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`group transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 ${selectedIds.has(s.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}
                >
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(s.id)} className="p-1">
                      {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={resolveAvatar(s.avatar, s.id || s.studentNumber || s.name)}
                        className="w-10 h-10 rounded-xl object-cover border border-white dark:border-zinc-700 shadow-sm"
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = buildAvatarUrl(s.id || s.studentNumber || s.name);
                        }}
                      />
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 transition-colors">{s.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1 text-zinc-900 dark:text-zinc-300 font-black"><Fingerprint size={10} /> {s.studentNumber}</span>
                          <span className="text-zinc-200 dark:text-zinc-800">|</span>
                          <span>{s.gender} {s.age}Y</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                    {classes.find(c => c.id === s.class)?.name || s.class}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-400">{(s.gpa || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${s.status === '在读' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      s.status === '休学' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                      }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenCourses(s)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors tooltip" title="查看选修课">
                        <BookOpen size={14} />
                      </button>
                      <button onClick={() => handleOpenView(s)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Eye size={14} /></button>
                      {!isTeacher && (
                        <>
                          <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配学生</p>
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
            <span>共 {studentTotalElements} 位学生</span>
            <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <div className="flex items-center gap-1.5">
              <span>每页:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent border-none p-0 text-[9px] font-black outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
              >
                {[10, 15, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
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

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modalMode={modalMode}
        formData={formData}
        setFormData={setFormData}
        classes={classes}
        onSave={handleSave}
      />

      <StudentViewCoursesModal
        isOpen={isCoursesModalOpen}
        onClose={() => setIsCoursesModalOpen(false)}
        student={selectedStudentForCourses}
        classes={classes}
        courses={courses}
      />
    </div>
  );
};

export default StudentList;
