import { useState } from "react";
import ChatbotSidebar from "@/components/student/ChatbotSidebar";
import ScoreModal from "@/components/student/ScoreModal";

export default function QuizFailPage() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ display: "flex" }}>
      <ChatbotSidebar />

      <main style={{ flex: 1, minHeight: "100vh", padding: "26px 34px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 700, opacity: 0.95 }}>3N</div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "2px solid rgba(255,255,255,0.85)",
              opacity: 0.9,
            }}
          />
        </div>

        <div
          className="card"
          style={{
            marginTop: 18,
            height: 78,
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            gap: 14,
            background: "rgba(255,255,255,0.10)",
          }}
        >
          <span style={{ opacity: 0.9, fontSize: 22 }}>🎤</span>
          <div style={{ opacity: 0.55, fontSize: 26 }}>Create Quiz</div>
          <div style={{ marginLeft: "auto", fontSize: 26, opacity: 0.9 }}>
            🤖
          </div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.35, fontSize: 14 }}>
          Disclaimer: All of your quiz results will be submitted to your
          teacher. So, please take quiz more carefully.
        </div>

        <div
          className="card"
          style={{
            marginTop: 18,
            borderRadius: 24,
            padding: 22,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 26,
            }}
          >
            🤖 <span>Question 1 of 3</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 24 }}>Which language ...</div>
          <div
            style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 22 }}
          >
            <label>
              <input type="checkbox" defaultChecked /> Java
            </label>
            <label>
              <input type="checkbox" /> HTML
            </label>
            <label>
              <input type="checkbox" /> CSS
            </label>
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button className="btn">Submit</button>
            <button className="btn">Skip</button>
          </div>
        </div>

        <ScoreModal
          open={open}
          variant="fail"
          scoreText="2/10"
          onClose={() => setOpen(false)}
        />
      </main>
    </div>
  );
}
