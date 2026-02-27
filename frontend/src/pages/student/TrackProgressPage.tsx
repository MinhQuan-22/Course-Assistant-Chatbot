//src\pages\student\TrackProgressPage.tsx
import { useNavigate } from "react-router-dom";
import ProgressCard from "../../components/student/ProgressCard";
import { PATHS } from "../../app/router/paths";

export default function TrackProgressPage() {
  const nav = useNavigate();

  const rows = [
    { quiz: "Quiz 1", score: "10/10", date: "21.01.2025" },
    { quiz: "Quiz 2", score: "9/10", date: "21.01.2025" },
    { quiz: "Quiz 3", score: "7/10", date: "21.01.2025" },
  ];

  return (
    <div className="page">
      <div className="shell">
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{ fontSize: 58, fontWeight: 700, opacity: 0.95, width: 90 }}
          >
            3N
          </div>

          <div
            className="card"
            style={{
              flex: 1,
              height: 58,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 12,
              maxWidth: 640,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ opacity: 0.85 }}>🔍</span>
            <input
              placeholder="Search"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "white",
                fontSize: 22,
              }}
            />
            <span style={{ opacity: 0.9 }}>🤖</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 26, opacity: 0.9 }}>🔔</div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.85)",
                opacity: 0.9,
              }}
            />
          </div>
        </div>

        {/* Cards row */}
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1.2fr 1.6fr 0.9fr",
            gap: 20,
          }}
        >
          <ProgressCard title="Total Quizzes Taken" value="12" leftSlot="💬" />

          <ProgressCard
            title="Your Performance within a month"
            rightSlot={
              <div
                style={{
                  width: 240,
                  height: 76,
                  opacity: 0.85,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ color: "rgba(171,140,255,0.95)" }}>
                  📈 chart
                </span>
              </div>
            }
          />

          <div
            className="card"
            style={{ borderRadius: 22, padding: 22, minHeight: 130 }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
              Highest Rank
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                fontSize: 18,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                🥇 <span>Quiz 1 - 10/10</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                🥈 <span>Quiz 3 - 9/10</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                🥉 <span>Quiz 6 - 8/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter / Export */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button className="btn">⏷ Filter</button>
          <button className="btn">⬇ Export</button>
        </div>

        {/* Table */}
        <div
          className="card"
          style={{
            marginTop: 14,
            borderRadius: 22,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              padding: "18px 22px",
              background: "rgba(255,255,255,0.06)",
              borderBottom: "1px solid var(--stroke)",
              fontSize: 22,
            }}
          >
            <div>Quiz</div>
            <div>Score</div>
            <div>Date</div>
          </div>

          {rows.map((r) => (
            <div
              key={r.quiz}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                padding: "18px 22px",
                fontSize: 22,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div>{r.quiz}</div>
              <div>{r.score}</div>
              <div>{r.date}</div>
            </div>
          ))}
        </div>

        {/* Floating chat */}
        <button
          className="card"
          style={{
            position: "fixed",
            right: 54,
            bottom: 54,
            width: 165,
            height: 165,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
          onClick={() => nav(PATHS.STUDENT.QUIZ_SUCCESS)}
          title="Chat with me!"
        >
          <div style={{ fontSize: 44 }}>🤖</div>
          <div style={{ marginTop: 6, fontSize: 16, color: "var(--muted)" }}>
            Chat with me!
          </div>
        </button>
      </div>
    </div>
  );
}
