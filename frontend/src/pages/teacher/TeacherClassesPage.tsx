import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ClassRow = {
  code: string;
  name: string;
  semester: string;
  students: number;
  updatedAt: string; // dd.mm.yyyy
};

function IconOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 7h10v10H10V7z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 11l6-6"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 5h4v4"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 9V7h6"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 17v-4"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 19H4v-2"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TeacherClassesPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const rows: ClassRow[] = useMemo(
    () => [
      {
        code: "21020105",
        name: "Introduction to Programming",
        semester: "2025-2026",
        students: 42,
        updatedAt: "21.01.2025",
      },
      {
        code: "21020106",
        name: "Design Patterns",
        semester: "2025-2026",
        students: 36,
        updatedAt: "18.01.2025",
      },
      {
        code: "21020107",
        name: "Database Systems",
        semester: "2025-2026",
        students: 48,
        updatedAt: "10.01.2025",
      },
      {
        code: "21020108",
        name: "Web Development",
        semester: "2025-2026",
        students: 40,
        updatedAt: "05.01.2025",
      },
      {
        code: "21020109",
        name: "Data Mining",
        semester: "2025-2026",
        students: 33,
        updatedAt: "02.01.2025",
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        r.semester.toLowerCase().includes(s),
    );
  }, [q, rows]);

  return (
    <div style={{ padding: "34px 44px", color: "rgba(255,255,255,0.95)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 8 }}>
          teacher classes
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 900 }}>All Classes</div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code / name / semester..."
            style={{
              width: 360,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            background: "rgba(0,0,0,0.10)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          }}
        >
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.7fr 1.5fr 0.8fr 0.7fr 140px",
              padding: "16px 18px",
              background: "rgba(85, 100, 170, 0.35)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            <div>Class Code</div>
            <div>Class Name</div>
            <div>Semester</div>
            <div>Students</div>
            <div style={{ textAlign: "right", opacity: 0.7 }}> </div>
          </div>

          {/* rows */}
          {filtered.map((r) => (
            <div
              key={r.code}
              style={{
                display: "grid",
                gridTemplateColumns: "0.7fr 1.5fr 0.8fr 0.7fr 140px",
                padding: "18px 18px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                alignItems: "center",
                fontSize: 18,
              }}
            >
              <div style={{ fontWeight: 900 }}>{r.code}</div>
              <div style={{ fontWeight: 700, opacity: 0.95 }}>
                {r.name}
                <div style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}>
                  Updated: {r.updatedAt}
                </div>
              </div>
              <div style={{ opacity: 0.9 }}>{r.semester}</div>
              <div style={{ opacity: 0.9 }}>{r.students}</div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => nav(`/teacher/class/${r.code}`)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                  title="Open class detail"
                >
                  <IconOpen />
                  Open
                </button>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div style={{ padding: 18, opacity: 0.8 }}>No classes found.</div>
          )}
        </div>

        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 13 }}>
          Click <b>Open</b> to go to Class Detail, then you can view Results.
        </div>
      </div>
    </div>
  );
}
