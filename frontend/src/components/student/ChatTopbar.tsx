//src\components\student\ChatTopbar.tsx
import logoIcon from "../../assets/logo.png";
import dropdownIcon from "../../assets/icon_dropdown.png";
import profileIcon from "../../assets/icon_user.png";


export default function ChatTopbar() {
  return (
    <header className="chat-topbar">
      <div className="chat-brand">
        <img className="chat-brand-logo" src={logoIcon} alt="3N" />
        <button className="chat-brand-caret" type="button" aria-label="Open menu">
          <img src={dropdownIcon} alt="" />
        </button>
      </div>

      <button className="chat-profile" type="button" aria-label="Profile">
        <img src={profileIcon} alt="Profile" />
      </button>
    </header>
  );
}
