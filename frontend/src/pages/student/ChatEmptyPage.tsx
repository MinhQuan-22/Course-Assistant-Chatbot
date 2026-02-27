// src/pages/student/ChatEmptyPage.tsx
import ChatComposer from "../../components/student/ChatComposer";

export default function ChatEmptyPage() {
  return (
    <div className="chat-page">
      <div className="chat-thread chat-empty">
        <div className="chat-empty-title">Ask me when you are ready.</div>
      </div>

      <ChatComposer onSend={() => {}} />
    </div>
  );
}