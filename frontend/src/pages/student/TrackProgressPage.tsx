import { useNavigate } from "react-router-dom";
import ProgressCard from "@/components/student/ProgressCard";
import { paths } from "@/app/router/paths";

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
        <div className="tp-topbar">
          <div className="tp-brand">3N</div>

          <div className="tp-search">
            <span className="tp-search-ico">🔍</span>
            <input className="tp-search-input" placeholder="Search" />
            <span className="tp-search-bot">🤖</span>
          </div>

          <div className="tp-actions">
            <button className="tp-iconBtn" aria-label="Notifications">
              🔔
            </button>
            <button className="tp-avatarBtn" aria-label="Profile" />
          </div>
        </div>

        {/* Cards */}
        <div className="tp-cards">
          <ProgressCard title="Total Quizzes Taken" value="12" leftSlot="💬" />

          <ProgressCard
            title="Your Performance within a month"
            rightSlot={
              <div className="tp-chartMock">
                <span>📈 chart</span>
              </div>
            }
          />

          <div className="card tp-rankCard">
            <div className="tp-rankTitle">Highest Rank</div>

            <div className="tp-rankList">
              <div className="tp-rankItem">
                🥇 <span>Quiz 1 - 10/10</span>
              </div>
              <div className="tp-rankItem">
                🥈 <span>Quiz 3 - 9/10</span>
              </div>
              <div className="tp-rankItem">
                🥉 <span>Quiz 6 - 8/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter / Export */}
        <div className="tp-toolbar">
          <button className="btn">⏷ Filter</button>
          <button className="btn">⬇ Export</button>
        </div>

        {/* Table */}
        <div className="card tp-tableCard">
          <div className="tp-tableWrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.quiz}>
                    <td>{r.quiz}</td>
                    <td>{r.score}</td>
                    <td>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating chatbot */}
        <button
          className="tp-fab"
          onClick={() => nav(paths.student.chat)}
          title="Chat with me!"
        >
          <div className="tp-fabIcon">🤖</div>
          <div className="tp-fabText">Chat with me!</div>
        </button>
      </div>
    </div>
  );
}
