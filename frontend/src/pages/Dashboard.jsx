import { Search, UserCog, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { getUser } from "../shared/auth.js";

export default function Dashboard() {
  const user = getUser();

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Welcome {user?.username || "Admin"}</h1>
        </div>
      </header>

      <div className="action-grid">
        <Link className="action-tile" to="/guest/new">
          <UserPlus size={28} />
          <strong>New Guest</strong>
          <span>Create a check-in record with ID images and photo.</span>
        </Link>
        <Link className="action-tile" to="/guest/search">
          <Search size={28} />
          <strong>Search Guest</strong>
          <span>Find records by name, mobile, room, or date.</span>
        </Link>
        <Link className="action-tile" to="/guests">
          <Users size={28} />
          <strong>All Records</strong>
          <span>View every guest record saved by the team.</span>
        </Link>
        {user?.role === "ADMIN" && (
          <Link className="action-tile" to="/managers">
            <UserCog size={28} />
            <strong>Manager Logins</strong>
            <span>Create manager accounts for reception staff.</span>
          </Link>
        )}
      </div>
    </section>
  );
}
