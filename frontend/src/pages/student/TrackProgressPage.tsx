import { useNavigate } from "react-router-dom";
import { paths } from "@/app/router/paths";
import logoIcon from "../../assets/logo.png";
import searchIcon from "../../assets/icon_search.png";
import notiIcon from "../../assets/icon_noti.png";
import userIcon from "../../assets/icon_user.png";
import filterIcon from "../../assets/icon_filter.png";
import exportIcon from "../../assets/icon_export.png";
import lineChartIcon from "../../assets/icon_line_chart.png";
import goldMedalIcon from "../../assets/icon_gold_medal.png";
import silverMedalIcon from "../../assets/icon_silver_medal.png";
import bronzeMedalIcon from "../../assets/icon_bronze_medal.png";
import chatbotRoleIcon from "../../assets/chatbot_role.png";
import chatbotIcon from "../../assets/chatbot.png";

export default function TrackProgressPage() {
  const nav = useNavigate();

  const rows = [
    { quiz: "Quiz 1", score: "10/10", date: "21.01.2025" },
    { quiz: "Quiz 2", score: "9/10", date: "21.01.2025" },
    { quiz: "Quiz 3", score: "7/10", date: "21.01.2025" },
  ];

  const rankings = [
    { icon: goldMedalIcon, label: "Quiz 1 - 10/10" },
    { icon: silverMedalIcon, label: "Quiz 3 - 9/10" },
    { icon: bronzeMedalIcon, label: "Quiz 6 - 8/10" },
  ];

  return (
    <div className="page tp-page">
      <div className="shell tp-shell">
        <header className="tp-topbar">
          <img className="tp-brandLogo" src={logoIcon} alt="3N" />

          <div className="tp-searchWrap">
            <label className="tp-search" aria-label="Search progress">
              <img className="tp-searchIcon" src={searchIcon} alt="" />
              <input className="tp-search-input" placeholder="Search" />
            </label>

            <img className="tp-searchBot" src={chatbotRoleIcon} alt="" />
          </div>

          <div className="tp-actions">
            <button
              className="tp-headerIconBtn"
              type="button"
              aria-label="Notifications"
            >
              <img src={notiIcon} alt="" />
            </button>

            <button
              className="tp-headerProfileBtn"
              type="button"
              aria-label="Profile"
            >
              <img src={userIcon} alt="" />
            </button>
          </div>
        </header>

        <section className="tp-overview">
          <div className="tp-mainColumn">
            <div className="tp-summaryRow">
              <article className="card tp-panel tp-statCard">
                <div className="tp-statIconBox">
                  <div className="tp-statBubble">?</div>
                </div>

                <div className="tp-statContent">
                  <div className="tp-statTitle">Total Quizzes Taken</div>
                  <div className="tp-statValue">12</div>
                </div>
              </article>

              <article className="card tp-panel tp-performanceCard">
                <div className="tp-performanceText">
                  <div className="tp-performanceTitle">Your Performance</div>
                  <div className="tp-performanceTitle">within a month</div>
                </div>

                <div className="tp-performanceChart" aria-hidden="true">
                  <img src={lineChartIcon} alt="" />
                </div>
              </article>
            </div>

            <div className="tp-toolbar">
              <button className="tp-actionBtn" type="button">
                <img src={filterIcon} alt="" />
                <span>Filter</span>
              </button>

              <button className="tp-actionBtn" type="button">
                <img src={exportIcon} alt="" />
                <span>Export</span>
              </button>
            </div>

            <article className="card tp-panel tp-tableCard">
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
            </article>
          </div>

          <div className="tp-sideColumn">
            <aside className="card tp-panel tp-rankCard">
              <div className="tp-rankTitle">Highest Rank</div>

              <div className="tp-rankList">
                {rankings.map((item) => (
                  <div className="tp-rankItem" key={item.label}>
                    <img src={item.icon} alt="" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </aside>

            <button
              className="tp-fab"
              type="button"
              onClick={() => nav(paths.student.chat)}
              title="Chat with me!"
            >
              <div className="tp-fabCircle">
                <div className="tp-fabBotStage">
                  <img className="tp-fabBot" src={chatbotIcon} alt="" />
                </div>
              </div>
              <div className="tp-fabText">Chat with me!</div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
