import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import HistoryPage from "./pages/HistoryPage";
import QuizPage from "./pages/QuizPage";
import StatsPage from "./pages/StatsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

type AllowedRole = "student" | "teacher" | "admin";

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role as AllowedRole))) {
    if (user?.role === "admin") return <Navigate to="/admin" replace />;
    if (user?.role === "teacher") return <Navigate to="/documents" replace />;
    return <Navigate to="/chat" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const defaultRoute = !isAuthenticated
    ? "/login"
    : user?.role === "admin"
    ? "/admin"
    : user?.role === "teacher"
    ? "/documents"
    : "/chat";

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <SignupPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <ForgotPasswordPage />}
      />

      <Route path="/" element={<Navigate to={defaultRoute} replace />} />

      {/* Student only */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <QuizPage />
          </ProtectedRoute>
        }
      />

      {/* Student + Teacher + Admin */}
      <Route
        path="/documents"
        element={
          <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      {/* Teacher only for now */}
      <Route
        path="/stats"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <StatsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;