//src\components\student\ProgressCard.tsx
import type { ReactNode } from "react";

type Props = {
  title: string;
  value?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export default function ProgressCard({
  title,
  value,
  leftSlot,
  rightSlot,
}: Props) {
  return (
    <div
      className="card"
      style={{ borderRadius: 22, padding: 22, minHeight: 130 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {leftSlot ? (
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {leftSlot}
            </div>
          ) : null}

          <div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.86)" }}>
              {title}
            </div>

            {value ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 48,
                  fontWeight: 700,
                  color: "rgba(130, 210, 255, 0.92)",
                }}
              >
                {value}
              </div>
            ) : null}
          </div>
        </div>

        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>
    </div>
  );
}
