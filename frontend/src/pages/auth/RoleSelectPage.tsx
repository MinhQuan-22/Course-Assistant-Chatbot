//src\pages\auth\RoleSelectPage.tsx
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/app/router/paths";

export default function RoleSelectPage() {
  const nav = useNavigate();

  return (
    <div className="page">
      <div className="shell" style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontSize: 58,
            fontWeight: 700,
            opacity: 0.95,
          }}
        >
          3N
        </div>

        <div
          className="card"
          style={{
            marginTop: 42,
            padding: "80px 64px",
            minHeight: 660,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 62 }}>🤖</div>
            </div>

            <h1 style={{ fontSize: 50, margin: 0, fontWeight: 700 }}>
              Which role are you signing in for?
            </h1>

            <div
              style={{
                marginTop: 44,
                display: "flex",
                justifyContent: "center",
                gap: 34,
              }}
            >
              <button
                className="btnWhite"
                style={{
                  width: 420,
                  height: 92,
                  borderRadius: 22,
                  fontSize: 34,
                  fontWeight: 500,
                }}
                onClick={() => nav(PATHS.STUDENT.TRACK_PROGRESS)}
              >
                Student
              </button>

              <button
                className="btnWhite"
                style={{
                  width: 420,
                  height: 92,
                  borderRadius: 22,
                  fontSize: 34,
                  fontWeight: 500,
                }}
                onClick={() => nav(PATHS.TEACHER.HOME)}
              >
                Teacher
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
