
import { Student } from "../types";

export const generateStudentReport = async (student: Student): Promise<string> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const response = await fetch('/api/ai/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ studentId: student.id })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || data.text || "无法生成报告。";
  } catch (error) {
    console.error("AI Report generation failed (Backend Proxy):", error);
    return "生成报告时出错。请检查网络连接或稍后再试。";
  }
};
