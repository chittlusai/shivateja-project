import { Home, LogOut, Search, UserCog, UserPlus, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import logoUrl from "../../assets/logo.png";
import { clearSession, getUser } from "./auth.js";

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const brandName = user?.role === "ADMIN" ? "Swapna Grand" : user?.property?.name || "Swapna Grand";
  const brandSubtitle = user?.role === "ADMIN" ? "ADMIN" : "";

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={logoUrl} alt="Swapna Grand logo" />
          <div>
            <strong>{brandName}</strong>
            {brandSubtitle && <span>{brandSubtitle}</span>}
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            <Home size={18} /> Dashboard
          </NavLink>
          <NavLink to="/guest/new">
            <UserPlus size={18} /> New Guest
          </NavLink>
          <NavLink to="/guests">
            <Users size={18} /> Records
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/managers">
              <UserCog size={18} /> Managers
            </NavLink>
          )}
          <NavLink to="/guest/search">
            <Search size={18} /> Search
          </NavLink>
        </nav>

        <button className="ghost-button logout-button" onClick={logout} type="button">
          <LogOut size={18} /> Logout
        </button>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
