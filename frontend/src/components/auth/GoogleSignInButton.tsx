//src\components\auth\GoogleSignInButton.tsx
type Props = {
  onClick?: () => void;
};

export default function GoogleSignInButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="btnWhite"
      style={{
        height: 78,
        padding: "0 26px",
        borderRadius: 18,
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        fontSize: 26,
        fontWeight: 500,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        cursor: "pointer",
      }}
    >
      {/* Google "G" đơn giản (SVG) */}
      <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.2 6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.3-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.2 6 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.3 0 10.1-2 13.8-5.3l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.7-3.9 5l6.4 5.4C36.9 40.7 44 36 44 24c0-1.1-.1-2.3-.4-3.5z"
        />
      </svg>

      <span>Sign in with Google</span>
    </button>
  );
}
