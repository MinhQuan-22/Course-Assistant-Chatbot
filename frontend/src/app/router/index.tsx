import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "./paths";

import DashboardLayout from "../../layouts/DashboardLayout";
import DashboardPage from "../../pages/teacher/DashboardPage";

import ChatLayout from "../../layouts/ChatLayout";
import ChatPage from "../../pages/student/ChatPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to={paths.teacher.dashboard} replace /> },

  {
    path: "/teacher",
    element: <DashboardLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "upload", element: <div style={{ color: "white" }}>Upload Page (todo)</div> },
      { path: "list", element: <div style={{ color: "white" }}>List Page (todo)</div> },
    ],
  },

  {
    path: "/student",
    element: <ChatLayout />,
    children: [{ path: "chat", element: <ChatPage /> }],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
