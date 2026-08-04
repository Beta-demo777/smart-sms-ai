
import React, { useState } from 'react';
import { User as UserIcon, Lock, AlertCircle, Eye, EyeOff, Hexagon } from 'lucide-react';
import { User } from '../types';
import { authApi, setAuthToken } from '../services/api';
import { buildAvatarUrl } from '../utils/avatar';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<User['role']>('admin');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions: Array<{ key: User['role']; label: string }> = [
    { key: 'admin', label: '管理员' },
    { key: 'teacher', label: '教师' },
    { key: 'student', label: '学生' }
  ];

  const roleHint: Record<User['role'], string> = {
    admin: '例如：admin',
    teacher: '例如：T2024001',
    student: '例如：20230001'
  };

  const resolveLoginError = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    const normalized = message.toLowerCase();

    if (
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('network request failed')
    ) {
      return '网络异常，请检查后端服务或网络连接';
    }
    if (message.includes('账号不存在')) {
      return '账号不存在';
    }
    if (message.includes('密码错误') || normalized.includes('bad credentials')) {
      return '密码错误';
    }
    if (message.includes('账号已锁定') || normalized.includes('locked') || normalized.includes('disabled')) {
      return '账号已锁定，请联系管理员';
    }
    return '登录失败，请稍后重试';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(account, password);
      const actualRole = (response.user.role?.toLowerCase() as User['role']) || 'admin';

      if (actualRole !== selectedRole) {
        const roleLabelMap: Record<User['role'], string> = {
          admin: '管理员',
          teacher: '教师',
          student: '学生'
        };
        setError(`账号角色为「${roleLabelMap[actualRole]}」，与当前选择不一致`);
        return;
      }

      setAuthToken(response.token);
      localStorage.setItem('authToken', response.token);

      const user: User = {
        id: response.user.id || 'system-admin',
        username: response.user.username || response.user.name,
        name: response.user.name,
        email: response.user.email,
        role: actualRole,
        avatar: response.user.avatar || buildAvatarUrl(response.user.id || response.user.username || response.user.name),
        status: response.user.status || 'active',
        lastLogin: new Date().toISOString()
      };

      onLogin(user);
    } catch (err) {
      setError(resolveLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="w-full min-h-screen bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="grid md:grid-cols-[1.2fr_0.8fr] min-h-screen">
          <aside className="relative p-8 sm:p-10 lg:p-12 bg-zinc-100 dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-start">
            <div className="absolute inset-0 opacity-40 dark:opacity-25 pointer-events-none [background:radial-gradient(circle_at_20%_10%,rgba(24,24,27,0.12),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(24,24,27,0.10),transparent_42%)]" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 opacity-55 dark:opacity-35 [background-image:linear-gradient(to_right,rgba(24,24,27,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.2)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="absolute top-[52%] left-12 h-44 w-44 border-2 border-zinc-400/70 dark:border-zinc-600/80 rotate-12" />
              <div className="absolute top-[60%] right-14 h-32 w-32 border-2 border-zinc-400/70 dark:border-zinc-600/80 rounded-full" />
              <div className="absolute bottom-20 left-1/3 h-36 w-36 border-2 border-zinc-400/70 dark:border-zinc-600/80 rounded-2xl -rotate-6" />
              <div className="absolute bottom-12 right-10 h-px w-56 bg-zinc-500/70 dark:bg-zinc-500/70 rotate-12" />
              <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-zinc-300/35 dark:bg-zinc-700/25 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                智能学生管理平台
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-md">
                统一管理学生、教师、课程与校园服务。使用你的学号或工号登录系统。
              </p>
              <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 px-3 py-1.5 mt-6">
                <Hexagon size={14} className="text-zinc-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Smart SMS</span>
              </div>
            </div>
          </aside>

          <main className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center md:justify-start md:pt-16 bg-white dark:bg-zinc-900">
            <div className="mb-8 max-w-md w-full ml-auto text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Sign In</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">欢迎回来</h2>
              <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">请输入访问凭证继续操作</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-w-md w-full ml-auto mt-4">
              <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                {roleOptions.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`h-9 rounded-xl text-xs font-black transition-colors ${
                      selectedRole === role.key
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">学号/工号</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                  <input
                    type="text"
                    required
                    placeholder={`请输入学号或工号（${roleHint[selectedRole]}）`}
                    className="w-full h-12 pl-12 pr-4 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm font-bold text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">登录密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="请输入密码"
                    className="password-input w-full h-12 pl-12 pr-12 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm font-bold text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-zinc-200 dark:shadow-none hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-70"
              >
                {isLoading ? '验证中...' : '立即登录'}
              </button>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  忘记密码？
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Login;
