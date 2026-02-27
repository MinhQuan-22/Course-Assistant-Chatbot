//src\components\student\ChatMessage.tsx
import botIcon from "../../assets/chatbot.png";
import regenerateIcon from "../../assets/icon_history.png";
import fileIcon from "../../assets/icon_file.png";

export default function ChatMessage({
  variant,
  text,
  meta,
  onRegenerate,
  onViewDoc,
}: {
  variant: "bot";
  text: string;
  meta?: string;
  onRegenerate?: () => void;
  onViewDoc?: () => void;
}) {
  return (
    <div className="chat-bot-card">
      <div className="chat-bot-body">
        <img className="chat-bot-avatar" src={botIcon} alt="" />
        <div className="chat-bot-text">
          <div className="chat-bot-content">{text}</div>
          {meta && <div className="chat-bot-meta">{meta}</div>}
        </div>
      </div>

      <div className="chat-bot-actions">
        <button type="button" className="chat-action-btn" onClick={onRegenerate}>
          <img src={regenerateIcon} alt="" />
          <span>Regenerate</span>
        </button>

        <button type="button" className="chat-action-btn" onClick={onViewDoc}>
          <img src={fileIcon} alt="" />
          <span>View Doc</span>
        </button>
      </div>
    </div>
  );
}
