import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    ChevronLeft,
    Save,
    Search,
    User,
    Award,
    AlertCircle
} from 'lucide-react';
import { Exam, Student, Score } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { examsApi, coursesApi, scoresApi } from '../services/api';
import { useData } from '../contexts/DataContext';

interface ScoreRecordProps {
    examId?: string;
    onBack: () => void;
}

const ScoreRecord: React.FC<ScoreRecordProps> = ({ examId, onBack }) => {
    const { currentUser, courses: scopedCourses } = useData();
    const [selectedExamId, setSelectedExamId] = useState<string>(examId || '');
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scores, setScores] = useState<Record<string, { value: string, feedback: string }>>({});
    const [studentSearch, setStudentSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const data = await examsApi.getAll();
                if (currentUser?.role === 'teacher') {
                    const allowedCourseIds = new Set(scopedCourses.map(c => c.id));
                    setExams((data || []).filter((exam: any) => allowedCourseIds.has(exam.course?.id)));
                } else {
                    setExams(data);
                }
            } catch (e) {
                console.error("Failed to fetch exams", e);
            }
        };
        fetchExams();
    }, [currentUser?.role, scopedCourses]);

    useEffect(() => {
        if (!selectedExamId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const exam = exams.find(e => e.id === selectedExamId);
                // If exams not loaded yet, wait.
                if (!exam) return;

                const [enrolledStudents, existingScores] = await Promise.all([
                    coursesApi.getStudents(exam.course.id),
                    scoresApi.getByExam(selectedExamId)
                ]);

                setStudents(enrolledStudents);

                const scoreMap: Record<string, { value: string, feedback: string }> = {};
                if (Array.isArray(existingScores)) {
                    (existingScores as Score[]).forEach((s) => {
                        if (s.student && s.student.id) {
                            scoreMap[s.student.id] = {
                                value: String(s.scoreValue),
                                feedback: s.feedback || ''
                            };
                        }
                    });
                }
                setScores(scoreMap);

            } catch (error) {
                console.error("Failed to load gradebook data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (exams.length > 0) {
            fetchData();
        }
    }, [selectedExamId, exams]);

    const handleScoreChange = (studentId: string, value: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], value }
        }));
        setSaveStatus('idle');
    };

    const handleFeedbackChange = (studentId: string, feedback: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], feedback }
        }));
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            const promises = Object.entries(scores).map(([studentId, data]) => {
                // Allow saving empty value if feedback exists? Or skip.
                // If value is empty string, we might want to skip or delete score?
                // For now, only save if value is present.
                if (!data.value) return null;
                return scoresApi.recordScore(selectedExamId, studentId, Number(data.value), data.feedback);
            }).filter(Boolean);

            await Promise.all(promises);
            setSaveStatus('saved');
        } catch (error) {
            console.error("Failed to save scores", error);
            setSaveStatus('error');
        }
    };

    const selectedExam = exams.find(e => e.id === selectedExamId);
    const selectedCourse = selectedExam ? scopedCourses.find(c => c.id === selectedExam.course?.id) : null;
    const selectedTeacherName = selectedCourse?.teacher
        || (selectedExam?.course as any)?.teacher?.name
        || (typeof (selectedExam?.course as any)?.teacher === 'string' ? (selectedExam?.course as any)?.teacher : null)
        || '待分配';
    const filteredStudents = useMemo(() => {
        const keyword = studentSearch.trim().toLowerCase();
        if (!keyword) return students;
        return students.filter((student) =>
            student.name.toLowerCase().includes(keyword) ||
            student.studentNumber.toLowerCase().includes(keyword)
        );
    }, [students, studentSearch]);

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">成绩录入</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                            {selectedExam ? `${selectedExam.title} - ${selectedExam.course?.name || '未知课程'}` : '请选择考试'}
                        </p>
                        {selectedExam && (
                            <p className="text-[11px] font-bold text-zinc-400 mt-1">授课教师：{selectedTeacherName}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saveStatus === 'saved' && (
                        <span className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-in fade-in">
                            <CheckCircle2 size={14} /> 已保存
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saveStatus === 'saving' || !selectedExamId}
                        className="flex items-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl font-bold text-sm h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saveStatus === 'saving' ? '保存中...' : (
                            <>
                                <Save size={16} /> 保存成绩
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                <div className="w-80 flex flex-col gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm h-full overflow-y-auto custom-scrollbar">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 px-2">选择考试任务</h3>
                        <div className="space-y-2">
                            {exams.map(exam => (
                                <button
                                    key={exam.id}
                                    onClick={() => setSelectedExamId(exam.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedExamId === exam.id
                                        ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 shadow-md ring-1 ring-zinc-900 dark:ring-zinc-100'
                                        : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <p className={`text-sm font-black mb-1 ${selectedExamId === exam.id ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{exam.title}</p>
                                    <p className="text-[10px] text-zinc-400 font-bold">{exam.date}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden relative">
                    {!selectedExamId ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                            <Award size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">请从左侧选择一个考试开始录入</p>
                        </div>
                    ) : isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">学生名单</span>
                                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{students.length}人</span>
                                </div>
                                <div className="relative w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="搜索学生..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="w-full h-8 pl-9 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                <table className="w-full">
                                    <thead className="bg-zinc-50 dark:bg-zinc-950 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-16">#</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">学生信息</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-40">成绩 (分)</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">评语/反馈</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-xs font-bold text-zinc-400">
                                                    未找到匹配学生
                                                </td>
                                            </tr>
                                        ) : filteredStudents.map((student, index) => (
                                            <tr key={student.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                                                <td className="px-6 py-4 text-xs font-bold text-zinc-400">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={resolveAvatar(student.avatar, student.id || student.studentNumber || student.name)}
                                                            className="w-8 h-8 rounded-full bg-zinc-100 object-cover"
                                                            alt=""
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name);
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{student.name}</p>
                                                            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{student.id.toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={selectedExam?.maxScore ?? 100}
                                                            value={scores[student.id]?.value || ''}
                                                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                                            placeholder="-"
                                                            className="w-24 h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center font-black text-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all placeholder:text-zinc-200"
                                                        />
                                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300 pointer-events-none">/ {selectedExam?.maxScore ?? 100}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={scores[student.id]?.feedback || ''}
                                                        onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                                                        placeholder="输入评语..."
                                                        className="w-full h-10 px-4 bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-900 dark:hover:border-zinc-700 dark:focus:border-zinc-100 transition-all outline-none text-sm text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-300"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScoreRecord;
