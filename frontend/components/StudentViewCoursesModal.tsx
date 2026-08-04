import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X } from 'lucide-react';
import { Student, Class, Course } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { scoresApi } from '../services/api';

interface StudentViewCoursesModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    classes: Class[];
    courses: Course[];
}

export const StudentViewCoursesModal: React.FC<StudentViewCoursesModalProps> = ({ isOpen, onClose, student, classes, courses }) => {
    const studentId = student?.id;

    const [loadingScores, setLoadingScores] = useState(false);
    const [courseScoreMap, setCourseScoreMap] = useState<Record<string, { avg: number; count: number }>>({});

    useEffect(() => {
        if (!isOpen || !studentId) return;
        let cancelled = false;
        const loadScores = async () => {
            setLoadingScores(true);
            try {
                const scores = await scoresApi.getByStudent(studentId);
                if (cancelled) return;
                const grouped: Record<string, { total: number; count: number }> = {};
                if (Array.isArray(scores)) {
                    scores.forEach((item: any) => {
                        const courseId = item?.exam?.course?.id;
                        const value = Number(item?.scoreValue);
                        if (!courseId || !Number.isFinite(value)) return;
                        grouped[courseId] = grouped[courseId] || { total: 0, count: 0 };
                        grouped[courseId].total += value;
                        grouped[courseId].count += 1;
                    });
                }
                const mapped: Record<string, { avg: number; count: number }> = {};
                Object.entries(grouped).forEach(([courseId, stat]) => {
                    mapped[courseId] = {
                        avg: Number((stat.total / stat.count).toFixed(1)),
                        count: stat.count
                    };
                });
                setCourseScoreMap(mapped);
            } catch {
                if (!cancelled) setCourseScoreMap({});
            } finally {
                if (!cancelled) setLoadingScores(false);
            }
        };
        loadScores();
        return () => { cancelled = true; };
    }, [isOpen, studentId]);

    const enrolledCourses = useMemo(() => {
        const enrolledIds = student?.enrolledCourses || [];
        return courses.filter(c => enrolledIds.includes(c.id));
    }, [student?.enrolledCourses, courses]);

    if (!isOpen || !student) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                            <BookOpen className="text-blue-600" size={28} /> {student.name} 的选修课
                        </h3>
                        <p className="text-sm font-bold text-zinc-500 mt-2">学号: {student.studentNumber} • 行政班级: {classes.find(c => c.id === student.class)?.name || student.class}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900">
                    {(() => {
                        if (enrolledCourses.length === 0) {
                            return (
                                <div className="py-20 flex flex-col items-center justify-center opacity-50">
                                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                        <BookOpen size={32} className="text-zinc-300 dark:text-zinc-600" />
                                    </div>
                                    <p className="text-zinc-400 dark:text-zinc-500 font-black text-sm uppercase tracking-widest">暂未选修任何课程</p>
                                </div>
                            );
                        }

                        return (
                            <div className="grid grid-cols-1 gap-4">
                                {enrolledCourses.map(course => {
                                    const score = courseScoreMap[course.id];
                                    return (
                                    <div key={course.id} className="p-5 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl flex items-center justify-between hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl flex items-center justify-center font-black text-sm border border-zinc-100 dark:border-zinc-800 shrink-0">
                                                {course.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-zinc-900 dark:text-zinc-100 text-sm">{course.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                                                        <img
                                                            src={resolveAvatar(course.teacherAvatar, course.teacher)}
                                                            className="w-3 h-3 rounded-full object-cover"
                                                            alt=""
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = buildAvatarUrl(course.teacher);
                                                            }}
                                                        /> {course.teacher}
                                                    </span>
                                                    <span className="text-zinc-200 dark:text-zinc-700">•</span>
                                                    <span className="text-[10px] font-bold text-zinc-400">{course.credits} 学分</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{course.schedule || '时间待定'}</p>
                                            <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{course.location || '地点待定'}</p>
                                            <p className="text-[11px] font-black mt-1.5">
                                                {loadingScores ? (
                                                    <span className="text-zinc-400">成绩加载中...</span>
                                                ) : score ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                        课程成绩 {score.avg}
                                                        <span className="text-zinc-400 dark:text-zinc-500 font-bold ml-1">({score.count} 次考试)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 dark:text-zinc-500">课程成绩 --</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                        );
                    })()}
                </div>

                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-8 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        关闭课程表
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
