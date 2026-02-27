import { useNavigate } from "react-router-dom";
import { PATHS } from "../../app/router/paths";

import logo from "../../assets/logo.png";
import robot from "../../assets/chatbot_role.png";

export default function RoleSelectPage() {
  const nav = useNavigate();

  return (
    <div className="role-page">
      <div className="role-shell">
        <img className="role-logo" src={logo} alt="3N" />

        <div className="role-card">
          <div className="role-center">
            <div className="role-title-row">
              <img className="role-robot" src={robot} alt="" />
              <h1 className="role-title">Which role are you signing in for?</h1>
            </div>

            <div className="role-actions">
              <button
                className="role-btn"
                type="button"
                onClick={() => nav(PATHS.STUDENT.TRACK_PROGRESS)}
              >
                Student
              </button>

              <button
                className="role-btn"
                type="button"
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