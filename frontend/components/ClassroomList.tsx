
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../contexts/DataContext';
import { Classroom } from '../types';
import {
  Search,
  Plus,
  School,
  MapPin,
  Users,
  Monitor,
  Wifi,
  Projector,
  Mic,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Construction,
  X,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const ClassroomList: React.FC = () => {
  const { classrooms, addClassroom, updateClassroom, deleteClassroom, batchDeleteClassrooms, currentUser } = useData();
  const isTeacher = currentUser?.role === 'teacher';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('全部');
  const [filterStatus, setFilterStatus] = useState<string>('全部');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Classroom; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const [formData, setFormData] = useState<Partial<Classroom>>({
    name: '', id: '', capacity: 40, type: '普通教室', status: '空闲', location: '', equipment: []
  });

  const equipmentOptions = ['投影仪', '音响系统', '计算机 (60台)', '白板', '空调', '中控系统', '耳机', '电视屏', '录播设备'];

  const processedClassrooms = useMemo(() => {
    let result = [...classrooms];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower) ||
        c.location.toLowerCase().includes(lower)
      );
    }
    if (filterType !== '全部') {
      result = result.filter(c => c.type === filterType);
    }
    if (filterStatus !== '全部') {
      result = result.filter(c => c.status === filterStatus);
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] as string | number;
        const bVal = b[sortConfig.key] as string | number;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [classrooms, searchTerm, filterType, filterStatus, sortConfig]);

  const totalPages = Math.ceil(processedClassrooms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClassrooms = processedClassrooms.slice(startIndex, startIndex + itemsPerPage);

  const handleRequestSort = (key: keyof Classroom) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedClassrooms.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      paginatedClassrooms.forEach(c => newSelected.add(c.id));
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
      alert('教师账号为只读权限，不能删除教室。');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedIds.size} 间教室吗？`)) {
      batchDeleteClassrooms(selectedIds);
      setSelectedIds(new Set());
    }
  };

  const handleDelete = (id: string) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能删除教室。');
      return;
    }
    if (confirm('确定要删除这间教室吗？')) {
      deleteClassroom(id);
    }
  };

  const handleOpenCreate = () => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能新增教室。');
      return;
    }
    setModalMode('create');
    setFormData({ name: '', id: '', capacity: 40, type: '普通教室', status: '空闲', location: '', equipment: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    if (isTeacher) {
      alert('教师账号为只读权限，不能编辑教室。');
      return;
    }
    setModalMode('edit');
    setEditingClassroom(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTeacher) {
      alert('教师账号为只读权限，不能修改教室。');
      return;
    }
    if (modalMode === 'create') {
      const newClassroom = {
        ...formData,
        id: formData.id || 'R' + Date.now().toString().slice(-4),
      } as Classroom;
      addClassroom(newClassroom);
    } else if (editingClassroom) {
      updateClassroom({ ...editingClassroom, ...formData } as Classroom);
    }
    setIsModalOpen(false);
  };

  const toggleEquipment = (item: string) => {
    setFormData(prev => {
      const current = prev.equipment || [];
      if (current.includes(item)) {
        return { ...prev, equipment: current.filter(e => e !== item) };
      } else {
        return { ...prev, equipment: [...current, item] };
      }
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900">
      {/* 工具栏 */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="搜索教室名称、位置、设备..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-black outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <option value="全部">所有类型</option>
            <option value="普通教室">普通教室</option>
            <option value="阶梯教室">阶梯教室</option>
            <option value="多媒体实验室">多媒体实验室</option>
            <option value="语音室">语音室</option>
            <option value="会议室">会议室</option>
          </select>

          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
            {['全部', '空闲', '使用中', '维护中'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterStatus === s
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
              >
                {s === '全部' ? '全部' : s}
              </button>
            ))}
          </div>

          <button onClick={() => { setSearchTerm(''); setFilterType('全部'); setFilterStatus('全部'); setSortConfig(null); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

        {!isTeacher && (
          <button onClick={handleOpenCreate} className="flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95">
            <Plus size={14} /> 新增教室
          </button>
        )}
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
                  <button onClick={toggleSelectAll} className="p-1">
                    {selectedIds.size === paginatedClassrooms.length && paginatedClassrooms.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('name')}>
                  <div className="flex items-center gap-1.5">教室信息 {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('type')}>
                  <div className="flex items-center gap-1.5">类型 {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('capacity')}>
                  <div className="flex items-center gap-1.5">容量 {sortConfig?.key === 'capacity' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">设备配置</th>
                <th className="px-6 py-3 text-center">状态</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedClassrooms.length > 0 ? paginatedClassrooms.map((c) => (
                <tr key={c.id} className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 group transition-all ${selectedIds.has(c.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(c.id)} className="p-1">
                      {selectedIds.has(c.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-400 rounded-lg flex items-center justify-center">
                        <School size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 transition-colors">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">ID: {c.id}</span>
                          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                            <MapPin size={10} />
                            <span className="text-[10px] font-bold">{c.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{c.type}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <Users size={14} />
                      <span className="text-xs font-bold">{c.capacity}人</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.equipment.slice(0, 3).map((eq, i) => (
                        <span key={i} className="px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900">{eq}</span>
                      ))}
                      {c.equipment.length > 3 && (
                        <span className="px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-[9px] font-bold text-zinc-400">+{c.equipment.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${c.status === '空闲' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      c.status === '使用中' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                      {c.status}
                    </span>
                  </td>
                    <td className="px-6 py-3 text-right">
                      {!isTeacher && (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <School size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配教室</p>
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
            <span>共 {processedClassrooms.length} 间教室</span>
            <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <div className="flex items-center gap-1.5">
              <span>每页:</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-transparent border-none p-0 text-[9px] font-black outline-none cursor-pointer text-zinc-600 dark:text-zinc-300">
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

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                  {modalMode === 'create' ? <Plus size={20} /> : <Pencil size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '新增教室资源' : '编辑教室信息'}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Campus Facility Management</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">教室名称 <span className="text-rose-500">*</span></label>
                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 第一阶梯教室" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">教室编号/ID</label>
                    <input className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder={modalMode === 'create' ? "自动生成" : formData.id} disabled={modalMode === 'create'} value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">所在位置 <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input required className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: A楼 101" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">类型</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                      <option value="普通教室">普通教室</option>
                      <option value="阶梯教室">阶梯教室</option>
                      <option value="多媒体实验室">多媒体实验室</option>
                      <option value="语音室">语音室</option>
                      <option value="会议室">会议室</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">容纳人数</label>
                    <input type="number" min="1" required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">当前状态</label>
                    <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                      <option value="空闲">空闲 Available</option>
                      <option value="使用中">使用中 Occupied</option>
                      <option value="维护中">维护中 Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">配套设施</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {equipmentOptions.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleEquipment(item)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${formData.equipment?.includes(item)
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-md'
                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.equipment?.includes(item) ? 'border-white bg-white/20' : 'border-zinc-300'}`}>
                        {formData.equipment?.includes(item) && <CheckSquare size={10} />}
                      </div>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">取消</button>
              <button type="button" onClick={(e) => handleSave(e as any)} className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2">
                <Save size={16} /> 保存信息
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClassroomList;
