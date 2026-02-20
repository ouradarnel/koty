import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import ToastHost from './components/shared/ToastHost';
import { APP_THEME_CHANGE_EVENT, applyTheme, getStoredTheme } from './lib/theme';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage'));
const ContributionDetailPage = lazy(() => import('./pages/ContributionDetailPage'));
const NewGroupPage = lazy(() => import('./pages/NewGroupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-10 w-48 rounded-xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    applyTheme(getStoredTheme());

    const onThemeChange = () => {
      applyTheme(getStoredTheme());
    };

    const onStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('accessToken'));
      applyTheme(getStoredTheme());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(APP_THEME_CHANGE_EVENT, onThemeChange as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(APP_THEME_CHANGE_EVENT, onThemeChange as EventListener);
    };
  }, []);

  const handleAuthenticated = () => setIsAuthenticated(true);
  const handleLoggedOut = () => setIsAuthenticated(false);

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? <LoginPage onAuthenticated={handleAuthenticated} /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/register"
            element={
              !isAuthenticated ? <RegisterPage onAuthenticated={handleAuthenticated} /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <DashboardPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/groups"
            element={
              isAuthenticated ? <GroupsPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/groups/new"
            element={
              isAuthenticated ? <NewGroupPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/groups/:groupId"
            element={
              isAuthenticated ? <GroupDetailPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? <ProfilePage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/guide"
            element={
              isAuthenticated ? <GuidePage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/contributions/:contributionId"
            element={
              isAuthenticated ? <ContributionDetailPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </>
  );
}

export default App;
