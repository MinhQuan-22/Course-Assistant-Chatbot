import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IconChart, IconChat, IconDoc, IconHelp, IconUsers } from "../../components/teacher/icons";

type TabKey = "announcements" | "createQuiz" | "results";

export default function ClassDetailPage() {
  const params = useParams();
  // UI shows "Class Code - 21020105"
  const classCode = (params.classCode as string) || "21020105";

  const [tab, setTab] = useState<TabKey>("announcements");

  const announcements = useMemo(
    () => [
      { id: "a1", week: "Week 1", title: "Introduction to Programming" },
      { id: "a2", week: "Week 1", title: "Introduction to Programming" },
      { id: "a3", week: "Week 1", title: "Introduction to Programming" },
      { id: "a4", week: "Week 1", title: "Introduction to Programming" },
      { id: "a5", week: "Week 1", title: "Introduction to Programming" },
    ],
    []
  );

  const students = useMemo(
    () => [
      "Su Yi Phyo",
      "Mitthavong Benjouly",
      "Su Yi Phyo",
      "Su Yi Phyo",
      "Mitthavong Benjouly",
      "Su Yi Phyo",
      "Mitthavong Benjouly",
      "Su Yi Phyo",
      "Su Yi Phyo",
      "Su Yi Phyo",
    ],
    []
  );

  const quizRows = useMemo(
    () => [
      { id: "q1", quiz: "Quiz 1", student: "Su Yi Phyo", score: "10/10", date: "21.01.2025" },
      { id: "q2", quiz: "Quiz 1", student: "Su Yi Phyo", score: "10/10", date: "21.01.2025" },
      { id: "q3", quiz: "Quiz 1", student: "Su Yi Phyo", score: "10/10", date: "21.01.2025" },
    ],
    []
  );

  const TabBtn = ({
    active,
    icon,
    label,
    onClick,
  }: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 18px",
        borderRadius: 14,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: active ? "rgba(120, 220, 255, 0.95)" : "rgba(255,255,255,0.65)",
        fontWeight: 900,
        fontSize: 20,
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ padding: "28px 36px", color: "rgba(255,255,255,0.95)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ fontSize: 40, fontWeight: 900, margin: "14px 0 22px" }}>
          Class Code - {classCode}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22 }}>
          {/* LEFT main card */}
          <div
            style={{
              borderRadius: 22,
              background: "rgba(85, 100, 170, 0.30)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, padding: "18px 20px 10px" }}>
              <TabBtn
                active={tab === "announcements"}
                icon={<IconUsers />}
                label="Announcements"
                onClick={() => setTab("announcements")}
              />
              <TabBtn
                active={tab === "createQuiz"}
                icon={<IconHelp />}
                label="Create Quiz"
                onClick={() => setTab("createQuiz")}
              />
              <TabBtn
                active={tab === "results"}
                icon={<IconChart />}
                label="Results"
                onClick={() => setTab("results")}
              />
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "0 20px" }} />

            {/* Content */}
            <div style={{ padding: "10px 18px 18px" }}>
              {tab === "announcements" && (
                <div style={{ display: "grid" }}>
                  {announcements.map((a) => (
                    <div key={a.id} style={{ padding: "18px 8px" }}>
                      <div style={{ fontSize: 26, fontWeight: 900, opacity: 0.95 }}>{a.week}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, opacity: 0.92 }}>
                        <IconDoc />
                        <div style={{ fontSize: 18 }}>{a.title}</div>
                      </div>

                      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginTop: 18 }} />
                    </div>
                  ))}
                </div>
              )}

              {tab === "createQuiz" && (
                <div style={{ padding: 16, opacity: 0.9 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Create Quiz (mock)</div>
                  <div style={{ opacity: 0.8, lineHeight: 1.6 }}>
                    This tab is UI-only for now. You can connect it later to Quiz Generator (Suyi part).
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 520 }}>
                    <input
                      placeholder="Quiz title..."
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.18)",
                        color: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        outline: "none",
                      }}
                    />
                    <textarea
                      placeholder="Notes / description..."
                      rows={4}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.18)",
                        color: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                    <button
                      onClick={() => alert("Create (mock)")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.92)",
                        cursor: "pointer",
                        fontWeight: 900,
                        width: 180,
                      }}
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              {tab === "results" && (
                <div style={{ padding: "6px 8px 14px" }}>
                  {/* table header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 0.7fr 0.8fr",
                      padding: "14px 14px",
                      background: "rgba(30, 40, 90, 0.25)",
                      borderRadius: 14,
                      fontWeight: 900,
                      fontSize: 18,
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <div>Quiz Name</div>
                    <div>Student Name</div>
                    <div>Score</div>
                    <div>Date</div>
                  </div>

                  {quizRows.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 0.7fr 0.8fr",
                        padding: "22px 14px",
                        borderBottom: "1px solid rgba(255,255,255,0.10)",
                        fontSize: 20,
                      }}
                    >
                      <div>{r.quiz}</div>
                      <div>{r.student}</div>
                      <div>{r.score}</div>
                      <div>{r.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT student list card */}
          <div
            style={{
              borderRadius: 22,
              background: "rgba(85, 100, 170, 0.30)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              padding: 16,
              height: "fit-content",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>
              Student List
            </div>

            <div style={{ display: "grid", gap: 10, maxHeight: 560, overflow: "auto", paddingRight: 6 }}>
              {students.map((name, idx) => (
                <div
                  key={`${name}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 10px",
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.10)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      border: "2px solid rgba(255,255,255,0.20)",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(0,0,0,0.12)",
                      fontWeight: 900,
                    }}
                  >
                    {name.trim()[0]?.toUpperCase() ?? "S"}
                  </div>

                  <div style={{ fontWeight: 800, opacity: 0.92 }}>{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* tiny hint for future: */}
        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 13 }}>
          Tip: you can map route like <b>/teacher/class/:classCode</b> to open this page.
        </div>
      </div>
    </div>
  );
}