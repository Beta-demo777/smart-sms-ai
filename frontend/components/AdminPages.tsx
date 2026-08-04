
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UsersRound,
  Search,
  Lock,
  Unlock,
  HardDrive,
  ArrowUpRight,
  History,
  Activity as ActivityIcon,
  BookOpen,
  X,
  UserPlus,
  Pencil,
  Trash2,
  ArrowUpDown,
  Download,
  Upload,
  CheckSquare,
  Square,
  RotateCcw,
  GripVertical,
  Save,
  ShieldCheck,
  MoreVertical,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Filter,
  Shield,
  KeyRound,
  Camera,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { activitiesApi } from '../services/api';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { useToast } from '../contexts/ToastContext';
import { User, Role, Course, Student } from '../types';
import { filesApi, coursesApi } from '../services/api';

export const AdminUsersPage: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, updateUserStatus } = useData();
  const [activeRole, setActiveRole] = useState<'all' | Role>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'locked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' }>({ key: 'username', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [newUser, setNewUser] = useState<Partial<User>>({ name: '', username: '', email: '', password: '', role: 'student', status: 'active' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Password Reset Modal State
  const [resetModal, setResetModal] = useState<{ open: boolean; targetId?: string; isBatch?: boolean }>({ open: false });
  const [resetPasswordValue, setResetPasswordValue] = useState('123456');
  const [resetSuccess, setResetSuccess] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setResetPasswordValue(pass);
  };

  const processedUsers = useMemo(() => {
    let result = [...users];

    // Filtering
    result = result.filter(u => {
      const matchRole = activeRole === 'all' || u.role === activeRole;
      const matchStatus = activeStatus === 'all' || u.status === activeStatus;
      const matchSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (u.id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchRole && matchStatus && matchSearch;
    });

    // Sorting
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
  }, [users, activeRole, activeStatus, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = processedUsers.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeRole, activeStatus, searchTerm]);

  const handleRequestSort = (key: keyof User) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedUsers.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      paginatedUsers.forEach(u => newSelected.add(u.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchLock = (status: 'active' | 'locked') => {
    updateUserStatus(selectedIds, status);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm(`确定要删除选中的 ${selectedIds.size} 个账户吗？`)) {
      selectedIds.forEach(id => deleteUser(id));
      setSelectedIds(new Set());
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    let finalAvatar = newUser.avatar || buildAvatarUrl(newUser.username || newUser.name);

    if (selectedFile) {
      try {
        const res = await filesApi.upload(selectedFile);
        finalAvatar = res.url;
      } catch (err) {
        alert('上传头像失败: ' + err);
        setIsUploading(false);
        return;
      }
    }

    const u: User = {
      id: modalMode === 'create' ? 'U' + Date.now() : (newUser.id as string),
      name: newUser.name || 'Unknown',
      username: newUser.username || 'user' + Date.now(),
      email: newUser.email || '',
      password: newUser.password || '123456',
      role: newUser.role || 'student',
      avatar: finalAvatar,
      status: newUser.status || 'active',
      lastLogin: newUser.lastLogin || '从未登录'
    };

    try {
      if (modalMode === 'create') {
        await addUser(u);
      } else {
        await updateUser(u.id, u);
      }
      setIsModalOpen(false);
      setNewUser({ name: '', username: '', email: '', password: '', role: 'student', status: 'active' });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('保存失败: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetPassword = (id: string) => {
    setResetModal({ open: true, targetId: id, isBatch: false });
    setResetPasswordValue('123456');
    setResetSuccess(false);
  };

  const handleBatchResetPassword = () => {
    setResetModal({ open: true, isBatch: true });
    setResetPasswordValue('123456');
    setResetSuccess(false);
  };

  const confirmResetPassword = async () => {
    if (resetModal.isBatch) {
      await Promise.all(Array.from(selectedIds).map(id => updateUser(id, { password: resetPasswordValue })));
      setSelectedIds(new Set());
    } else if (resetModal.targetId) {
      await updateUser(resetModal.targetId, { password: resetPasswordValue });
    }
    setResetSuccess(true);
    setTimeout(() => {
      setResetModal({ open: false });
      setResetSuccess(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRandomAvatar = () => {
    const randomUrl = buildAvatarUrl(newUser.username || newUser.name);
    setNewUser({ ...newUser, avatar: randomUrl });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setNewUser(user);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setNewUser({ name: '', username: '', email: '', password: '', role: 'student', status: 'active' });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  // Export Data
  const handleExport = () => {
    const dataStr = JSON.stringify(processedUsers, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import Data
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`确定要从 ${file.name} 导入用户吗？这可能需要一些时间。`)) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      let importedData;
      try {
        importedData = JSON.parse(text);
      } catch {
        throw new Error('文件格式错误，必须是有效的 JSON 格式');
      }

      const usersToImport = Array.isArray(importedData) ? importedData : (importedData.users || []);
      if (!Array.isArray(usersToImport)) {
        throw new Error('无法识别用户数据，请确保 JSON 包含用户数组');
      }

      let successCount = 0;
      let failCount = 0;

      for (const userData of usersToImport) {
        try {
          // Construct a safe user object, generating a temporary ID if missing (though backend handles ID)
          // We rely on addUser to call the backend create API
          const newUserReq: User = {
            ...userData,
            id: 'TEMP_' + Date.now() + Math.random(), // Temporary ID, will be ignored/replaced by backend usually or handled by addUser
            password: userData.password || '123456', // Default password if missing
            status: userData.status || 'active',
            role: userData.role || 'student'
          };
          await addUser(newUserReq);
          successCount++;
        } catch (err) {
          console.error('Import failed for user:', userData, err);
          failCount++;
        }
      }

      alert(`导入完成！\n成功: ${successCount}\n失败: ${failCount}`);
    } catch (err: any) {
      alert('导入失败: ' + err.message);
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">

      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 z-30 relative">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="搜索用户姓名、邮箱或ID..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
            {['all', 'admin', 'teacher', 'student'].map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role as any)}
                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeRole === role
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
              >
                {role === 'all' ? '全部' : role === 'admin' ? '管理员' : role === 'teacher' ? '教师' : '学生'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block"></div>

          <select
            value={activeStatus}
            onChange={e => setActiveStatus(e.target.value as any)}
            className="px-3 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-black outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <option value="all">所有状态</option>
            <option value="active">正常 Active</option>
            <option value="locked">锁定 Locked</option>
          </select>

          <button onClick={() => { setSearchTerm(''); setActiveRole('all'); setActiveStatus('all'); setSortConfig({ key: 'username', direction: 'asc' }); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="导入用户数据 (JSON)"
          >
            {isImporting ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
            <span className="hidden sm:inline">导入</span>
          </button>

          <button
            onClick={handleExport}
            className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
            title="导出当前列表 (JSON)"
          >
            <Download size={14} />
            <span className="hidden sm:inline">导出</span>
          </button>
        </div>

        <button onClick={handleOpenCreate} className="flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all active:scale-95 ml-auto lg:ml-0">
          <UserPlus size={14} /> 新增用户
        </button>
      </div>

      {/* Floating Batch Actions - Adapted to Theme */}
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
            <button onClick={() => handleBatchLock('active')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-[11px] font-bold">
              <Unlock size={14} /> 激活
            </button>
            <button onClick={() => handleBatchLock('locked')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all text-[11px] font-bold">
              <Lock size={14} /> 锁定
            </button>
            <button onClick={handleBatchResetPassword} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-[11px] font-bold">
              <KeyRound size={14} /> 重置密码
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

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-scroll custom-scrollbar relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                    {selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('username')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">用户信息 {sortConfig?.key === 'username' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('role')}>
                  <div className="flex items-center gap-1.5 group-hover:text-zinc-900 transition-colors">角色 {sortConfig?.key === 'role' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 text-center">状态</th>
                <th className="px-6 py-3">最后登录</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedUsers.length > 0 ? paginatedUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 group transition-all ${selectedIds.has(u.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(u.id)} className="p-1">
                      {selectedIds.has(u.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={resolveAvatar(u.avatar, u.id || u.username || u.name)}
                          className="w-9 h-9 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800 shadow-sm"
                          alt=""
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = buildAvatarUrl(u.id || u.username || u.name);
                          }}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center bg-zinc-900`}>
                          {u.role === 'admin' && <ShieldCheck size={8} className="text-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 transition-colors">{u.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold tracking-tight">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${u.role === 'admin' ? 'bg-zinc-900 border-zinc-900 text-white' :
                      u.role === 'teacher' ? 'bg-zinc-100 border-zinc-200 text-zinc-900' :
                        'bg-white border-zinc-200 text-zinc-500'
                      }`}>
                      {u.role === 'admin' ? '管理员' : u.role === 'teacher' ? '教师' : '学生'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full border ${u.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' :
                      'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-[9px] font-black uppercase tracking-tight">{u.status === 'active' ? '正常' : '锁定'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                      <Clock size={12} />
                      {u.lastLogin || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleResetPassword(u.id)} title="重置密码" className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><KeyRound size={14} /></button>
                      <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Pencil size={14} /></button>
                      <button onClick={async () => {
                        if (confirm(`确定要删除用户 "${u.name}" 吗？此操作将同时删除关联的学生/教师档案，无法撤销！`)) {
                          try {
                            await deleteUser(u.id);
                          } catch (err) {
                            alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
                          }
                        }
                      }} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <UsersRound size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配用户</p>
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
            <span>共 {processedUsers.length} 个用户</span>
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-zinc-100">新增用户账户</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">User Account Provisioning</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-12">
              <div className="flex flex-col items-center gap-4 shrink-0 pt-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-zinc-100 dark:border-zinc-800 shadow-xl">
                    <img
                      src={previewUrl || resolveAvatar(newUser.avatar, newUser.username || newUser.name)}
                      className="w-full h-full object-cover"
                      alt="Avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = buildAvatarUrl(newUser.username || newUser.name);
                      }}
                    />
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    <Camera size={28} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-100 dark:border-zinc-700"
                    title="随机头像"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">用户头像</p>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tight leading-tight">点击更换或随机生成</p>
                </div>
              </div>

              <div className="flex-1 space-y-8 px-2">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">基本信息</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">真实姓名 <span className="text-rose-500">*</span></label>
                      <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm placeholder:font-normal" placeholder="输入姓名" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">学号/工号 <span className="text-rose-500">*</span></label>
                      <input required className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm placeholder:font-normal" placeholder="例如: S20240001 或 T20240001" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">电子邮箱</label>
                      <input type="email" className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm placeholder:font-normal" placeholder="user@school.edu (可选)" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">初始密码 <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                        <input required type="password" className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="密码 (至少6位)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">权限与状态</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">系统角色</label>
                      <select
                        className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm ${modalMode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        value={newUser.role}
                        onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })}
                        disabled={modalMode === 'edit'}
                      >
                        <option value="student">学生 Student</option>
                        <option value="teacher">教师 Teacher</option>
                        <option value="admin">管理员 Admin</option>
                      </select>
                      {modalMode === 'edit' && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 ml-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          编辑时不可更改用户角色
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">账户状态</label>
                      <select className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={newUser.status} onChange={e => setNewUser({ ...newUser, status: e.target.value as any })}>
                        <option value="active">正常 Active</option>
                        <option value="locked">锁定 Locked</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">取消</button>
              <button type="submit" disabled={isUploading} onClick={(e) => handleSaveUser(e as any)} className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                {isUploading ? '正在上传...' : '保存用户'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Password Reset Modal */}
      {resetModal.open && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-8 pb-4 flex flex-col items-center text-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${resetSuccess ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-zinc-900 text-white shadow-zinc-200 dark:shadow-none'}`}>
                {resetSuccess ? <Check size={32} /> : <KeyRound size={32} />}
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-zinc-100">{resetModal.isBatch ? '批量重置密码' : '重置登入密码'}</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  {resetModal.isBatch ? `正在为 ${selectedIds.size} 个账户重置密匙` : 'Secure Key Regeneration'}
                </p>
              </div>
            </div>

            <div className="px-8 py-4 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">新安全密码</label>
                <div className="relative group">
                  <input
                    type="text"
                    className="w-full pl-4 pr-24 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-mono text-sm tracking-wider"
                    value={resetPasswordValue}
                    onChange={e => setResetPasswordValue(e.target.value)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={generateRandomPassword}
                      className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all"
                      title="随机生成"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resetPasswordValue);
                        alert('密码已复制到剪贴板');
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all"
                      title="复制"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tight ml-1 leading-tight">请务必告知用户新密码，系统将以加密形式存储</p>
              </div>
            </div>

            <div className="p-8 flex gap-3">
              <button
                onClick={() => setResetModal({ open: false })}
                className="flex-1 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmResetPassword}
                disabled={resetSuccess}
                className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${resetSuccess ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white hover:bg-black dark:hover:bg-zinc-800'}`}
              >
                {resetSuccess ? <Check size={18} /> : <Save size={18} />}
                {resetSuccess ? '重置成功' : '确认重置'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const AdminCoursesPage: React.FC = () => {
  const { courses, teachers, students, addCourse, deleteCourse, updateCourse, refreshData } = useData();
  const showToast = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Course; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({
    name: '', id: '', teacher: '', credits: 2, maxCapacity: 60, schedule: '', location: '', enrolled: 0
  });

  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<Course | null>(null);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [moveTargetCourseId, setMoveTargetCourseId] = useState('');
  const teacherOptions = useMemo(
    () => Array.from(new Set(teachers.map(t => t.name))).filter(Boolean),
    [teachers]
  );

  // Derived Data
  const processedCourses = useMemo(() => {
    let result = [...courses];
    if (teacherFilter) {
      result = result.filter(c => c.teacher === teacherFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower) ||
        c.teacher.toLowerCase().includes(lower)
      );
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
  }, [courses, teacherFilter, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourses = processedCourses.slice(startIndex, startIndex + itemsPerPage);

  // Handlers
  const handleRequestSort = (key: keyof Course) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCourses.length) setSelectedIds(new Set());
    else {
      const newSelected = new Set(selectedIds);
      paginatedCourses.forEach(c => newSelected.add(c.id));
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
    if (confirm(`确定要删除选中的 ${selectedIds.size} 门课程吗？`)) {
      selectedIds.forEach(id => deleteCourse(id));
      setSelectedIds(new Set());
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这门课程吗？操作不可恢复。')) {
      deleteCourse(id);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      name: '',
      id: '',
      teacher: '',
      teacherId: '', // Ensure teacherId is explicitly cleared so validation works
      credits: 2,
      maxCapacity: 60,
      schedule: '',
      location: '',
      enrolled: 0,
      teacherAvatar: buildAvatarUrl('teacher')
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const loadCourseStudents = async (courseId: string) => {
    const resp = await coursesApi.getStudents(courseId);
    setEnrolledStudentsList((resp || []).map(normalizeCourseStudent));
  };

  const handleOpenStudents = async (course: Course) => {
    setSelectedCourseForStudents(course);
    setIsStudentsModalOpen(true);
    setStudentsLoading(true);
    try {
      await loadCourseStudents(course.id);
    } catch (err: any) {
      showToast(err.message || '获取选课名单失败', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const availableStudents = useMemo(() => {
    if (!selectedCourseForStudents) return [];
    const enrolledIds = new Set(enrolledStudentsList.map(s => s.id));
    const kw = candidateKeyword.trim().toLowerCase();
    return students
      .filter(s => !enrolledIds.has(s.id))
      .filter(s => {
        if (!kw) return true;
        return s.name.toLowerCase().includes(kw) || s.studentNumber.toLowerCase().includes(kw);
      });
  }, [selectedCourseForStudents, enrolledStudentsList, students, candidateKeyword]);

  const handleAddExistingStudent = async (studentId: string) => {
    if (!selectedCourseForStudents) return;
    try {
      await coursesApi.enrollStudent(selectedCourseForStudents.id, studentId);
      await loadCourseStudents(selectedCourseForStudents.id);
      await refreshData();
      showToast('已移入课程', 'success');
    } catch (err: any) {
      showToast(err.message || '移入课程失败', 'error');
    }
  };

  const handleRemoveFromCourse = async (studentId: string) => {
    if (!selectedCourseForStudents) return;
    if (!confirm('确定将该学生移出当前课程吗？')) return;
    try {
      await coursesApi.dropStudent(selectedCourseForStudents.id, studentId);
      await loadCourseStudents(selectedCourseForStudents.id);
      await refreshData();
      showToast('已移出课程', 'success');
    } catch (err: any) {
      showToast(err.message || '移出课程失败', 'error');
    }
  };

  const openMoveStudentCourse = (student: Student) => {
    setMovingStudent(student);
    setMoveTargetCourseId(selectedCourseForStudents?.id || '');
  };

  const handleConfirmMoveCourse = async () => {
    if (!selectedCourseForStudents || !movingStudent || !moveTargetCourseId) return;
    if (moveTargetCourseId === selectedCourseForStudents.id) {
      setMovingStudent(null);
      return;
    }
    try {
      await coursesApi.dropStudent(selectedCourseForStudents.id, movingStudent.id);
      await coursesApi.enrollStudent(moveTargetCourseId, movingStudent.id);
      await loadCourseStudents(selectedCourseForStudents.id);
      await refreshData();
      setMovingStudent(null);
      showToast('已完成换课', 'success');
    } catch (err: any) {
      showToast(err.message || '换课失败', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!formData.name?.trim()) {
      showToast('课程名称不能为空', 'error');
      return;
    }
    if (!formData.teacherId?.trim()) {
      showToast('请选择授课教师', 'error');
      return;
    }

    try {
      if (modalMode === 'create') {
        const newCourse = {
          ...formData,
          id: formData.id || 'C' + Date.now().toString().slice(-4),
          teacherAvatar: formData.teacherAvatar || buildAvatarUrl(formData.teacher || 'teacher'),
          enrolled: 0
        } as Course;
        await addCourse(newCourse);
        showToast('新课程已成功开设备案', 'success');
      } else {
        if (editingCourse) {
          await updateCourse({ ...editingCourse, ...formData } as Course);
          showToast('课程信息已更新', 'success');
        }
      }
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error.message || '保存失败，请检查填写内容', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900">

      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row items-center gap-3 min-h-[72px]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="搜索课程名称、讲师或 ID..."
            className="w-full pl-10 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
          >
            <option value="">全部教师</option>
            {teacherOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button onClick={() => { setSearchTerm(''); setTeacherFilter(''); setSortConfig(null); }} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden lg:block" />
          <button onClick={handleOpenCreate} className="flex-1 lg:flex-none px-4 h-9 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md hover:bg-black transition-all">
            <Plus size={14} /> 开启新课
          </button>
        </div>
      </div>

      {/* Batch Actions (Floating) - Adapted to Theme */}
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

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex-1 overflow-y-scroll custom-scrollbar relative">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="p-1">
                    {selectedIds.size === paginatedCourses.length && paginatedCourses.length > 0 ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('name')}>
                  <div className="flex items-center gap-1.5">课程信息 {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">授课教师</th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('credits')}>
                  <div className="flex items-center gap-1.5">学分 {sortConfig?.key === 'credits' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer group" onClick={() => handleRequestSort('enrolled')}>
                  <div className="flex items-center gap-1.5">选课人数 {sortConfig?.key === 'enrolled' ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}</div>
                </th>
                <th className="px-6 py-3">时间与地点</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedCourses.length > 0 ? paginatedCourses.map((c) => (
                <tr key={c.id} className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-900/10 group transition-all ${selectedIds.has(c.id) ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''}`}>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(c.id)} className="p-1">
                      {selectedIds.has(c.id) ? <CheckSquare size={16} className="text-zinc-900" /> : <Square size={16} className="text-zinc-200 dark:text-zinc-700 hover:text-zinc-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg flex items-center justify-center font-black text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 transition-colors">{c.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">ID: {c.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={resolveAvatar(c.teacherAvatar, c.teacher || 'teacher')}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = buildAvatarUrl(c.teacher || 'teacher');
                        }}
                      />
                      <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">{c.teacher}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{c.credits}</span>
                  </td>
                  <td className="px-6 py-3 cursor-pointer group/stat" onClick={() => handleOpenStudents(c)}>
                    <div className="flex items-center gap-2 relative">
                      <div className="w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden group-hover/stat:ring-2 ring-zinc-300 dark:ring-zinc-600 transition-all">
                        <div className="h-full bg-zinc-900 group-hover/stat:bg-blue-600 transition-colors" style={{ width: `${(c.enrolled / c.maxCapacity) * 100}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 group-hover/stat:text-blue-600 transition-colors">{c.enrolled}/{c.maxCapacity}</span>

                      {/* Tooltip to indicate clickability */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                        点击查看学生名单
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <p>{c.schedule || '时间待定'}</p>
                      <p className="text-zinc-400 mt-0.5">{c.location || '地点待定'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenStudents(c)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Eye size={14} /></button>
                      <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-white dark:hover:bg-zinc-800 rounded-md"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <BookOpen size={32} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">未找到匹配课程</p>
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
            <span>共 {processedCourses.length} 门课程</span>
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
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                  {modalMode === 'create' ? <Plus size={20} /> : <Pencil size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '开设新课程' : (modalMode === 'edit' ? '编辑课程信息' : '课程详情')}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Academic Course Management</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Section: 基本信息 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">课程基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">课程名称 <span className="text-rose-500">*</span></label>
                    <input required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 高级算法设计" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">课程代码</label>
                    <input disabled className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none text-zinc-400 font-bold text-sm cursor-not-allowed" placeholder="系统自动生成" value={formData.id} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">学分</label>
                    <input type="number" min="1" max="10" step="1" required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.credits} onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Section: 教学安排 */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">教学安排与资源</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">授课教师 <span className="text-rose-500">*</span></label>
                    {modalMode === 'view' ? (
                      <input disabled className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.teacher} />
                    ) : (
                      <select
                        required
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm"
                        value={formData.teacherId || ''}
                        onChange={e => {
                          const selectedTeacher = teachers.find(t => t.id === e.target.value);
                          if (selectedTeacher) {
                            setFormData({
                              ...formData,
                              teacherId: selectedTeacher.id,
                              teacher: selectedTeacher.name,
                              teacherAvatar: selectedTeacher.avatar
                            });
                          }
                        }}
                      >
                        <option value="">选择教师 Select Teacher</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">课容量 (Max)</label>
                    <input type="number" min="1" required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.maxCapacity} onChange={e => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">上课时间</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input disabled={modalMode === 'view'} className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 周一 08:00 - 10:00" value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">上课地点</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input disabled={modalMode === 'view'} className="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="例如: 教学楼 A-101" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Readout (View/Edit Only) */}
              {(modalMode === 'view' || modalMode === 'edit') && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-600" />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">当前选课: {formData.enrolled} 人</span>
                  </div>
                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700"></div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${(formData.enrolled || 0) >= (formData.maxCapacity || 0) ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{(formData.enrolled || 0) >= (formData.maxCapacity || 0) ? '名额已满' : '可选课'}</span>
                  </div>
                </div>
              )}
            </form>

            <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">
                {modalMode === 'view' ? '关闭' : '取消'}
              </button>
              {modalMode !== 'view' && (
                <button type="submit" onClick={(e) => handleSave(e as any)} className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Save size={16} /> 保存
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Students List Modal */}
      {isStudentsModalOpen && selectedCourseForStudents && createPortal(
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                  <BookOpen className="text-blue-600" size={28} /> {selectedCourseForStudents.name} 学生名单
                </h3>
                <p className="text-sm font-bold text-zinc-500 mt-2">授课教师: {selectedCourseForStudents.teacher} • 总容量: {selectedCourseForStudents.maxCapacity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddExistingOpen(v => !v)}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-black tracking-widest hover:bg-black transition-colors"
                >
                  移入现有学生
                </button>
                <button onClick={() => setIsStudentsModalOpen(false)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900">
              {isAddExistingOpen && (
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
                  <div className="max-h-44 overflow-y-auto space-y-2">
                    {availableStudents.slice(0, 40).map(student => (
                      <div key={student.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700">
                        <div className="text-xs">
                          <div className="font-bold text-zinc-800 dark:text-zinc-100">{student.name} <span className="text-zinc-400">({student.studentNumber})</span></div>
                          <div className="text-zinc-500">当前班级：{(student as any).className || classes.find(c => c.id === student.class)?.name || '未分班'}</div>
                        </div>
                        <button
                          onClick={() => handleAddExistingStudent(student.id)}
                          className="px-3 py-1.5 text-[11px] font-black rounded-lg bg-zinc-900 text-white hover:bg-black transition-colors"
                        >
                          移入本课
                        </button>
                      </div>
                    ))}
                    {availableStudents.length === 0 && (
                      <div className="text-xs text-zinc-400 py-4 text-center">暂无可移入学生</div>
                    )}
                  </div>
                </div>
              )}

              {studentsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-50">
                  <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mb-4"></div>
                  <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">加载中...</p>
                </div>
              ) : enrolledStudentsList.length > 0 ? (
                <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">姓名</th>
                        <th className="px-4 py-3">学号</th>
                        <th className="px-4 py-3">班级</th>
                        <th className="px-4 py-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {enrolledStudentsList.map(student => (
                        <tr key={student.id} className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                            <img
                              src={resolveAvatar(student.avatar, student.id || student.studentNumber || student.name)}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover bg-zinc-100 dark:bg-zinc-700"
                              onError={(e) => { (e.target as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name); }}
                            />
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 font-mono">{student.studentNumber}</td>
                          <td className="px-4 py-3 text-zinc-500">{(student as any).className || classes.find(c => c.id === student.class)?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openMoveStudentCourse(student)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="改换课程"><Pencil size={14} /></button>
                              <button onClick={() => handleRemoveFromCourse(student.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="移出课程"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center opacity-50">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">暂无选课学生</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end shrink-0">
              <button onClick={() => setIsStudentsModalOpen(false)} className="px-8 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                关闭名单
              </button>
            </div>

            {movingStudent && (
              <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5 space-y-4">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">改换课程</div>
                  <div className="text-xs text-zinc-500">学生：{movingStudent.name}（{movingStudent.studentNumber}）</div>
                  <select
                    value={moveTargetCourseId}
                    onChange={e => setMoveTargetCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm"
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setMovingStudent(null)} className="px-4 py-2 text-xs font-black rounded-lg border border-zinc-200 dark:border-zinc-700">取消</button>
                    <button onClick={handleConfirmMoveCourse} className="px-4 py-2 text-xs font-black rounded-lg bg-zinc-900 text-white">确认换课</button>
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

export const AdminLogsPage: React.FC = () => {
  const { activities, refreshData } = useData();
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'auth' | 'data' | 'security' | 'system' | 'ai'>('all');
  const [keyword, setKeyword] = React.useState('');
  const [range, setRange] = React.useState<'all' | '7d' | '30d'>('all');
  const [selectedActivity, setSelectedActivity] = React.useState<Activity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const categories: Array<{ key: typeof selectedCategory; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'auth', label: '登录' },
    { key: 'data', label: '操作' },
    { key: 'security', label: '安全' },
    { key: 'system', label: '系统' },
    { key: 'ai', label: 'AI' },
  ];
  const todayISO = new Date().toISOString().slice(0, 10);
  const filteredActivities = React.useMemo(() => {
    let result = selectedCategory === 'all'
      ? activities
      : activities.filter((activity) => activity.category === selectedCategory);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      result = result.filter((activity) =>
        activity.user.toLowerCase().includes(k)
        || activity.action.toLowerCase().includes(k)
        || activity.target.toLowerCase().includes(k)
      );
    }
    return result;
  }, [activities, selectedCategory, keyword]);

  const dateRangeParams = React.useMemo(() => {
    if (range === 'all') return {};
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (range === '7d' ? 7 : 30));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: todayISO,
    };
  }, [range, todayISO]);

  const applyFilters = React.useCallback(async () => {
    await refreshData({
      activitiesParams: {
        keyword: keyword.trim() || undefined,
        category: selectedCategory,
        ...dateRangeParams,
      },
    });
  }, [refreshData, keyword, selectedCategory, dateRangeParams]);

  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleExport = async () => {
    try {
      const blob = await activitiesApi.exportCsv({
        keyword: keyword.trim() || undefined,
        category: selectedCategory,
        ...dateRangeParams,
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `monitor-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="h-full w-full flex flex-col animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
        <div className="px-0 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3 lg:ml-6">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400/50 ${
                    selectedCategory === category.key
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              {[
                { key: 'all', label: '全部' },
                { key: '7d', label: '近7天' },
                { key: '30d', label: '近30天' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key as typeof range)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400/50 ${
                    range === item.key
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={handleExport} className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">全量导出 (CSV)</button>
          </div>
          <div className="relative lg:ml-auto lg:mr-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索用户/动作/目标"
              className="h-9 w-56 rounded-full bg-zinc-100/80 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-medium text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/50"
            />
          </div>
        </div>
        <div className="flex-1 divide-y divide-zinc-50 dark:divide-zinc-800 custom-scrollbar overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <History size={24} className="text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest">暂无日志记录</p>
              <p className="text-xs mt-2 text-zinc-400 dark:text-zinc-500">执行新增、修改或删除操作后将在此显示记录</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-6 flex items-start gap-6 hover:bg-zinc-50/30 dark:hover:bg-zinc-800/20 transition-all group cursor-pointer"
                onClick={() => { setSelectedActivity(activity); setIsDrawerOpen(true); }}
              >
                <div className="w-12 text-center pt-1 shrink-0"><p className="text-[10px] font-black text-zinc-400 uppercase leading-none">{activity.time.replace('前', '')}</p><p className="text-[10px] font-black text-zinc-300 uppercase mt-1">AGO</p></div>
                <div className={`p-2.5 rounded-xl shrink-0 ${activity.level === 'warning' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : activity.level === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'}`}>
                  <History size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{activity.user}</span>
                    <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md uppercase">{activity.category}</span>
                    <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">IP: 10.0.8.*</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium truncate">执行了 <span className={`font-bold ${activity.level === 'warning' ? 'text-rose-600' : 'text-zinc-900 dark:text-zinc-100'}`}>{activity.action}</span> 操作，目标标识：<span className="font-bold text-zinc-900 dark:text-zinc-200">{activity.target}</span></p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setIsDrawerOpen(true); }}
                  className="px-4 py-2 border border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-900 hover:text-white transition-all"
                >
                  详情
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`fixed inset-0 z-[80] transition-opacity duration-200 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
        <aside className={`absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">日志详情</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">监控日志</h3>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">×</button>
          </div>
          {selectedActivity ? (
            <div className="p-6 space-y-4 text-sm text-zinc-700 dark:text-zinc-200 overflow-y-auto">
              {[
                { label: '用户', value: selectedActivity.user },
                { label: '动作', value: selectedActivity.action },
                { label: '目标', value: selectedActivity.target },
                { label: '类别', value: selectedActivity.category },
                { label: '等级', value: selectedActivity.level },
                { label: '时间', value: selectedActivity.time },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[64px_1fr] gap-3 items-start">
                  <span className="text-xs font-bold text-zinc-400 uppercase">{item.label}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 break-words">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-zinc-400">未选择日志</div>
          )}
        </aside>
      </div>
    </div>
  );
};
  const normalizeCourseStudent = (s: any): Student => ({
    ...s,
    class: s.class || s.classId || ''
  });
