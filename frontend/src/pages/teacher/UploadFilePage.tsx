import { useCallback, useMemo, useRef, useState } from "react";

type FileCategory = "Lecture" | "Assignment" | "Exam" | "Other";

type ClassItem = { code: string; name: string };
type QueueItem = {
  id: string;
  name: string;
  ext: string;
  size: number;
  category: FileCategory;
  createdAt: string; // dd.mm.yyyy
  status: "queued" | "uploading" | "processing" | "ready" | "failed";
};

const MOCK_CLASSES: ClassItem[] = [
  { code: "21020105", name: "Introduction to Programming" },
  { code: "21020106", name: "Design Patterns" },
  { code: "21020107", name: "Database" },
];

const CATEGORIES: { label: string; value: FileCategory }[] = [
  { label: "Lecture", value: "Lecture" },
  { label: "Assignment", value: "Assignment" },
  { label: "Exam", value: "Exam" },
  { label: "Other", value: "Other" },
];

const ACCEPTED_EXTS = [".pdf", ".docx", ".txt"];

function fmtBytes(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let v = n;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  return `${v.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function getExt(filename: string) {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "";
}

function isAccepted(filename: string) {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext));
}

function randId() {
  return Math.random().toString(16).slice(2);
}

export default function UploadFilePage() {
  const [classCode, setClassCode] = useState<string>(
    MOCK_CLASSES[0]?.code ?? "",
  );
  const [category, setCategory] = useState<FileCategory>("Lecture");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedClass = useMemo(
    () => MOCK_CLASSES.find((c) => c.code === classCode),
    [classCode],
  );

  const onFilesSelected = useCallback(
    (files: File[]) => {
      if (!classCode) return;
      const valid = files.filter((f) => isAccepted(f.name));
      if (!valid.length) return;

      const items: QueueItem[] = valid.map((f) => ({
        id: `q_${randId()}`,
        name: f.name.replace(/\.[^/.]+$/, ""),
        ext: getExt(f.name),
        size: f.size,
        category,
        createdAt: todayDDMMYYYY(),
        status: "queued",
      }));

      setQueue((prev) => [...items, ...prev]);
    },
    [classCode, category],
  );

  const startUploadAll = () => {
    if (!queue.length) return;

    // Mock upload process
    setQueue((prev) => prev.map((x) => ({ ...x, status: "uploading" })));

    setTimeout(() => {
      setQueue((prev) => prev.map((x) => ({ ...x, status: "processing" })));
    }, 700);

    setTimeout(() => {
      setQueue((prev) => prev.map((x) => ({ ...x, status: "ready" })));
    }, 1500);
  };

  const removeItem = (id: string) =>
    setQueue((prev) => prev.filter((x) => x.id !== id));

  const pickFiles = () => inputRef.current?.click();

  return (
    <div style={{ padding: "34px 44px", color: "rgba(255,255,255,0.95)" }}>
      <div
        style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 12,
          }}
        >
          <div>
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              teacher upload file
            </div>
            <div style={{ fontSize: 34, fontWeight: 900 }}>Upload</div>
          </div>

          <button
            onClick={startUploadAll}
            disabled={!queue.length}
            style={{
              padding: "10px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.16)",
              background: queue.length
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.92)",
              cursor: queue.length ? "pointer" : "not-allowed",
              fontWeight: 900,
            }}
          >
            Upload {queue.length ? `(${queue.length})` : ""}
          </button>
        </div>

        {/* Select class */}
        <div
          style={{
            padding: 18,
            borderRadius: 22,
            background: "rgba(85, 100, 170, 0.30)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
            Choose your class
          </div>
          <select
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              outline: "none",
            }}
          >
            {MOCK_CLASSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          {selectedClass && (
            <div style={{ marginTop: 10, opacity: 0.78 }}>
              Selected: <b>{selectedClass.code}</b> — {selectedClass.name}
            </div>
          )}
        </div>

        {/* Select category */}
        <div
          style={{
            padding: 18,
            borderRadius: 22,
            background: "rgba(85, 100, 170, 0.30)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
            Choose your file category
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FileCategory)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              outline: "none",
            }}
          >
            {CATEGORIES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropzone */}
        <div
          onClick={pickFiles}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFilesSelected(Array.from(e.dataTransfer.files));
          }}
          style={{
            cursor: "pointer",
            userSelect: "none",
            borderRadius: 22,
            minHeight: 260,
            display: "grid",
            placeItems: "center",
            background: "rgba(85, 100, 170, 0.22)",
            border: dragOver
              ? "2px solid rgba(255,255,255,0.65)"
              : "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            transition: "all .12s ease",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTS.join(",")}
            style={{ display: "none" }}
            onChange={(e) => onFilesSelected(Array.from(e.target.files ?? []))}
          />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 54, marginBottom: 8 }}>⬆️</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              Upload files here
            </div>
            <div style={{ opacity: 0.85, fontWeight: 700 }}>
              (PDF, DOCX, TXT)
            </div>
          </div>
        </div>

        {/* Queue */}
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
              padding: "14px 18px",
              background: "rgba(85, 100, 170, 0.35)",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            Queue
          </div>

          {!queue.length ? (
            <div style={{ padding: 18, opacity: 0.8 }}>No file in queue.</div>
          ) : (
            <div>
              {queue.map((q) => (
                <div
                  key={q.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 0.6fr 120px",
                    gap: 12,
                    padding: "16px 18px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {q.name}.{q.ext}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>
                      {fmtBytes(q.size)} • {q.category}
                    </div>
                  </div>
                  <div style={{ opacity: 0.9 }}>{q.createdAt}</div>
                  <div
                    style={{
                      opacity: 0.9,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    {q.status}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => removeItem(q.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.9)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ opacity: 0.7, fontSize: 13 }}>
          Note: This page is UI-only (mock). Later you can connect to API
          upload.
        </div>
      </div>
    </div>
  );
}
