// frontend/src/app/router/paths.ts

export const paths = {
  auth: {
    login: "/login",
    role: "/role",
  },
  teacher: {
    home: "/teacher",
    dashboard: "/teacher/dashboard",
    upload: "/teacher/upload",
    list: "/teacher/list",
  },
  student: {
    newChat: "/student/new",
    chat: "/student/chat",
    quiz: "/student/quiz",
    trackProgress: "/student/track-progress",
    quizSuccess: "/student/quiz/success",
    quizFail: "/student/quiz/fail",
  },
} as const;

export const PATHS = {
  LOGIN: paths.auth.login,
  ROLE: paths.auth.role,

  STUDENT: {
    CHAT: paths.student.chat,
    TRACK_PROGRESS: paths.student.trackProgress,
    QUIZ_SUCCESS: paths.student.quizSuccess,
    QUIZ_FAIL: paths.student.quizFail,
  },

  TEACHER: {
    HOME: paths.teacher.home,
    DASHBOARD: paths.teacher.dashboard,
    UPLOAD: paths.teacher.upload,
    LIST: paths.teacher.list,
  },
} as const;
