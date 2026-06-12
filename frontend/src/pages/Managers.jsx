import { Plus, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { createManager, createProperty, listManagers, listProperties } from "../shared/api.js";

export default function Managers() {
  const [managers, setManagers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", property_id: "" });
  const [propertyForm, setPropertyForm] = useState({ name: "", address: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedProperty = properties.find((property) => String(property.id) === String(form.property_id));

  async function loadManagers() {
    setError("");
    setLoading(true);

    try {
      const data = await listManagers();
      setManagers(data.managers);
      const propertyData = await listProperties();
      setProperties(propertyData.properties);
      if (!form.property_id && propertyData.properties[0]) {
        setForm((current) => ({ ...current, property_id: String(propertyData.properties[0].id) }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManagers();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const data = await createManager(form.username, form.password, form.property_id);
      setMessage(data.message);
      setForm({ username: "", password: "", property_id: form.property_id });
      await loadManagers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePropertySubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await createProperty(propertyForm.name, propertyForm.address);
      setMessage(data.message);
      setPropertyForm({ name: "", address: "" });
      await loadManagers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Manager Logins</h1>
        </div>
        <button className="ghost-button" type="button" onClick={loadManagers}>
          <RefreshCw size={18} /> Refresh
        </button>
      </header>

      <form className="manager-form" onSubmit={handleSubmit}>
        {error && <div className="alert error full-row">{error}</div>}
        {message && <div className="alert success full-row">{message}</div>}
        <label>
          Username
          <input name="username" value={form.username} onChange={updateField} required />
        </label>
        <label>
          Password
          <input
            minLength="6"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Property
          <select name="property_id" value={form.property_id} onChange={updateField} required>
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Property Address
          <input value={selectedProperty?.address || ""} readOnly />
        </label>
        <button className="primary-button" disabled={saving} type="submit">
          <Plus size={18} /> {saving ? "Creating..." : "Create Manager"}
        </button>
      </form>

      <form className="manager-form" onSubmit={handlePropertySubmit}>
        <label>
          Property Name
          <input name="name" value={propertyForm.name} onChange={(event) => setPropertyForm({ ...propertyForm, name: event.target.value })} required />
        </label>
        <label>
          Property Address
          <input name="address" value={propertyForm.address} onChange={(event) => setPropertyForm({ ...propertyForm, address: event.target.value })} />
        </label>
        <button className="primary-button" type="submit">
          <Plus size={18} /> Add Property
        </button>
      </form>

      <div className="summary-strip">
        <div>
          <Users size={22} />
          <span>Total Managers</span>
          <strong>{managers.length}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Property</th>
              <th>Address</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.id}>
                <td>{manager.username}</td>
                <td>
                  <span className="status">{manager.role}</span>
                </td>
                <td>{manager.property?.name || "-"}</td>
                <td>{manager.property?.address || "-"}</td>
                <td>{new Date(manager.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && managers.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  No manager logins created yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="empty" colSpan="5">
                  Loading managers...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
