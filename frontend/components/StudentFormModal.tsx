import React from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Pencil, Save } from 'lucide-react';
import { Student, Class } from '../types';

interface StudentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    modalMode: 'create' | 'edit' | 'view';
    formData: Partial<Student>;
    setFormData: (data: Partial<Student>) => void;
    classes: Class[];
    onSave: (e: React.FormEvent) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
    isOpen,
    onClose,
    modalMode,
    formData,
    setFormData,
    classes,
    onSave
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'create' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`}>
                            {modalMode === 'create' ? <UserPlus size={20} /> : <Pencil size={20} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black dark:text-zinc-100">{modalMode === 'create' ? '录入新学生档案' : (modalMode === 'edit' ? '编辑学生档案' : '查看学生档案')}</h3>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Student Information Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400" /></button>
                </div>

                <form id="student-form" onSubmit={onSave} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Section: 基本信息 */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">基本身份信息</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">学生姓名 <span className="text-rose-500">*</span></label>
                                <input required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="输入姓名" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">官方学号 <span className="text-rose-500">*</span></label>
                                <input required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="如: 2024001" value={formData.studentNumber || ''} onChange={e => setFormData({ ...formData, studentNumber: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">性别</label>
                                <div className="flex gap-4">
                                    {['男', '女'].map(g => (
                                        <label key={g} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border cursor-pointer transition-all ${formData.gender === g ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-500'}`}>
                                            <input type="radio" name="gender" className="hidden" disabled={modalMode === 'view'} required checked={formData.gender === g} onChange={() => setFormData({ ...formData, gender: g as any })} />
                                            <span className="text-xs font-bold">{g}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">年龄</label>
                                <input required type="number" min="10" max="100" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.age ?? ''} onChange={e => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, age: value === '' ? undefined : parseInt(value) });
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Section: 学籍与联系 */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">学籍与联系方式</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">行政班级 <span className="text-rose-500">*</span></label>
                                <select required disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.class || ''} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                                    <option value="">请选择班级...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">电子邮箱</label>
                                <input type="email" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" placeholder="student@example.com" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">入学日期</label>
                                <input type="date" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.enrollmentDate || ''} onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">当前状态</label>
                                <select disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm cursor-pointer" value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="在读">在读 Active</option>
                                    <option value="休学">休学 Suspended</option>
                                    <option value="毕业">毕业 Graduated</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section: 初始指标 (仅 Create 模式或 Edit 显示) */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900/30 pb-2">学业指标 (初始值)</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">初始 GPA</label>
                                <input type="number" step="0.1" min="0" max="4.0" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.gpa ?? ''} onChange={e => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, gpa: value === '' ? undefined : parseFloat(value) });
                                }} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">初始出勤率 (%)</label>
                                <input type="number" min="0" max="100" disabled={modalMode === 'view'} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all dark:text-white font-bold text-sm" value={formData.attendance ?? ''} onChange={e => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, attendance: value === '' ? undefined : parseInt(value) });
                                }} />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-white dark:hover:bg-zinc-800 transition-all">取消</button>
                    {modalMode !== 'view' && (
                        <button type="submit" form="student-form" className="flex-[2] py-3.5 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2">
                            <Save size={16} /> 保存档案
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
