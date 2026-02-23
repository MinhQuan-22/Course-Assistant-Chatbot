//src\components\student\ChatSidebar.tsx
import { useMemo, useState } from "react";
import newChatIcon from "../../assets/icons/icon_edit.png";
import quizIcon from "../../assets/icons/icon_quiz.png";
import trackIcon from "../../assets/icons/icon_progress.png";


type ChatHistoryItem = { id: string; title: string };

export default function ChatSidebar() {
  // UI-only: simulate "has chats" vs "no chats"
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
        <SideAction iconSrc={newChatIcon} label="New Chat" onClick={() => {}} />
        <SideAction iconSrc={quizIcon} label="Quiz Generator" onClick={() => {}} />
        <SideAction iconSrc={trackIcon} label="Track Progress" onClick={() => {}} />
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

function SideAction({
  iconSrc,
  label,
  onClick,
}: {
  iconSrc: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="chat-side-action" type="button" onClick={onClick}>
      <span className="chat-side-action-ico">
        <img src={iconSrc} alt="" />
      </span>
      <span className="chat-side-action-text">{label}</span>
    </button>
  );
}
