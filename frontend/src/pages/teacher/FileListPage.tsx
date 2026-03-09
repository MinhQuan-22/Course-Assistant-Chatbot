import { useMemo, useState } from "react";

type Row = { id: string; name: string; type: string; date: string };

function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13 6l5 5"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 7h12"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5h6v2"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 7l1 14h6l1-14"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11v6"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FileListPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    "All" | "Lecture" | "Assignment" | "Exam"
  >("All");

  const [rows, setRows] = useState<Row[]>([
    { id: "f1", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
    { id: "f2", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
    { id: "f3", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
    { id: "f4", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
    { id: "f5", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
    { id: "f6", name: "Chapter 1", type: "Lecture", date: "21.01.2025" },
  ]);

  const filtered = useMemo(() => {
    if (typeFilter === "All") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [rows, typeFilter]);

  return (
    <div style={{ padding: "34px 44px", color: "rgba(255,255,255,0.95)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 8 }}>
          teacher file list
        </div>

        {/* Title + Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 900 }}>
            Total Uploaded Files
          </div>

          <button
            onClick={() => setFilterOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
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
        </div>

        {/* Filter panel */}
        {filterOpen && (
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
              <div style={{ opacity: 0.85, fontWeight: 900 }}>Type:</div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
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
                <option value="Lecture">Lecture</option>
                <option value="Assignment">Assignment</option>
                <option value="Exam">Exam</option>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr 0.8fr 120px",
              padding: "16px 18px",
              background: "rgba(85, 100, 170, 0.35)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            <div>File Name</div>
            <div>Type</div>
            <div>Date</div>
            <div style={{ textAlign: "right", opacity: 0.7 }}> </div>
          </div>

          {filtered.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr 0.8fr 120px",
                padding: "18px 18px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                alignItems: "center",
                fontSize: 20,
              }}
            >
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ opacity: 0.92 }}>{r.type}</div>
              <div style={{ opacity: 0.92 }}>{r.date}</div>

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 14 }}
              >
                <button
                  onClick={() => alert(`Edit ${r.id} (mock)`)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                  title="Edit"
                >
                  <IconEdit />
                </button>

                <button
                  onClick={() =>
                    setRows((prev) => prev.filter((x) => x.id !== r.id))
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                  title="Delete"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div style={{ padding: 18, opacity: 0.8 }}>No files found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
