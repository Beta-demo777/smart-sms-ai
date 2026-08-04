
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Hexagon,
  User as UserIcon,
  MoreVertical,
  Trash2,
  Clock,
  Loader2,
  Settings,
  X,
  Pencil,
  Download,
  Check,
  PanelLeft
} from 'lucide-react';
import { aiApi } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, ChatSession as ApiChatSession, ChatMessage as ApiChatMessage } from '../types';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface StandaloneChatProps {
  user: User;
}

const roleTriggerGuide: Record<User['role'], Array<{ keyword: string; effect: string }>> = {
  student: [
    { keyword: '我的信息 / 学号 / 档案', effect: '返回个人资料（姓名、学号、班级、GPA、出勤率、学籍状态）' },
    { keyword: '我的课程 / 学分 / 我的老师', effect: '返回课程、学分统计和任课老师名单' },
    { keyword: '成绩 / 考勤 / 课表 / 作业 / 请假', effect: '返回对应实时数据或汇总结果' },
  ],
  teacher: [
    { keyword: '我的信息 / 我的课程 / 班级', effect: '返回教师档案与授课课程信息' },
    { keyword: '我的学生 / 学生名单 / 学生情况', effect: '返回授课课程学生名单与人数' },
    { keyword: '学生成绩 / 考勤 / 课表 / 作业', effect: '返回成绩、考勤、排课与作业统计' },
  ],
  admin: [
    { keyword: '我的信息 / 账号信息', effect: '返回管理员账号与角色信息' },
    { keyword: '概览 / 统计 / 看板 / 全局', effect: '返回系统总体数据（学生、教师、课程等）' },
    { keyword: '学生 / 教师 / 课程 + 列表', effect: '返回对应名单与关键字段（按权限范围）' },
    { keyword: '质量 / 工作量 / 风险 / 预警', effect: '返回学生质量分层、教师负载与风险名单分析' },
  ],
};

const StandaloneChat: React.FC<StandaloneChatProps> = ({ user }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [failedSend, setFailedSend] = useState<{ text: string; sessionId: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [activeSession?.messages, isTyping]);

  useEffect(() => {
    // Ensure we land at the latest message when opening/switching a session.
    const raf = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(raf);
  }, [activeSessionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* API Integration */
  useEffect(() => {
    loadSessions();
  }, [user.id]);

  const loadSessions = async () => {
    try {
      const data = await aiApi.getUserSessions(user.id);
      // Map backend data to frontend type
      const mapped: ChatSession[] = data.map((s: any) => ({
        id: s.id,
        title: s.title,
        lastMessage: s.title, // or derive if needed
        timestamp: new Date(s.lastMessageAt || new Date()),
        messages: s.messages?.map((m: any) => ({
          role: m.role === 'MODEL' ? 'ai' : 'user',
          text: m.content,
          timestamp: new Date(m.timestamp)
        })) || []
      }));
      setSessions(mapped);
      if (!activeSessionId && mapped.length > 0) setActiveSessionId(mapped[0].id);
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();

    // Optimistic Update
    const tempMsg: ChatMessage = {
      role: 'user',
      text: userMsg,
      timestamp: new Date()
    };

    const isNewSession = activeSessionId === 'new';

    // Add message to current session (even if it's 'new')
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          lastMessage: userMsg,
          timestamp: new Date(),
          messages: [...s.messages, tempMsg]
        };
      }
      return s;
    }));

    setInput('');
    setIsTyping(true);

    try {
      // If 'new', pass undefined sessionId to backend to create one
      const apiSessionId = isNewSession ? undefined : activeSessionId;
      const res = await aiApi.chat(userMsg, undefined, user.id, apiSessionId);

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: res.response,
        timestamp: new Date()
      };

      if (res.sessionId) {
        if (isNewSession) {
          // Replace 'new' session with real one
          setActiveSessionId(res.sessionId);
          setSessions(prev => prev.map(s => {
            if (s.id === 'new') {
              return {
                ...s,
                id: res.sessionId, // Update ID
                lastMessage: aiMsg.text,
                messages: [...s.messages, aiMsg] // Preserves user msg added above
              };
            }
            return s;
          }));
          // Optionally prompt to rename title from "New Chat" to summarized title?
          // Or reload sessions to get backend's title if backend auto-titles?
          // Backend `chat` sets title? Backend `chat` updates lastMessageAt.
          // Let's reload to be safe, but keep optimistic state for now.
          loadSessions();
        } else {
          // Standard update
          setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                lastMessage: aiMsg.text,
                messages: [...s.messages, aiMsg]
              };
            }
            return s;
          }));
        }
      }

    } catch (error) {
      console.error(error);
      setFailedSend({ text: userMsg, sessionId: activeSessionId });
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async () => {
    if (!failedSend) return;
    setIsTyping(true);
    try {
      const isNewSession = failedSend.sessionId === 'new';
      const apiSessionId = isNewSession ? undefined : failedSend.sessionId;
      const res = await aiApi.chat(failedSend.text, undefined, user.id, apiSessionId);

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: res.response,
        timestamp: new Date()
      };

      if (res.sessionId) {
        if (isNewSession) {
          setActiveSessionId(res.sessionId);
          setSessions(prev => prev.map(s => {
            if (s.id === 'new') {
              return {
                ...s,
                id: res.sessionId,
                lastMessage: aiMsg.text,
                messages: [...s.messages, aiMsg]
              };
            }
            return s;
          }));
          loadSessions();
        } else {
          setSessions(prev => prev.map(s => {
            if (s.id === failedSend.sessionId) {
              return {
                ...s,
                lastMessage: aiMsg.text,
                messages: [...s.messages, aiMsg]
              };
            }
            return s;
          }));
        }
      }
      setFailedSend(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: 'new',
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date(),
      messages: []
    };
    // Prepend to sessions
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId('new');
  };

  const handleRenameSession = (id: string, currentTitle: string) => {
    setEditingSessionId(id);
    setEditingTitle(currentTitle);
    setShowMenuId(null);
  };

  const saveRename = async () => {
    const sessionId = editingSessionId;
    const nextTitle = editingTitle.trim();
    if (!sessionId) {
      return;
    }
    if (!nextTitle) {
      setEditingSessionId(null);
      return;
    }

    try {
      if (sessionId !== 'new') {
        await aiApi.renameSession(sessionId, nextTitle, user.id);
      }
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: nextTitle } : s));
    } catch (e) {
      console.error('Failed to rename session', e);
    } finally {
      setEditingSessionId(null);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('确定要删除这段对话记录吗？')) {
      return;
    }

    try {
      if (id !== 'new') {
        await aiApi.deleteSession(id, user.id);
      }

      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (activeSessionId === id && newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      } else if (newSessions.length === 0) {
        setActiveSessionId('');
      }
    } catch (e) {
      console.error('Failed to delete session', e);
    } finally {
      setShowMenuId(null);
    }
  };

  const handleExportSession = (session: ChatSession) => {
    const content = `Smart-SMS AI 对话记录: ${session.title}\n时间: ${session.timestamp.toLocaleString()}\n\n` +
      session.messages.map(m => `[${m.role === 'user' ? '用户' : 'AI Assistant'}] (${m.timestamp.toLocaleTimeString()})\n${m.text}`).join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartSMS_Chat_${session.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenuId(null);
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleLabelMap: Record<User['role'], string> = {
    student: '学生',
    teacher: '教师',
    admin: '管理员',
  };

  return (
    <div className="h-full flex bg-white font-sans overflow-hidden animate-in fade-in duration-300 relative selection:bg-zinc-200 selection:text-zinc-900">
      {/* Texture Overlay - gentle noise */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 mix-blend-multiply"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Sessions Sidebar - Pure Monochrome with Collapse */}
      <div
        className={`${isSidebarOpen ? 'w-80 border-r opacity-100' : 'w-0 border-none opacity-0'} border-zinc-200 flex flex-col bg-zinc-50/50 backdrop-blur-xl relative z-10 transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <div className="w-80 flex flex-col h-full"> {/* Fixed width inner container prevents reflow */}
          <div className="p-6 flex items-center gap-2">
            <button
              onClick={handleCreateNewSession}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold tracking-tight rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm group"
            >
              <Plus size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
              <span>开启新对话</span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 rounded-lg transition-all"
              title="收起侧边栏"
            >
              <PanelLeft size={18} />
            </button>
          </div>

          <div className="px-6 mb-4 relative">
            <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-white border border-transparent hover:border-zinc-200 focus:border-zinc-900 rounded-lg text-xs font-semibold tracking-wide outline-none transition-all text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-6 relative">
            {filteredSessions.map((session) => (
              <div key={session.id} className="relative group/item">
                <button
                  onClick={() => {
                    if (editingSessionId !== session.id) {
                      setActiveSessionId(session.id);
                    }
                  }}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 flex gap-3 ${activeSessionId === session.id
                    ? 'bg-white shadow-sm border border-zinc-200'
                    : 'hover:bg-zinc-100 border border-transparent'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${activeSessionId === session.id ? 'bg-zinc-900 text-white' : 'bg-transparent text-zinc-400'
                    }`}>
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden pr-6">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                            onBlur={saveRename}
                            className="text-xs font-bold bg-white border border-zinc-300 rounded px-1 w-full outline-none text-zinc-900 focus:border-zinc-900"
                          />
                          <span
                            role="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              void saveRename();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void saveRename();
                              }
                            }}
                            className="text-zinc-900 cursor-pointer"
                          >
                            <Check size={14} />
                          </span>
                        </div>
                      ) : (
                        <h4 className={`text-xs font-bold tracking-tight truncate ${activeSessionId === session.id ? 'text-zinc-900' : 'text-zinc-500'}`}>
                          {session.title}
                        </h4>
                      )}
                      <span className="text-[9px] font-medium text-zinc-400 whitespace-nowrap tracking-wide">
                        {session.timestamp.getHours()}:{session.timestamp.getMinutes().toString().padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium truncate leading-relaxed group-hover/item:text-zinc-600 transition-colors">
                      {session.lastMessage || '...'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenuId(showMenuId === session.id ? null : session.id);
                  }}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all opacity-0 group-hover/item:opacity-100 ${showMenuId === session.id ? 'opacity-100' : ''}`}
                >
                  <MoreVertical size={14} />
                </button>

                {showMenuId === session.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-zinc-100 z-[20] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleRenameSession(session.id, session.title)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Pencil size={12} /> 重命名
                    </button>
                    <button
                      onClick={() => handleExportSession(session)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Download size={12} /> 导出对话
                    </button>
                    <div className="h-px bg-zinc-50 my-1" />
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-900 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> 删除记录
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area - Pure White */}
      <div className="flex-1 flex flex-col bg-white relative z-10">
        <div className="h-20 px-8 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10 transition-colors border-b border-zinc-50">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all mr-2"
                title="展开侧边栏"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSession ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-300'}`}>
              <Hexagon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight text-zinc-900">{activeSession?.title || 'Smart Chat'}</h3>
              {activeSession && (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-800"></span>
                  </span>
                  ONLINE
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeSession && (
              <button
                onClick={() => handleExportSession(activeSession)}
                className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
              >
                <Download size={18} />
              </button>
            )}
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative z-0">
          {failedSend && (
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                <span>上一条消息发送失败，请检查网络后重试。</span>
                <button
                  onClick={handleRetry}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          )}
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
              <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6">
                <Hexagon size={40} className="text-zinc-300" />
              </div>
              <p className="font-bold text-zinc-400 uppercase tracking-[0.2em] text-xs">NO ACTIVE SESSION</p>
            </div>
          ) : activeSession.messages.length === 0 ? (
            <div className="max-w-5xl mx-auto w-full pt-4 pb-10">
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 bg-zinc-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                      <Hexagon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-zinc-900">AI 对话触发词指引</p>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        当前角色：{roleLabelMap[user.role]}。你可以直接输入下面关键词快速触发真实数据查询。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-zinc-50/60">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-zinc-900 tracking-wide">{roleLabelMap[user.role]}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-white font-bold tracking-wide">
                      当前
                    </span>
                  </div>
                  <div className="space-y-3">
                    {roleTriggerGuide[user.role].map((item, idx) => (
                      <div key={`${user.role}-${idx}`} className="rounded-lg border border-zinc-100 bg-white p-3">
                        <p className="text-[11px] font-bold text-zinc-900">关键词：{item.keyword}</p>
                        <p className="text-[11px] text-zinc-600 mt-1 leading-5">效果：{item.effect}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-10 pb-4">
              {activeSession.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500 fade-in`}>
                  <div className={`flex gap-5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-white border border-zinc-200 text-zinc-900 shadow-sm">
                        <Hexagon size={16} />
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-zinc-900 text-white shadow-sm">
                        <UserIcon size={15} />
                      </div>
                    )}

                    <div className={`p-6 rounded-2xl text-sm leading-7 ${msg.role === 'user'
                      ? 'bg-zinc-100 text-zinc-900 rounded-tr-sm font-medium border border-zinc-200'
                      : 'bg-white text-zinc-800 border border-zinc-200 shadow-sm rounded-tl-sm font-normal'
                      }`}>
                      {msg.role === 'user' ? (
                        msg.text
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={prism}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #e4e4e7', // zinc-200
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    margin: '1.5rem 0',
                                    fontSize: '0.9em'
                                  }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={`bg-zinc-50 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-600 ${className}`} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-in fade-in duration-500">
                  <div className="flex gap-5 max-w-[80%]">
                    <div className="w-8 h-8 bg-white border border-zinc-200 text-zinc-500 rounded-lg flex items-center justify-center shadow-sm mt-1">
                      <Hexagon size={16} />
                    </div>
                    <div className="px-6 py-5 bg-white border border-zinc-200 shadow-sm rounded-2xl flex items-center gap-3">
                      <Loader2 size={16} className="animate-spin text-zinc-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-8 sticky bottom-0 z-20 pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            <div className="relative group bg-white rounded-2xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all duration-300 shadow-sm hover:shadow-md">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                    const target = e.target as HTMLTextAreaElement;
                    setTimeout(() => {
                      target.style.height = '72px'; // Reset height after sending
                    }, 0);
                  }
                }}
                disabled={!activeSession}
                placeholder={activeSession ? "Type your message..." : "Select a regular session"}
                className="w-full pl-6 pr-16 py-5 bg-transparent border-0 outline-none focus:ring-0 resize-none text-zinc-900 font-medium disabled:opacity-50 overflow-y-auto max-h-[200px] placeholder:text-zinc-400 placeholder:font-normal"
                style={{
                  height: '72px',  // Initial height
                  minHeight: '72px'
                }}
              />
              <button
                onClick={() => {
                  handleSendMessage();
                  if (textareaRef.current) {
                    textareaRef.current.style.height = '72px';
                  }
                }}
                disabled={!input.trim() || isTyping || !activeSession}
                className="absolute right-3 bottom-3 p-2.5 bg-zinc-900 text-white rounded-lg hover:bg-black hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 shadow-md shadow-zinc-200"
                aria-label="Send Message"
              >
                {isTyping ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            {isTyping && (
              <div className="mt-2 px-2 text-[11px] text-zinc-500 font-medium flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-zinc-400" />
                <span>AI 正在处理中，请稍候...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandaloneChat;
