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
import TeacherQuizzesPage from "./pages/TeacherQuizzesPage";
import StatsPage from "./pages/StatsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminAcademicPage from "./pages/AdminAcademicPage";
import AdminExamSchedulesPage from "./pages/AdminExamSchedulesPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";
import AdminDocumentsPage from "./pages/AdminDocumentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

type AllowedRole = "student" | "teacher" | "admin";

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-background gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground font-medium tracking-wide">Đang tải...</p>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
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
    return <LoadingScreen />;
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
      <Route path="/chat"    element={<ProtectedRoute allowedRoles={["student"]}><ChatPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute allowedRoles={["student"]}><HistoryPage /></ProtectedRoute>} />
      <Route path="/quiz"    element={<ProtectedRoute allowedRoles={["student"]}><QuizPage /></ProtectedRoute>} />

      {/* Student + Teacher + Admin */}
      <Route path="/documents" element={<ProtectedRoute allowedRoles={["student", "teacher", "admin"]}><DocumentsPage /></ProtectedRoute>} />

      {/* Teacher only */}
      <Route path="/stats" element={<ProtectedRoute allowedRoles={["teacher"]}><StatsPage /></ProtectedRoute>} />
      <Route path="/quizzes" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherQuizzesPage /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/admin"                element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/academic"       element={<ProtectedRoute allowedRoles={["admin"]}><AdminAcademicPage /></ProtectedRoute>} />
      <Route path="/admin/settings"       element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/exam-schedules" element={<ProtectedRoute allowedRoles={["admin"]}><AdminExamSchedulesPage /></ProtectedRoute>} />
      <Route path="/admin/announcements"  element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnnouncementsPage /></ProtectedRoute>} />
      <Route path="/admin/documents"      element={<ProtectedRoute allowedRoles={["admin"]}><AdminDocumentsPage /></ProtectedRoute>} />

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