//src\components\common\Topbar.tsx
import notiIcon from "../../assets/icon_noti.png";
import userIcon from "../../assets/icon_user.png";
import searchIcon from "../../assets/icon_search.png";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="search-icon">
            <button className="icon-btn"><img className="topbar-icon" src={searchIcon} alt="search" /></button>
        </span>
        <input placeholder="Search" />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn"><img className="topbar-icon" src={notiIcon} alt="bell" /></button>
        <button className="icon-btn"><img className="topbar-icon" src={userIcon} alt="user" /></button>
      </div>
    </header>
  );
}
