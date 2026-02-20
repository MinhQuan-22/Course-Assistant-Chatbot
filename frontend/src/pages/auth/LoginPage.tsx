import { useNavigate } from "react-router-dom";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { PATHS } from "@/app/router/paths";

export default function LoginPage() {
  const nav = useNavigate();

  return (
    <div className="page">
      <div className="shell" style={{ position: "relative" }}>
        {/* Logo (placeholder) */}
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
            padding: "54px 64px",
            minHeight: 660,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 44,
          }}
        >
          {/* Left */}
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 56, margin: 0, fontWeight: 700 }}>
              Ready to Log in?
            </h1>

            <p
              style={{
                marginTop: 18,
                fontSize: 26,
                color: "var(--muted)",
                lineHeight: 1.45,
              }}
            >
              If you want to start
              <br />
              using our service,
              <br />
              please sign in using
              <br />
              Google.
            </p>

            <div style={{ marginTop: 36 }}>
              <GoogleSignInButton onClick={() => nav(PATHS.ROLE)} />
            </div>
          </div>

          {/* Right illustration placeholder */}
          <div style={{ width: 520, display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: 520,
                height: 420,
                borderRadius: 28,
                border: "1px dashed rgba(255,255,255,0.25)",
                display: "grid",
                placeItems: "center",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              TODO: Robot illustration (export từ Figma)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
