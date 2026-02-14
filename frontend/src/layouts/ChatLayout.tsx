import { Outlet } from "react-router-dom";
import ChatSidebar from "../components/student/ChatSidebar";
import ChatTopbar from "../components/student/ChatTopbar";

export default function ChatLayout() {
  return (
    <div className="chat-shell">
      <ChatSidebar />
      <div className="chat-main">
        <ChatTopbar />
        <main className="chat-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
