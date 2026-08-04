import React, { useState, useEffect, useMemo } from 'react';
import {
    Bell,
    Plus,
    Trash2,
    Search,
    Send,
    X,
    Info,
    CheckCircle2,
    AlertCircle,
    Clock,
    Filter,
    RefreshCw,
    User,
    ChevronDown,
    UserSquare
} from 'lucide-react';
import { notificationsApi } from '../services/api';
import { Notification, User as UserType } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { useToast } from '../contexts/ToastContext';
import { useData } from '../contexts/DataContext';

const TYPE_META: Record<Notification['type'], { label: string; icon: any; color: string }> = {
    TEACHING: { label: '教学通知', icon: Info, color: 'text-indigo-500' },
    EXAM: { label: '考试安排', icon: Clock, color: 'text-violet-500' },
    STUDENT_AFFAIRS: { label: '学工事务', icon: User, color: 'text-sky-500' },
    ACTIVITY: { label: '活动公告', icon: CheckCircle2, color: 'text-emerald-500' },
    MAINTENANCE: { label: '系统维护', icon: AlertCircle, color: 'text-amber-500' },
    EMERGENCY: { label: '紧急通知', icon: X, color: 'text-rose-500' },
    INFO: { label: '系统信息', icon: Info, color: 'text-blue-500' },
    SUCCESS: { label: '系统成功', icon: CheckCircle2, color: 'text-emerald-500' },
    WARNING: { label: '系统警告', icon: AlertCircle, color: 'text-amber-500' },
    ERROR: { label: '系统错误', icon: X, color: 'text-rose-500' }
};

const PUBLISH_TYPES: Notification['type'][] = [
    'TEACHING',
    'EXAM',
    'STUDENT_AFFAIRS',
    'ACTIVITY',
    'MAINTENANCE',
    'EMERGENCY'
];

const FILTER_TYPES: Array<'ALL' | Notification['type']> = ['ALL', ...PUBLISH_TYPES, 'INFO', 'SUCCESS', 'WARNING', 'ERROR'];

const NotificationManage: React.FC = () => {
    const { users } = useData();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const showToast = useToast();

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'TEACHING' as Notification['type'],
        targetType: 'ALL' as 'ALL' | 'ROLE' | 'USER',
        targetRole: 'STUDENT',
        targetUser: ''
    });

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await notificationsApi.getAll();
            setNotifications(data);
        } catch (error) {
            showToast('获取通知失败', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            message: '',
            type: 'TEACHING',
            targetType: 'ALL',
            targetRole: 'STUDENT',
            targetUser: ''
        });
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const matchSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                n.message.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = filterType === 'ALL' || n.type === filterType;
            return matchSearch && matchType;
        });
    }, [notifications, searchTerm, filterType]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await notificationsApi.create({
                title: formData.title,
                message: formData.message,
                type: formData.type,
                userId: formData.targetType === 'USER' && formData.targetUser ? formData.targetUser : undefined,
                targetRole: formData.targetType === 'ROLE' ? formData.targetRole : undefined
            });
            showToast('发布成功', 'success');
            setIsModalOpen(false);
            resetForm();
            fetchNotifications();
            window.dispatchEvent(new CustomEvent('notification-updated'));
        } catch (error) {
            showToast('发布失败', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除该通知吗？')) return;
        try {
            await notificationsApi.delete(id);
            showToast('删除成功', 'success');
            fetchNotifications();
        } catch (error) {
            showToast('删除失败', 'error');
        }
    };

    const getTypeIcon = (type: Notification['type']) => {
        const meta = TYPE_META[type] || TYPE_META.INFO;
        const Icon = meta.icon;
        return <Icon className={meta.color} size={16} />;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex-none p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                        <Bell className="text-zinc-900 dark:text-zinc-100" size={24} />
                        通知公告管理
                    </h2>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">System Notifications & Announcements</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-zinc-200 dark:shadow-none active:scale-95"
                >
                    <Plus size={16} /> 发布新公告
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex-none p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索通知标题或内容..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 h-9">
                        {FILTER_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black tracking-widest transition-all ${filterType === type
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                    }`}
                            >
                                {type === 'ALL' ? '全部' : (TYPE_META[type as Notification['type']]?.label || type)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchNotifications}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-900"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent mb-4"></div>
                        <p className="text-xs font-black uppercase tracking-widest">正在加载数据...</p>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((n) => (
                        <div key={n.id} className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-50 dark:bg-zinc-800">
                                        {getTypeIcon(n.type)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-1">{n.title}</h4>
                                        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">{n.message}</p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                                <Clock size={12} />
                                                {new Date(n.createdAt).toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                                <Filter size={12} />
                                                类型: {TYPE_META[n.type]?.label || n.type}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                                                <User size={12} />
                                                对象: {n.userId ? `用户: ${n.userId}` : n.targetRole ? `角色: ${n.targetRole}` : '全校范围'}
                                            </div>
                                            {n.read && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-tight">
                                                    <CheckCircle2 size={12} /> 已读
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(n.id)}
                                    className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <Bell size={32} className="text-zinc-300" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">暂无符合条件的通知</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">发布新通知</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Broadcast New Message</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X className="text-zinc-400" size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">通知标题</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs font-bold dark:text-zinc-100"
                                    placeholder="输入通知主题..."
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">详细内容</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs resize-none dark:text-zinc-100"
                                    placeholder="输入公告具体内容..."
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">公告类型</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PUBLISH_TYPES.map((key) => {
                                        const meta = TYPE_META[key];
                                        const Icon = meta.icon;
                                        const active = formData.type === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: key })}
                                                className={`px-2 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                                    active
                                                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                                                        : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                                                }`}
                                            >
                                                <Icon size={12} className={active ? '' : meta.color} />
                                                {meta.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4 p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                                <div className="flex p-1">
                                    {(['ALL', 'ROLE', 'USER'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, targetType: t })}
                                            className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.targetType === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-500'}`}
                                        >
                                            {t === 'ALL' ? '全部' : t === 'ROLE' ? '按角色' : '特定成员'}
                                        </button>
                                    ))}
                                </div>

                                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                    {formData.targetType === 'ALL' && (
                                        <p className="text-[10px] text-center text-zinc-400 font-bold uppercase py-2">全校师生将收到此通知</p>
                                    )}
                                    {formData.targetType === 'ROLE' && (
                                        <div className="flex gap-2">
                                            {['STUDENT', 'TEACHER', 'ADMIN'].map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, targetRole: r })}
                                                    className={`flex-1 py-2 rounded-xl border text-[10px] font-black transition-all ${formData.targetRole === r ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-400 border-zinc-200'}`}
                                                >
                                                    {r === 'STUDENT' ? '学生' : r === 'TEACHER' ? '教师' : '管理员'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {formData.targetType === 'USER' && (
                                        <div className="relative">
                                            <div
                                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-all dark:text-zinc-100"
                                            >
                                                {formData.targetUser ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-lg bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center">
                                                            <UserSquare size={12} className="text-zinc-500" />
                                                        </div>
                                                        <span>{users.find(u => u.id === formData.targetUser)?.name || formData.targetUser}</span>
                                                        <span className="text-[10px] text-zinc-400 font-normal">({formData.targetUser})</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-400 font-normal">选择目标成员...</span>
                                                )}
                                                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            {isUserDropdownOpen && (
                                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <div className="p-2 border-b border-zinc-50 dark:border-zinc-700/50">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl">
                                                            <Search size={12} className="text-zinc-400" />
                                                            <input
                                                                type="text"
                                                                className="bg-transparent border-none outline-none text-[10px] w-full font-bold placeholder:font-normal dark:text-zinc-100"
                                                                placeholder="通过姓名、ID 或 用户名搜索..."
                                                                value={userSearchTerm}
                                                                onChange={e => setUserSearchTerm(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                        {users.filter(u =>
                                                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                            u.id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                            u.username.toLowerCase().includes(userSearchTerm.toLowerCase())
                                                        ).slice(0, 50).map(user => (
                                                            <button
                                                                key={user.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, targetUser: user.id });
                                                                    setIsUserDropdownOpen(false);
                                                                    setUserSearchTerm('');
                                                                }}
                                                                className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${formData.targetUser === user.id ? 'bg-zinc-50 dark:bg-zinc-700/50' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-xl bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center overflow-hidden">
                                                                        <img
                                                                            src={resolveAvatar(user.avatar, user.id || user.username || user.name)}
                                                                            className="w-full h-full object-cover"
                                                                            alt=""
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = buildAvatarUrl(user.id || user.username || user.name);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{user.name}</p>
                                                                        <p className="text-[8px] text-zinc-400 font-black uppercase tracking-tighter">@{user.username}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{user.role}</p>
                                                                    <p className="text-[7px] text-zinc-400 mt-0.5">ID: {user.id}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Send size={16} /> 立即发布通知
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
            `}</style>
        </div>
    );
};

export default NotificationManage;
