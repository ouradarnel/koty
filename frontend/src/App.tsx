import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import ContributionDetailPage from './pages/ContributionDetailPage';
import NewGroupPage from './pages/NewGroupPage';
import ProfilePage from './pages/ProfilePage';
import ToastHost from './components/shared/ToastHost';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const onStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('accessToken'));
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleAuthenticated = () => setIsAuthenticated(true);
  const handleLoggedOut = () => setIsAuthenticated(false);

  return (
    <>
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
          path="/contributions/:contributionId"
          element={
            isAuthenticated ? <ContributionDetailPage onLoggedOut={handleLoggedOut} /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
}

export default App;
