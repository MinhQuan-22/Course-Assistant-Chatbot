//src\components\common\Sidebar.tsx
import { NavLink } from "react-router-dom";
import { paths } from "../../app/router/paths";
import dashboardIcon from "../../assets/icons/icon_dashboard.png";
import uploadIcon from "../../assets/icons/icon_upload.png";
import listIcon from "../../assets/icons/icon_list.png";
import logo from "../../assets/icons/logo.png";

function MenuItem({ to, label, iconSrc }: { to: string; label: string; iconSrc: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `side-item ${isActive ? "active" : ""}`}>
      <span className="side-icon">
        <img src={iconSrc} alt="" className="icon-img" />
      </span>
      <span>{label}</span>
    </NavLink>
  );
}


export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={logo} alt="3N Logo" className="brand-logo-img" />
      </div>

      <nav className="side-nav">
        <MenuItem to={paths.teacher.dashboard} label="Dashboard" iconSrc={dashboardIcon} />
        <MenuItem to={paths.teacher.upload} label="Upload" iconSrc={uploadIcon} />
        <MenuItem to={paths.teacher.list} label="List" iconSrc={listIcon} />
      </nav>

      <div className="side-footer">
        <button className="signout-btn" type="button">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
