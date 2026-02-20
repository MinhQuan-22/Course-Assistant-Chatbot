import { useNavigate, useLocation } from "react-router-dom";
import { PATHS } from "@/app/router/paths";

export default function ChatbotSidebar() {
  const nav = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) => loc.pathname === path;

  return (
    <aside
      style={{
        width: 320,
        minHeight: "100vh",
        padding: 22,
        borderRight: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.10)",
      }}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <button
          className="btn"
          style={{
            justifyContent: "flex-start",
            height: 54,
            fontSize: 20,
            borderRadius: 16,
            display: "flex",
            gap: 12,
          }}
        >
          ✏️ <span>New Chat</span>
        </button>

        <button
          className="btn"
          style={{
            justifyContent: "flex-start",
            height: 54,
            fontSize: 20,
            borderRadius: 16,
            display: "flex",
            gap: 12,
            background:
              isActive(PATHS.STUDENT.QUIZ_SUCCESS) ||
              isActive(PATHS.STUDENT.QUIZ_FAIL)
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.05)",
          }}
          onClick={() => nav(PATHS.STUDENT.QUIZ_SUCCESS)}
        >
          ❓ <span>Quiz Generator</span>
        </button>

        <button
          className="btn"
          style={{
            justifyContent: "flex-start",
            height: 54,
            fontSize: 20,
            borderRadius: 16,
            display: "flex",
            gap: 12,
            background: isActive(PATHS.STUDENT.TRACK_PROGRESS)
              ? "rgba(255,255,255,0.10)"
              : "rgba(255,255,255,0.05)",
          }}
          onClick={() => nav(PATHS.STUDENT.TRACK_PROGRESS)}
        >
          📊 <span>Track Progress</span>
        </button>
      </div>

      <div
        style={{ marginTop: 28, color: "rgba(255,255,255,0.35)", fontSize: 22 }}
      >
        Your chats
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 14,
          fontSize: 18,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <div>Generate a quiz related</div>
        <div>What is programming?</div>
        <div>What is programming?</div>
        <div>What is programming?</div>
        <div>What is programming?</div>
        <div>What is programming?</div>
      </div>

      <button
        className="btn"
        style={{
          marginTop: 22,
          width: "100%",
          height: 62,
          borderRadius: 18,
          fontSize: 22,
        }}
      >
        Sign Out
      </button>
    </aside>
  );
}
