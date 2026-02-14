const demoClasses = [
  {
    code: "21020105",
    progress: 0.55,
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60",
  },
  {
    code: "21020105",
    progress: 0.65,
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=60",
  },
  {
    code: "21020105",
    progress: 0.35,
    img: "C:\Uni\course-assistant-chatbot\frontend\src\assets\icons\manwithlaptop.jpg",
  },
];

const topStudents = [
  { name: "Nguyen Van A", score: 95, avatar: "https://i.pravatar.cc/80?img=12" },
  { name: "Tran Thi B", score: 91, avatar: "https://i.pravatar.cc/80?img=32" },
  { name: "Le Van C", score: 88, avatar: "https://i.pravatar.cc/80?img=45" },
];

export default function DashboardPage() {
  return (
    <div className="dash-grid">
      {/* LEFT */}
      <section className="dash-left">
        <div className="dash-row">
          <StatCard title="Recent Uploads" value="12" icon="⏱️" />
          <StatCard title="Uploaded Files" value="32" icon="📄" />
        </div>

        <div className="chart-card">
          <div className="chart">
            <div className="bar" style={{ height: "55%" }} />
            <div className="bar accent" style={{ height: "95%" }} />
            <div className="bar" style={{ height: "65%" }} />
            <div className="bar accent" style={{ height: "88%" }} />
          </div>
          <div className="chart-x">
            <span>21020105</span>
            <span>21020105</span>
            <span>21020105</span>
            <span>21020105</span>
            <span className="chart-label">Class Code</span>
          </div>
        </div>

        <h2 className="section-title">Your classes</h2>

        <div className="class-row">
          {demoClasses.map((c, idx) => (
            <div className="class-card" key={idx}>
              <div className="class-img" style={{ backgroundImage: `url(${c.img})` }} />
              <div className="class-meta">
                <div className="class-title">Class Code - {c.code}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${c.progress * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RIGHT */}
      <aside className="dash-right">
        <div className="panel">
          <div className="panel-title">Top 3 Students</div>

          <div className="student-list">
            {topStudents.map((s, i) => (
              <div className="student-item" key={i}>
                <img className="student-avatar" src={s.avatar} alt={s.name} />
                <div className="student-info">
                  <div className="student-name">{s.name}</div>
                  <div className="student-sub">Score: {s.score}</div>
                </div>
                <div className="student-rank">#{i + 1}</div>
              </div>
            ))}
          </div>

          <div className="panel-actions">
            <button className="circle-btn" type="button">
              ‹
            </button>
            <button className="circle-btn" type="button">
              ›
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
