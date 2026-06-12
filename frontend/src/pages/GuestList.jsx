import { Eye, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listProperties, searchGuests } from "../shared/api.js";
import { getUser } from "../shared/auth.js";

export default function GuestList() {
  const user = getUser();
  const [guests, setGuests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadGuests() {
    setError("");
    setLoading(true);

    try {
      const data = await searchGuests({ property_id: propertyId });
      setGuests(data.guests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuests();
  }, [propertyId]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    listProperties()
      .then((data) => setProperties(data.properties))
      .catch((err) => setError(err.message));
  }, [user?.role]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Guest Records</h1>
        </div>
        <button className="ghost-button" type="button" onClick={loadGuests}>
          <RefreshCw size={18} /> Refresh
        </button>
      </header>

      {user?.role === "ADMIN" && (
        <div className="filters-panel">
          <label>
            Property
            <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="summary-strip">
        <div>
          <Users size={22} />
          <span>Total Records</span>
          <strong>{guests.length}</strong>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Room Number</th>
              <th>Mobile</th>
              <th>Property</th>
              <th>ID Type</th>
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
                <td>{guest.id_type}</td>
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
            {!loading && guests.length === 0 && (
              <tr>
                <td className="empty" colSpan="8">
                  No guest records saved yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="empty" colSpan="8">
                  Loading records...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
