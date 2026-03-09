import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

type Row = {
  id: string;
  classCode: string;
  quizName: string;
  studentName: string;
  score: string; // "10/10"
  date: string; // "21.01.2025"
};

function IconFilter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v10"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 7l4-4 4 4"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 14v6h16v-6"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function QuizResultTeacherPage() {
  const params = useParams();
  const classCodeParam = params.classCode as string | undefined; // optional
  const isSingleClass = !!classCodeParam;

  const [openFilter, setOpenFilter] = useState(false);
  const [classFilter, setClassFilter] = useState<string>(
    classCodeParam ?? "All",
  );
  const [quizFilter, setQuizFilter] = useState<string>("All");
  const [studentFilter, setStudentFilter] = useState<string>("All");

  // ✅ mock results for MANY classes
  const rowsAll: Row[] = useMemo(() => {
    const base = (
      classCode: string,
      student: string,
      quiz: string,
      score: string,
      date: string,
      n: number,
    ) =>
      Array.from({ length: n }).map((_, i) => ({
        id: `${classCode}_${quiz}_${student}_${i}`,
        classCode,
        quizName: quiz,
        studentName: student,
        score,
        date,
      }));

    return [
      ...base("21020105", "Su Yi Phyo", "Quiz 1", "10/10", "21.01.2025", 6),
      ...base(
        "21020105",
        "Mitthavong Benjouly",
        "Quiz 1",
        "9/10",
        "21.01.2025",
        2,
      ),
      ...base("21020106", "Su Yi Phyo", "Quiz 1", "8/10", "20.01.2025", 3),
      ...base("21020106", "Kiro", "Quiz 2", "7/10", "22.01.2025", 2),
      ...base("21020107", "Trang", "Quiz 1", "9/10", "19.01.2025", 2),
    ];
  }, []);

  const classOptions = useMemo(() => {
    const set = new Set(rowsAll.map((r) => r.classCode));
    return ["All", ...Array.from(set)];
  }, [rowsAll]);

  const quizOptions = useMemo(() => {
    const set = new Set(rowsAll.map((r) => r.quizName));
    return ["All", ...Array.from(set)];
  }, [rowsAll]);

  const studentOptions = useMemo(() => {
    const set = new Set(rowsAll.map((r) => r.studentName));
    return ["All", ...Array.from(set)];
  }, [rowsAll]);

  // if open from /teacher/class/:classCode/results → lock classFilter
  const effectiveClassFilter = isSingleClass ? classCodeParam! : classFilter;

  const rows = useMemo(() => {
    let r = rowsAll;
    if (effectiveClassFilter !== "All")
      r = r.filter((x) => x.classCode === effectiveClassFilter);
    if (quizFilter !== "All") r = r.filter((x) => x.quizName === quizFilter);
    if (studentFilter !== "All")
      r = r.filter((x) => x.studentName === studentFilter);
    return r;
  }, [rowsAll, effectiveClassFilter, quizFilter, studentFilter]);

  const exportCSV = () => {
    const header = isSingleClass
      ? ["Quiz Name", "Student Name", "Score", "Date"]
      : ["Class Code", "Quiz Name", "Student Name", "Score", "Date"];

    const lines = [header.join(",")].concat(
      rows.map((r) =>
        isSingleClass
          ? [r.quizName, r.studentName, r.score, r.date].join(",")
          : [r.classCode, r.quizName, r.studentName, r.score, r.date].join(","),
      ),
    );

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isSingleClass
      ? `quiz_results_${classCodeParam}.csv`
      : `quiz_results_all_classes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const title = isSingleClass
    ? `Class Code - ${classCodeParam} (Quiz Results)`
    : `Quiz Results (All Classes)`;

  return (
    <div style={{ padding: "28px 36px", color: "rgba(255,255,255,0.95)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 8 }}>
          quiz results (teacher view)
        </div>

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
          <div style={{ fontSize: 40, fontWeight: 900 }}>{title}</div>

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
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* Class filter only when ALL mode */}
              {!isSingleClass && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ opacity: 0.85, fontWeight: 900 }}>Class:</div>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.18)",
                      color: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      outline: "none",
                      minWidth: 180,
                    }}
                  >
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ opacity: 0.85, fontWeight: 900 }}>Quiz:</div>
                <select
                  value={quizFilter}
                  onChange={(e) => setQuizFilter(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.18)",
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    outline: "none",
                    minWidth: 180,
                  }}
                >
                  {quizOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ opacity: 0.85, fontWeight: 900 }}>Student:</div>
                <select
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.18)",
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    outline: "none",
                    minWidth: 240,
                  }}
                >
                  {studentOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (!isSingleClass) setClassFilter("All");
                  setQuizFilter("All");
                  setStudentFilter("All");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Reset
              </button>
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
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSingleClass
                ? "1fr 1fr 0.6fr 0.7fr"
                : "0.7fr 1fr 1fr 0.6fr 0.7fr",
              padding: "16px 18px",
              background: "rgba(85, 100, 170, 0.35)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {!isSingleClass && <div>Class Code</div>}
            <div>Quiz Name</div>
            <div>Student Name</div>
            <div>Score</div>
            <div>Date</div>
          </div>

          {/* Rows */}
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: isSingleClass
                  ? "1fr 1fr 0.6fr 0.7fr"
                  : "0.7fr 1fr 1fr 0.6fr 0.7fr",
                padding: "26px 18px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                fontSize: 20,
              }}
            >
              {!isSingleClass && <div>{r.classCode}</div>}
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
  );
}
