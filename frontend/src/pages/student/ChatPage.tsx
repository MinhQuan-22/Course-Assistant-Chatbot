import ChatMessage from "../../components/student/ChatMessage";
import ChatComposer from "../../components/student/ChatComposer";

export default function ChatPage() {
  // UI-only demo
  const question = "What is programming?";
  const answer =
    "Programming is the process of creating a set of instructions that tells a computer how to perform a specific task. Think of it as writing a highly detailed recipe for someone who follows directions exactly but has zero intuition.";
  const source = "(from Page 8, Introduction to programming, Slide 2)";

  return (
    <div className="chat-page">
      <div className="chat-thread">
        {/* user bubble */}
        <div className="chat-user-bubble">{question}</div>

        {/* bot card */}
        <ChatMessage
          variant="bot"
          text={answer}
          meta={source}
          onRegenerate={() => {}}
          onViewDoc={() => {}}
        />
      </div>

      <ChatComposer onSend={() => {}} />
    </div>
  );
}
