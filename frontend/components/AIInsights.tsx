
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useData } from '../contexts/DataContext';
import { Student } from '../types';
import { buildAvatarUrl, resolveAvatar } from '../utils/avatar';
import { generateStudentReport } from '../services/aiService';
import { BrainCircuit, Sparkles, Loader2, FileText, ChevronRight } from 'lucide-react';

const AIInsights: React.FC = () => {
  const { students } = useData();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(s => {
    const kw = search.toLowerCase();
    return s.name.toLowerCase().includes(kw)
      || (s.studentNumber || '').toLowerCase().includes(kw)
      || s.id.toLowerCase().includes(kw);
  });

  const getStudentAvatar = (student: Student) => {
  return resolveAvatar(student.avatar, student.id || student.studentNumber || student.name);
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent) return;
    setIsLoading(true);
    setReport('');
    try {
      const result = await generateStudentReport(selectedStudent);
      setReport(result);
    } catch (err) {
      setReport('生成报告失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 relative">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BrainCircuit size={16} className="text-zinc-400" />
            AI 智能学术分析
          </h2>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex min-h-0 bg-white dark:bg-zinc-900 overflow-hidden relative z-0">
        {/* Left Panel: Student Selector (Fixed Width) */}
        <div className="w-[300px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
            <input
              type="text"
              placeholder="搜索学生..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-700 outline-none transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => { setSelectedStudent(student); setReport(''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${selectedStudent?.id === student.id
                  ? 'bg-white dark:bg-zinc-800 shadow-md shadow-zinc-200/50 dark:shadow-none'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
              >
                <img
                  src={getStudentAvatar(student)}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = buildAvatarUrl(student.id || student.studentNumber || student.name);
                  }}
                  className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black truncate ${selectedStudent?.id === student.id ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'}`}>
                    {student.name}
                  </p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">
                    学号 {student.studentNumber || '--'} • {student.class}
                  </p>
                </div>
                {selectedStudent?.id === student.id && <ChevronRight size={14} className="text-zinc-900 dark:text-zinc-100 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Report Area (Flexible) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 relative">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-3xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700 mb-2">
                <Sparkles className="text-zinc-300 dark:text-zinc-600" size={32} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">AI 学术分析就绪</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1">请从左侧选择一名学生开始生成深度评估报告。</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-none p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-20 sticky top-0">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={getStudentAvatar(selectedStudent)}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = buildAvatarUrl(selectedStudent.id || selectedStudent.studentNumber || selectedStudent.name);
                      }}
                      className="w-14 h-14 rounded-2xl border-2 border-white dark:border-zinc-800 shadow-md object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white dark:border-zinc-900">
                      GPA {selectedStudent.gpa}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{selectedStudent.name}</h2>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                      学号: {selectedStudent.studentNumber || '--'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black shadow-lg shadow-zinc-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {isLoading ? '正在分析...' : '生成分析报告'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
                {report ? (
                  <div className="max-w-4xl mx-auto">
                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-6 text-zinc-400 text-xs font-black uppercase tracking-widest">
                          <BrainCircuit size={14} /> AI Analysis Report
                        </div>
                        <div className="text-zinc-700 dark:text-zinc-300 leading-8 font-medium text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <BrainCircuit size={64} className="text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-700">等待生成...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
