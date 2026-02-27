//src\pages\student\QuizSuccessPage.tsx
import { useState } from "react";
import ChatbotSidebar from "../../components/student/ChatSidebar";
import QuizGeneratorPage from "../../pages/student/QuizGeneratorPage";
import ScoreModal from "../../components/student/ScoreModal";

export default function QuizSuccessPage() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <ChatbotSidebar />

      {/* Main content */}
      <main style={{ flex: 1, minHeight: "100vh" }}>
        <QuizGeneratorPage />
      </main>

      {/* Modal */}
      <ScoreModal
        open={open}
        variant="success"
        scoreText="10/10"
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

