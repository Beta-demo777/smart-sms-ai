import React from 'react';
import { CheckCircle2, GraduationCap, Trash2, X } from 'lucide-react';

interface StudentBatchActionBarProps {
    selectedCount: number;
    onBatchStatus: (status: '在读' | '休学' | '毕业') => void;
    onBatchDelete: () => void;
    onClearSelection: () => void;
}

export const StudentBatchActionBar: React.FC<StudentBatchActionBarProps> = ({
    selectedCount,
    onBatchStatus,
    onBatchDelete,
    onClearSelection
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[80] 
      bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 
      shadow-2xl shadow-zinc-200/50 dark:shadow-black/50
      pl-6 pr-4 py-3 rounded-full flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-zinc-900 dark:bg-zinc-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm shadow-zinc-200 dark:shadow-none">
                    {selectedCount}
                </div>
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">已选定</span>
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700"></div>

            <div className="flex gap-1">
                <button onClick={() => onBatchStatus('在读')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-[11px] font-bold">
                    <CheckCircle2 size={14} /> 激活
                </button>
                <button onClick={() => onBatchStatus('毕业')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all text-[11px] font-bold">
                    <GraduationCap size={14} /> 结业
                </button>
                <button onClick={onBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all text-[11px] font-bold">
                    <Trash2 size={14} /> 删除
                </button>
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 ml-1"></div>

            <button onClick={onClearSelection} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X size={14} />
            </button>
        </div>
    );
};
