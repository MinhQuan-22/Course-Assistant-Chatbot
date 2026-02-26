//src\components\student\ChatSidebar.tsx
// src/components/student/ChatSidebar.tsx
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { paths } from "@/app/router/paths";

import newChatIcon from "../../assets/icons/icon_edit.png";
import quizIcon from "../../assets/icons/icon_quiz.png";
import trackIcon from "../../assets/icons/icon_progress.png";

type ChatHistoryItem = { id: string; title: string };

export default function ChatSidebar() {
  const [history] = useState<ChatHistoryItem[]>([
    { id: "1", title: "What is programming?" },
    { id: "2", title: "What is programming?" },
    { id: "3", title: "What is programming?" },
    { id: "4", title: "What is programming?" },
    { id: "5", title: "What is programming?" },
  ]);

  const hasHistory = useMemo(() => history.length > 0, [history.length]);

  return (
    <aside className="chat-sidebar">
      <div className="chat-side-top">
        <SideNav iconSrc={newChatIcon} label="New Chat" to={paths.student.newChat} />
        <SideNav iconSrc={quizIcon} label="Quiz Generator" to={paths.student.quiz} />
        <SideNav
          iconSrc={trackIcon}
          label="Track Progress"
          to={paths.student.trackProgress}
        />
      </div>

      {hasHistory && (
        <div className="chat-history">
          <div className="chat-history-title">Your chats</div>
          <div className="chat-history-list">
            {history.map((h, idx) => (
              <button
                key={h.id}
                type="button"
                className={`chat-history-item ${idx === 0 ? "active" : ""}`}
              >
                {h.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-side-footer">
        <button className="chat-signout" type="button">
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function SideNav({
  iconSrc,
  label,
  to,
}: {
  iconSrc: string;
  label: string;
  to: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `chat-side-action ${isActive ? "is-active" : ""}`
      }
    >
      <span className="chat-side-action-ico">
        <img src={iconSrc} alt="" />
      </span>
      <span className="chat-side-action-text">{label}</span>
    </NavLink>
  );
}