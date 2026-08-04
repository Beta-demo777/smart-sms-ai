import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    X,
    MessageSquare,
    Send,
    UserCircle2
} from 'lucide-react';
import { LeaveRequest } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { leavesApi } from '../services/api';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

const LeaveApproval: React.FC = () => {
    const { currentUser, profileId } = useData();
    const effectiveReviewerId = profileId || currentUser?.id || '';
    const showToast = useToast();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [history, setHistory] = useState<LeaveRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, activeTab, effectiveReviewerId]);

    const fetchData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const data = await leavesApi.getPendingRequests();
                setRequests(data);
            } else {
                if (!effectiveReviewerId) {
                    setHistory([]);
                    return;
                }
                const data = await leavesApi.getReviewerRequests(effectiveReviewerId);
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch leave requests", error);
            showToast('获取数据失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (request: LeaveRequest, status: 'APPROVED' | 'REJECTED') => {
        setSelectedRequest(request);
        setReviewStatus(status);
        setReviewComment(status === 'APPROVED' ? '同意申请' : '拒绝申请');
    };

    const handleReviewSubmit = async () => {
        if (!selectedRequest || !currentUser || !effectiveReviewerId) return;

        try {
            await leavesApi.reviewRequest(selectedRequest.id, {
                reviewerId: effectiveReviewerId,
                status: reviewStatus,
                comment: reviewComment
            });
            showToast(reviewStatus === 'APPROVED' ? '已批准' : '已拒绝', 'success');
            setSelectedRequest(null);
            fetchData();
        } catch (error) {
            console.error("Failed to review request", error);
            showToast('操作失败', 'error');
        }
    };

    const filteredList = useMemo(() => {
        const list = activeTab === 'pending' ? requests : history;
        if (!searchTerm) return list;
        return list.filter(r =>
            r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.studentId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [requests, history, activeTab, searchTerm]);

    const formatLeaveType = (type: string) => {
        switch (type) {
            case 'SICK': return '病假 (Sick Leave)';
            case 'PERSONAL': return '事假 (Personal)';
            case 'OTHER': return '公假 (Official)';
            default: return type;
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
            {/* Toolbar */}
            <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 h-9 box-border">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-3 h-full flex items-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            待审批 <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === 'pending' ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-100/50 dark:bg-zinc-800/50'}`}>{requests.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-3 h-full flex items-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            审批历史
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                        <input
                            type="text"
                            placeholder="搜索姓名、学号或原因..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 h-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-zinc-100 placeholder:text-zinc-400 w-48"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent dark:border-zinc-100"></div>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-400 flex-col gap-4 opacity-60">
                        <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                            <Clock size={32} className="text-zinc-200 dark:text-zinc-700" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">没有{activeTab === 'pending' ? '待审批' : '历史'}记录</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto">
                            {filteredList.map(request => (
                                <div key={request.id} className="group bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-sm">
                                    <div className="flex items-start gap-5">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">
                                            <img
                                                src={resolveAvatar(request.studentAvatar, request.studentName)}
                                                className="w-full h-full object-cover"
                                                alt=""
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = buildAvatarUrl(request.studentName);
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{request.studentName}</h3>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">ID: {request.studentId}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide
                                                        ${request.type === 'SICK' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                                            request.type === 'PERSONAL' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}
                                                    `}>
                                                        {formatLeaveType(request.type)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">
                                                    <Clock size={12} />
                                                    {request.startDate} 至 {request.endDate}
                                                </div>
                                            </div>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                                {request.reason}
                                            </p>

                                            {/* Action Bar */}
                                            {activeTab === 'pending' ? (
                                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                                                    <button
                                                        onClick={() => handleOpenReview(request, 'APPROVED')}
                                                        className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 dark:shadow-none"
                                                    >
                                                        <CheckCircle2 size={14} /> 批准申请
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenReview(request, 'REJECTED')}
                                                        className="flex-1 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <XCircle size={14} /> 拒绝
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-zinc-50 dark:border-zinc-800/50 flex items-center justify-between">
                                                    <div>
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
                                                            ${request.status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                                                        `}>
                                                            {request.status === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                            {request.status === 'APPROVED' ? '已批准' : '已拒绝'}
                                                        </span>
                                                        {request.reviewComment && (
                                                            <p className="mt-1 text-[11px] text-zinc-500 italic flex items-center gap-1.5">
                                                                <MessageSquare size={10} className="text-zinc-300" />
                                                                "{request.reviewComment}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    {request.reviewerName && <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">BY: {request.reviewerName}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                                    {reviewStatus === 'APPROVED' ? '批准申请' : '拒绝申请'}
                                </h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Review Leave Request</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X className="text-zinc-400" size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">{selectedRequest.studentName}</h4>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-500 font-bold uppercase">{formatLeaveType(selectedRequest.type)}</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed italic">"{selectedRequest.reason}"</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">审核批注 (Review Comment)</label>
                                <textarea
                                    autoFocus
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-xs resize-none dark:text-zinc-100"
                                    placeholder="输入审批意见..."
                                    value={reviewComment}
                                    onChange={e => setReviewComment(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleReviewSubmit}
                                className={`w-full py-4 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${reviewStatus === 'APPROVED' ? 'bg-zinc-900 hover:bg-black' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                                    }`}
                            >
                                <Send size={16} /> 确认提交
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveApproval;
