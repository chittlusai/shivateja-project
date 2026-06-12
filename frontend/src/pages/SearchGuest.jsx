import { Eye, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listProperties, searchGuests } from "../shared/api.js";
import { getUser } from "../shared/auth.js";

export default function SearchGuest() {
  const user = getUser();
  const [filters, setFilters] = useState({ name: "", mobile: "", room_number: "", date: "", property_id: "" });
  const [properties, setProperties] = useState([]);
  const [guests, setGuests] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    listProperties()
      .then((data) => setProperties(data.properties))
      .catch((err) => setError(err.message));
  }, [user?.role]);

  function updateFilter(event) {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSearched(true);

    try {
      const data = await searchGuests(filters);
      setGuests(data.guests);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Records</p>
          <h1>Search Guests</h1>
        </div>
      </header>

      <form className="search-bar" onSubmit={handleSubmit}>
        <input name="name" placeholder="Guest name" value={filters.name} onChange={updateFilter} />
        <input name="mobile" placeholder="Mobile number" value={filters.mobile} onChange={updateFilter} />
        <input name="room_number" placeholder="Room number" value={filters.room_number} onChange={updateFilter} />
        <input name="date" type="date" value={filters.date} onChange={updateFilter} />
        {user?.role === "ADMIN" && (
          <select name="property_id" value={filters.property_id} onChange={updateFilter}>
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        )}
        <button className="primary-button" type="submit">
          <Search size={18} /> Search
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Room Number</th>
              <th>Mobile</th>
              <th>Property</th>
              <th>Check-in Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id}>
                <td>{guest.guest_name}</td>
                <td>{guest.room_number}</td>
                <td>{guest.mobile}</td>
                <td>{guest.property?.name || "-"}</td>
                <td>{guest.checkin_date}</td>
                <td>
                  <span className="status">{guest.status}</span>
                </td>
                <td>
                  <Link className="icon-link" to={`/guest/${guest.id}`} title="View guest">
                    <Eye size={18} /> View
                  </Link>
                </td>
              </tr>
            ))}
            {searched && guests.length === 0 && (
              <tr>
                <td className="empty" colSpan="7">
                  No matching guests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
