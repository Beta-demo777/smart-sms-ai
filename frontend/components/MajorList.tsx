import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Major } from '../types';
import { Search, Plus, Trash2, Pencil, CheckSquare, Square, X, BookOpen, User, RotateCcw, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function MajorList() {
    const { departments, majors, addMajor, updateMajor, deleteMajor, batchDeleteMajors } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('全部');
    const [filterDepartment, setFilterDepartment] = useState('全部');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<Major>>({
        name: '',
        code: '',
        departmentId: '',
        description: '',
        head: '',
        status: '启用'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const filteredMajors = useMemo(() => {
        let result = majors.filter(major => {
            const matchesSearch =
                major.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                major.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (major.head?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchesStatus = filterStatus === '全部' || major.status === filterStatus;

            // Map departmentId to department name checking if needed, or just strict ID match
            // Since filterDepartment is ID or '全部'
            const matchesDept = filterDepartment === '全部' || major.departmentId === filterDepartment;

            return matchesSearch && matchesStatus && matchesDept;
        });
        return result;
    }, [majors, searchTerm, filterStatus, filterDepartment]);

    const totalPages = Math.ceil(filteredMajors.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMajors = filteredMajors.slice(startIndex, startIndex + itemsPerPage);

    const handleOpenCreate = () => {
        setModalMode('create');
        setFormData({ name: '', code: '', departmentId: '', description: '', head: '', status: '启用' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (major: Major) => {
        setModalMode('edit');
        setFormData({ ...major });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await addMajor(formData as Major);
            } else {
                await updateMajor(formData as Major);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || '操作失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定要删除该专业吗？')) {
            await deleteMajor(id);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleBatchDelete = async () => {
        if (confirm(`确定要删除选中的 ${selectedIds.size} 个专业吗？`)) {
            await batchDeleteMajors(selectedIds);
            setSelectedIds(new Set());
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedMajors.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            paginatedMajors.forEach(d => newSelected.add(d.id));
            setSelectedIds(newSelected);
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatus('全部');
        setFilterDepartment('全部');
        setCurrentPage(1);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
            {/* Search and Filters */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索专业名称、代码、负责人..."
                        className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-1.5 w-full lg:w-auto">
                    {/* Department Filter */}
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-3 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                        <option value="全部">所有院系</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
                        {['全部', '启用', '停用'].map(s => (
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

                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

                    <button onClick={resetFilters} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
                        <RotateCcw size={16} />
                    </button>

                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

                    <button onClick={handleOpenCreate} className="flex-1 lg:flex-none px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95">
                        <Plus size={14} /> 新增专业
                    </button>
                </div>
            </div>

            {/* Floating Batch Action */}
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

                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

                    <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[11px] font-bold">
                        <Trash2 size={14} /> 删除
                    </button>

                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 ml-1" />

                    <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Table List */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse table-auto">
                        <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
                            <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                <th scope="col" className="px-6 py-3 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                                        {paginatedMajors.length > 0 && paginatedMajors.every(d => selectedIds.has(d.id)) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3">专业名称</th>
                                <th scope="col" className="px-6 py-3 hidden sm:table-cell">编号</th>
                                <th scope="col" className="px-6 py-3 hidden md:table-cell">所属院系</th>
                                <th scope="col" className="px-6 py-3 hidden md:table-cell">负责人</th>
                                <th scope="col" className="px-6 py-3 text-center">状态</th>
                                <th scope="col" className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {paginatedMajors.map((major) => (
                                <tr key={major.id} className={`group transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 ${selectedIds.has(major.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}>
                                    <td className="px-6 py-3 text-center">
                                        <button onClick={() => toggleSelect(major.id)} className="p-1">
                                            {selectedIds.has(major.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm border border-white dark:border-zinc-700">
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 transition-colors">{major.name}</div>
                                                <div className="text-[10px] text-zinc-400 font-medium truncate max-w-[120px]">{major.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono hidden sm:table-cell">{major.code}</td>
                                    <td className="px-6 py-3 hidden md:table-cell">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                            <Building2 size={12} className="text-zinc-400" />
                                            {departments.find(d => d.id === major.departmentId)?.name || major.departmentName || '未分配'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 hidden md:table-cell">
                                        {major.head ? (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                <User size={12} className="text-zinc-400" />
                                                {major.head}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-300 italic">未设置</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${major.status === '启用' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                            {major.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleOpenEdit(major)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(major.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedMajors.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                                <BookOpen size={32} className="text-zinc-300 dark:text-zinc-600" />
                                            </div>
                                            <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到符合条件的专业</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="flex-none px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-20">
                    <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>共 {filteredMajors.length} 个专业</span>
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

            {/* Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                                    {modalMode === 'create' ? <Plus size={20} /> : <Pencil size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '新增专业' : '编辑专业'}</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Major Management</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">专业名称 <span className="text-rose-500">*</span></label>
                                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 软件工程" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">专业代码 <span className="text-rose-500">*</span></label>
                                    <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm font-mono" placeholder="例如: SE" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">所属院系 <span className="text-rose-500">*</span></label>
                                    <select required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm appearance-none" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                                        <option value="">请选择院系...</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">负责人</label>
                                    <input className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="专业负责人姓名" value={formData.head || ''} onChange={e => setFormData({ ...formData, head: e.target.value })} />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">状态</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" checked={formData.status === '启用'} onChange={() => setFormData({ ...formData, status: '启用' })} className="hidden peer" />
                                            <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 flex items-center justify-center transition-all">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-0 peer-checked:opacity-100" />
                                            </div>
                                            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">启用</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" checked={formData.status === '停用'} onChange={() => setFormData({ ...formData, status: '停用' })} className="hidden peer" />
                                            <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 peer-checked:border-rose-500 peer-checked:bg-rose-500 flex items-center justify-center transition-all">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-0 peer-checked:opacity-100" />
                                            </div>
                                            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">停用</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">描述</label>
                                    <textarea className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-medium text-sm h-24 resize-none" placeholder="关于该专业的简要描述..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    取消
                                </button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-sm bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 dark:shadow-none active:scale-95">
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
}
