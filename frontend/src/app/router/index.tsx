// frontend/src/app/router/index.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS, paths } from "./paths";

// Auth pages (anh)
import LoginPage from "@/pages/auth/LoginPage";
import RoleSelectPage from "@/pages/auth/RoleSelectPage";

// Student pages (anh)
import TrackProgressPage from "@/pages/student/TrackProgressPage";
import QuizSuccessPage from "@/pages/student/QuizSuccessPage";
import QuizFailPage from "@/pages/student/QuizFailPage";

// Teacher layout/pages (bạn anh)
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardPage from "@/pages/teacher/DashboardPage";

// Student chat layout/pages (bạn anh)
import ChatLayout from "@/layouts/ChatLayout";
import ChatPage from "@/pages/student/ChatPage";

function NotFound() {
  return (
    <div style={{ padding: 24, color: "white" }}>
      <h2 style={{ margin: 0 }}>404 - Not Found</h2>
      <p style={{ opacity: 0.7 }}>Route không tồn tại.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  // Entry
  { path: "/", element: <Navigate to={PATHS.LOGIN} replace /> },

  // Auth flow
  { path: PATHS.LOGIN, element: <LoginPage /> },
  { path: PATHS.ROLE, element: <RoleSelectPage /> },

  // Teacher area (layout + children)
  {
    path: "/teacher",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "upload",
        element: (
          <div style={{ color: "white", padding: 24 }}>Upload Page (todo)</div>
        ),
      },
      {
        path: "list",
        element: (
          <div style={{ color: "white", padding: 24 }}>
            File List Page (todo)
          </div>
        ),
      },
    ],
  },

  // Student chat area (layout + children)
  {
    path: "/student",
    element: <ChatLayout />,
    children: [{ path: "chat", element: <ChatPage /> }],
  },

  // Student standalone pages (anh) — giữ nguyên layout theo thiết kế anh làm
  { path: paths.student.trackProgress, element: <TrackProgressPage /> },
  { path: paths.student.quizSuccess, element: <QuizSuccessPage /> },
  { path: paths.student.quizFail, element: <QuizFailPage /> },

  { path: "*", element: <NotFound /> },
]);
