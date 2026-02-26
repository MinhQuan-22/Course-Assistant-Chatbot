//src\components\student\ScoreModal.tsx
type Props = {
  open: boolean;
  variant: "success" | "fail";
  scoreText: string;
  onClose: () => void;
};

export default function ScoreModal({
  open,
  variant,
  scoreText,
  onClose,
}: Props) {
  if (!open) return null;

  const scoreColor =
    variant === "success"
      ? "rgba(130, 210, 255, 0.92)"
      : "rgba(255, 92, 92, 0.92)";
  const title =
    variant === "success" ? "Yay....Your Score is" : "Oh No....Your Score is";
  const sub = variant === "success" ? "Keep Going!!" : "Never Give Up!";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          borderRadius: 26,
          padding: 26,
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          className="btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            padding: 0,
            borderRadius: 10,
            fontSize: 18,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        <div style={{ fontSize: 58, marginTop: 6 }}>🤖</div>

        <div
          style={{
            marginTop: 12,
            fontSize: 24,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 64,
            fontWeight: 800,
            color: scoreColor,
          }}
        >
          {scoreText}
        </div>

        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.65)" }}>
          {sub}
        </div>
      </div>
    </div>
  );
}
