
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import TeacherList from './components/TeacherList';
import ClassList from './components/ClassList';
import DepartmentList from './components/DepartmentList';
import MajorList from './components/MajorList';
import { MyCoursesPage, CampusCoursesPage } from './components/CoursePages';
import AIInsights from './components/AIInsights';
import SettingsPage from './components/SettingsPage';
import UserProfile from './components/StudentProfile';
import { TeacherCoursesPage, TeacherAssignmentsPage, TeacherCheckinPublishPage } from './components/TeacherPages';
import StandaloneChat from './components/StandaloneChat';
import { AdminUsersPage, AdminCoursesPage, AdminLogsPage } from './components/AdminPages';
import NotificationManage from './components/NotificationManage';
import ClassroomList from './components/ClassroomList';
import ExamList from './components/ExamList';
import ScoreRecord from './components/ScoreRecord';
import AttendancePage from './components/AttendancePage';
import LeaveApproval from './components/LeaveApproval';
import ScheduleManager from './components/ScheduleManager';
import {
  LeaveRequestPage,
  CheckInPage,

  SchedulePage,
  GradesPage,
  AssignmentsPage
} from './components/ServicePages';
import Login from './components/Login';
import { PageType, User } from './types';
import { DataProvider, useData } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { authApi, setAuthToken } from './services/api';

const AppContent: React.FC = () => {
  const { currentUser, setCurrentUser, refreshData, isLoading: isDataLoading } = useData();
  const [activePage, setActivePage] = useState<PageType>(() => {
    // Initialize from localStorage to persist page state across refreshes
    const saved = localStorage.getItem('activePage');
    return (saved as PageType) || 'dashboard';
  });
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Detect page refresh and disable animations
  useEffect(() => {
    const isPageRefresh = sessionStorage.getItem('pageLoaded') === 'true';

    if (isPageRefresh) {
      // Disable animations on refresh
      document.body.classList.add('no-animations');
      // Remove the class after a short delay to re-enable animations for future navigation
      setTimeout(() => {
        document.body.classList.remove('no-animations');
      }, 100);
    }

    // Mark that the page has been loaded
    sessionStorage.setItem('pageLoaded', 'true');
  }, []);

  // Persist activePage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  const handleLogin = async (user: User) => {
    // Disable enter animations for the first page shown right after login.
    document.body.classList.add('no-animations');
    setTimeout(() => {
      document.body.classList.remove('no-animations');
    }, 300);

    setCurrentUser(user);
    setActivePage('dashboard');
    await refreshData();
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout failed', e);
    }
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setCurrentUser(null);
  };

  if (isDataLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={currentUser} onNavigate={setActivePage} />;
      case 'profile':
        return <UserProfile user={currentUser} />;
      case 'schedule':
        return <SchedulePage />;
      case 'teacher-schedule':
        return <SchedulePage />;
      case 'teacher-assignments':
        return <TeacherAssignmentsPage />;
      case 'teacher-checkin-publish':
        return <TeacherCheckinPublishPage />;
      case 'grades':
        return <GradesPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'my-courses':
        return <MyCoursesPage onNavigate={setActivePage} />;
      case 'campus-courses':
        return <CampusCoursesPage user={currentUser} />;
      case 'leave':
        return <LeaveRequestPage />;
      case 'checkin':
        return <CheckInPage />;

      case 'students':
        return <StudentList />;
      case 'teachers':
        return <TeacherList />;
      case 'classes':
        return <ClassList />;
      case 'departments':
        return <DepartmentList />;
      case 'majors':
        return <MajorList />;
      case 'ai-insights':
        return <AIInsights />;
      case 'settings':
        return <SettingsPage />;
      case 'teacher-courses':
        return <TeacherCoursesPage />;
      case 'ai-chat':
        return <StandaloneChat user={currentUser} />;
      case 'admin-users':
        return <AdminUsersPage />;
      case 'admin-courses':
        return <AdminCoursesPage />;
      case 'admin-logs':
        return <AdminLogsPage />;
      case 'admin-notifications':
        return <NotificationManage />;
      case 'classrooms':
        return <ClassroomList />;
      case 'grades-manage':
        return <ExamList
          onSendMessage={() => { }}
          userRole={currentUser.role}
          onEnterGrades={(id) => { setSelectedExamId(id); setActivePage('score-record'); }}
        />;
      case 'score-record':
        return <ScoreRecord
          examId={selectedExamId}
          onBack={() => setActivePage('grades-manage')}
        />;
      case 'attendance-manage':
        return <AttendancePage userRole={currentUser.role} />;
      case 'leave-approval':
        return <LeaveApproval />;
      case 'schedule-manage':
        return <ScheduleManager />;
      default:
        return <Dashboard user={currentUser} onNavigate={setActivePage} />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      user={currentUser}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ToastProvider>
  );
};

export default App;
