import { useNavigate } from "react-router-dom";
import googleIcon from "../../assets/icon_google.png";
import logo from "../../assets/logo.png";
import { PATHS } from "../../app/router/paths";

export default function LoginPage() {
  const nav = useNavigate();

  return (
    <div className="login-page">
      <img className="login-logo" src={logo} alt="3N" />

      <div className="login-content">
        <h1 className="login-title">Ready to Log in?</h1>

        <p className="login-sub">
          If you want to start
          <br />
          using our service,
          <br />
          please sign in using
          <br />
          Google.
        </p>

        <button
          className="google-btn"
          onClick={() => nav(PATHS.ROLE)}
        >
          <img src={googleIcon} alt="Google" />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}