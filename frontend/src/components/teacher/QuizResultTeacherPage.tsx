import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IconExport, IconFilter } from "../../components/teacher/icons";

type Row = {
  id: string;
  quizName: string;
  studentName: string;
  score: string; // "10/10"
  date: string; // "21.01.2025"
};

export default function QuizResultTeacherPage() {
  const params = useParams();
  const classCode = (params.classCode as string) || "21020105";

  const [openFilter, setOpenFilter] = useState(false);
  const [quizFilter, setQuizFilter] = useState<"All" | "Quiz 1" | "Quiz 2">(
    "All",
  );

  const rowsAll: Row[] = useMemo(
    () => [
      {
        id: "r1",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
      {
        id: "r2",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
      {
        id: "r3",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
      {
        id: "r4",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
      {
        id: "r5",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
      {
        id: "r6",
        quizName: "Quiz 1",
        studentName: "Su Yi Phyo",
        score: "10/10",
        date: "21.01.2025",
      },
    ],
    [],
  );

  const rows = useMemo(() => {
    if (quizFilter === "All") return rowsAll;
    return rowsAll.filter((r) => r.quizName === quizFilter);
  }, [rowsAll, quizFilter]);

  const exportCSV = () => {
    const header = ["Quiz Name", "Student Name", "Score", "Date"];
    const lines = [header.join(",")].concat(
      rows.map((r) => [r.quizName, r.studentName, r.score, r.date].join(",")),
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz_results_${classCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "28px 36px", color: "rgba(255,255,255,0.95)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Title + actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            margin: "14px 0 18px",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 900 }}>
            Class Code - {classCode} (Quiz Results)
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setOpenFilter((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Filter"
            >
              <IconFilter />
              Filter
            </button>

            <button
              onClick={exportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Export CSV"
            >
              <IconExport />
              Export
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {openFilter && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 16,
              background: "rgba(70, 86, 150, 0.20)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.85, fontWeight: 900 }}>Quiz:</div>
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value as any)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.18)",
                  color: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  outline: "none",
                  minWidth: 220,
                }}
              >
                <option value="All">All</option>
                <option value="Quiz 1">Quiz 1</option>
                <option value="Quiz 2">Quiz 2</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            background: "rgba(0,0,0,0.10)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          }}
        >
          {/* header bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 0.6fr 0.7fr",
              padding: "16px 18px",
              background: "rgba(85, 100, 170, 0.35)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            <div>Quiz Name</div>
            <div>Student Name</div>
            <div>Score</div>
            <div>Date</div>
          </div>

          {/* rows */}
          <div>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 0.6fr 0.7fr",
                  padding: "26px 18px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 20,
                }}
              >
                <div>{r.quizName}</div>
                <div>{r.studentName}</div>
                <div>{r.score}</div>
                <div>{r.date}</div>
              </div>
            ))}
            {!rows.length && (
              <div style={{ padding: 18, opacity: 0.8 }}>No results.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
