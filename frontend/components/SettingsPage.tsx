
import React, { useEffect, useRef } from 'react';
import { Database, Download, Upload, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { aiConfigApi } from '../services/api';

const SettingsPage: React.FC = () => {
  const { exportData, importData, resetData } = useData();
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetOpen, setIsResetOpen] = React.useState(false);
  const [resetInput, setResetInput] = React.useState('');
  const [aiProvider, setAiProvider] = React.useState<'remote' | 'local'>('remote');
  const [ollamaBaseUrl, setOllamaBaseUrl] = React.useState('http://localhost:8000');
  const [ollamaModel, setOllamaModel] = React.useState('qwen/qwen3-1.7b');
  const [ollamaTimeout, setOllamaTimeout] = React.useState(120000);
  const [ollamaApiKey, setOllamaApiKey] = React.useState('');
  const [ollamaApiKeyMasked, setOllamaApiKeyMasked] = React.useState('');
  const [ollamaChatPath, setOllamaChatPath] = React.useState('/v1/chat/completions');
  const [ollamaCompletionPath, setOllamaCompletionPath] = React.useState('/v1/completions');
  const [aiSaving, setAiSaving] = React.useState(false);
  const [aiTesting, setAiTesting] = React.useState(false);

  useEffect(() => {
    const loadAiConfig = async () => {
      try {
        const cfg = await aiConfigApi.get();
        setAiProvider(cfg.provider === 'local' ? 'local' : 'remote');
        setOllamaBaseUrl(cfg.ollamaBaseUrl || 'http://localhost:8000');
        setOllamaModel(cfg.ollamaModel || 'qwen/qwen3-1.7b');
        setOllamaTimeout(Number(cfg.ollamaTimeout) > 0 ? Number(cfg.ollamaTimeout) : 120000);
        setOllamaApiKey('');
        setOllamaApiKeyMasked(cfg.ollamaApiKey || '');
        setOllamaChatPath(cfg.ollamaChatPath || '/v1/chat/completions');
        setOllamaCompletionPath(cfg.ollamaCompletionPath || '/v1/completions');
      } catch (e) {
        showToast('AI 配置加载失败，已使用默认值。', 'error');
      }
    };
    loadAiConfig();
  }, []);

  const handleSaveAiConfig = async () => {
    setAiSaving(true);
    try {
      const payload: {
        provider: 'remote' | 'local';
        ollamaBaseUrl?: string;
        ollamaModel?: string;
        ollamaTimeout?: number;
        ollamaApiKey?: string;
        ollamaChatPath?: string;
        ollamaCompletionPath?: string;
      } = { provider: aiProvider };

      if (aiProvider === 'local') {
        payload.ollamaBaseUrl = ollamaBaseUrl.trim();
        payload.ollamaModel = ollamaModel.trim();
        payload.ollamaTimeout = Math.max(1000, Number(ollamaTimeout) || 120000);
        payload.ollamaApiKey = ollamaApiKey.trim() ? ollamaApiKey.trim() : undefined;
        payload.ollamaChatPath = ollamaChatPath.trim();
        payload.ollamaCompletionPath = ollamaCompletionPath.trim();
      }

      const cfg = await aiConfigApi.update(payload);
      setAiProvider(cfg.provider === 'local' ? 'local' : 'remote');
      setOllamaBaseUrl(cfg.ollamaBaseUrl || 'http://localhost:8000');
      setOllamaModel(cfg.ollamaModel || 'qwen/qwen3-1.7b');
      setOllamaTimeout(Number(cfg.ollamaTimeout) > 0 ? Number(cfg.ollamaTimeout) : 120000);
      setOllamaApiKey('');
      setOllamaApiKeyMasked(cfg.ollamaApiKey || '');
      setOllamaChatPath(cfg.ollamaChatPath || '/v1/chat/completions');
      setOllamaCompletionPath(cfg.ollamaCompletionPath || '/v1/completions');
      showToast(`AI 配置已保存，当前提供方：${cfg.provider}`, 'success');
    } catch (e) {
      showToast('AI 配置保存失败', 'error');
    } finally {
      setAiSaving(false);
    }
  };

  const handleTestAiConfig = async () => {
    setAiTesting(true);
    try {
      const result = await aiConfigApi.test();
      const providerText = result?.provider ? `（provider: ${result.provider}）` : '';
      showToast(`连接测试完成${providerText}：${result?.reply || '已返回响应'}`, 'success');
    } catch (e) {
      showToast('连接测试失败，请检查本地模型服务。', 'error');
    } finally {
      setAiTesting(false);
    }
  };

  const validateImportData = (data: unknown) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, message: '导入失败：JSON 顶层必须是对象结构。' };
    }

    const payload = data as Record<string, unknown>;
    const expectedKeys = ['students', 'teachers', 'courses', 'classrooms', 'classes', 'users', 'activities'];
    const presentKeys = expectedKeys.filter((key) => key in payload);

    if (presentKeys.length === 0) {
      return { ok: false, message: '导入失败：缺少系统数据字段（如 students、teachers、courses）。' };
    }

    for (const key of presentKeys) {
      const value = payload[key];
      if (value !== undefined && value !== null && !Array.isArray(value)) {
        return { ok: false, message: `导入失败：字段 ${key} 必须是数组。` };
      }
    }

    return { ok: true };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          const validation = validateImportData(parsed);
          if (!validation.ok) {
            showToast(validation.message || '导入失败：数据校验未通过。', 'error');
            return;
          }
          const success = importData(result);
          if (success) {
            showToast('数据导入成功', 'success');
          } else {
            showToast('数据格式错误，导入失败。', 'error');
          }
        } catch {
          showToast('数据格式错误，导入失败。', 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-white dark:bg-zinc-900 relative">
      {/* Toolbar */}
      <div className="flex-none bg-white dark:bg-zinc-900 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <SettingsIcon size={16} className="text-zinc-400" />
            系统设置
          </h2>
        </div>
      </div>

      {/* Main Content - Single View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900 relative z-0">
        <div className="max-w-4xl mx-auto p-8 lg:p-12">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Database size={20} className="text-zinc-400" /> 数据持久化
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
                本系统采用本地化存储策略。为防止数据丢失，建议定期导出 JSON 备份文件。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => {
                  exportData();
                  showToast('已导出备份文件', 'success');
                }}
                className="group flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2rem] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
              >
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform shadow-inner">
                  <Download size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">导出数据</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold mt-1 tracking-wider">Download .JSON</p>
                </div>
              </button>

              <button onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2rem] hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform shadow-inner">
                  <Upload size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">导入数据</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold mt-1 tracking-wider">Restore Backup</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              </button>

              <button onClick={() => setIsResetOpen(true)} className="group flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2rem] hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform shadow-inner group-hover:bg-rose-100 dark:group-hover:bg-rose-900/20">
                  <RotateCcw size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-rose-600 group-hover:text-rose-700">重置系统</p>
                  <p className="text-[10px] text-rose-400/70 uppercase font-bold mt-1 tracking-wider">Factory Reset</p>
                </div>
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-4">AI 服务配置</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-zinc-500">
                  提供方
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider((e.target.value as 'remote' | 'local') || 'remote')}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="remote">Remote / OpenAI-Compatible（远程）</option>
                    <option value="local">Local / OpenAI-Compatible（本地）</option>
                  </select>
                </label>
                {aiProvider === 'local' ? (
                  <>
                    <label className="text-xs font-bold text-zinc-500">
                      超时（毫秒）
                      <input
                        type="number"
                        value={ollamaTimeout}
                        onChange={(e) => setOllamaTimeout(Number(e.target.value) || 120000)}
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <div className="hidden md:block" />
                    <label className="text-xs font-bold text-zinc-500 md:col-span-2">
                      本地服务 Base URL（OpenAI兼容）
                      <input
                        value={ollamaBaseUrl}
                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                        placeholder="http://localhost:8000"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-xs font-bold text-zinc-500 md:col-span-2">
                      本地模型名称
                      <input
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="qwen/qwen3-1.7b"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-xs font-bold text-zinc-500 md:col-span-2">
                      API Key（可选，留空表示不改）
                      <input
                        type="password"
                        value={ollamaApiKey}
                        onChange={(e) => setOllamaApiKey(e.target.value)}
                        placeholder={ollamaApiKeyMasked ? `已配置：${ollamaApiKeyMasked}` : '输入本地服务 API Key'}
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-xs font-bold text-zinc-500">
                      聊天接口路径
                      <input
                        value={ollamaChatPath}
                        onChange={(e) => setOllamaChatPath(e.target.value)}
                        placeholder="/v1/chat/completions"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <label className="text-xs font-bold text-zinc-500">
                      补全接口路径
                      <input
                        value={ollamaCompletionPath}
                        onChange={(e) => setOllamaCompletionPath(e.target.value)}
                        placeholder="/v1/completions"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 p-4">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">当前为远程 AI 模式</p>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      远程 AI 使用服务端配置（环境变量 / application.yml）。切换到 Local 后，才会显示本地模型的自定义配置字段。
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleSaveAiConfig}
                  disabled={aiSaving}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-black disabled:opacity-60"
                >
                  {aiSaving ? '保存中...' : '保存配置'}
                </button>
                <button
                  onClick={handleTestAiConfig}
                  disabled={aiTesting}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-black text-zinc-700 dark:text-zinc-200 disabled:opacity-60"
                >
                  {aiTesting ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isResetOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">确认重置系统</h3>
              <button
                onClick={() => {
                  setIsResetOpen(false);
                  setResetInput('');
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-black"
              >
                关闭
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
              此操作将清空本地数据且不可恢复。请输入 <span className="font-black text-rose-500">RESET</span> 以确认。
            </p>
            <input
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="输入 RESET 确认"
              className="mt-4 w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-zinc-700 dark:text-zinc-200 text-sm"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setIsResetOpen(false);
                  setResetInput('');
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-black text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  resetData();
                  setIsResetOpen(false);
                  setResetInput('');
                }}
                disabled={resetInput.trim().toUpperCase() !== 'RESET'}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
