import { Camera, FolderOpen, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createGuest, extractGuestDetails, listProperties } from "../shared/api.js";
import { getUser } from "../shared/auth.js";

const initialForm = {
  guest_name: "",
  mobile: "",
  address: "",
  room_number: "",
  id_type: "Aadhaar",
  id_number: "",
  checkin_date: new Date().toISOString().slice(0, 10),
};

export default function GuestForm() {
  const navigate = useNavigate();
  const user = getUser();
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [properties, setProperties] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    listProperties()
      .then((data) => {
        setProperties(data.properties);
        if (data.properties[0]) {
          setForm((current) => ({ ...current, property_id: String(data.properties[0].id) }));
        }
      })
      .catch((err) => setError(err.message));
  }, [user?.role]);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function updateFile(event) {
    const file = event.target.files[0];
    const name = event.target.name;
    setFiles((current) => ({ ...current, [name]: file }));

    if ((name === "front_image" || name === "back_image") && file) {
      setExtracting(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("front_image", file);

      try {
        const result = await extractGuestDetails(formData);
        setForm((current) => ({
          ...current,
          guest_name: result.guest_name || current.guest_name,
          id_number: result.id_number || current.id_number,
          address: result.address || current.address,
          id_type: result.id_type || current.id_type,
        }));
        const side = name === "front_image" ? "front" : "back";
        setMessage(`Details auto-filled from ${side} ID image!`);
      } catch (err) {
        setError(`Could not auto-fill details: ${err.message}. Please fill out manually.`);
      } finally {
        setExtracting(false);
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    Object.entries(files).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      const result = await createGuest(data);
      setMessage(result.message);
      navigate(`/guest/${result.guest.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Registration</p>
          <h1>New Guest</h1>
        </div>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        {extracting && (
          <div className="alert success full-row" style={{ backgroundColor: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            Scanning ID card and auto-filling details...
          </div>
        )}
        {error && <div className="alert error full-row">{error}</div>}
        {message && <div className="alert success full-row">{message}</div>}

        <TextField label="Guest Name *" name="guest_name" value={form.guest_name} onChange={updateField} />
        {user?.role === "ADMIN" && (
          <label>
            Property *
            <select name="property_id" value={form.property_id || ""} onChange={updateField} required>
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <TextField label="Mobile Number *" name="mobile" value={form.mobile} onChange={updateField} />
        <TextField label="Room Number *" name="room_number" value={form.room_number} onChange={updateField} />
        <label>
          ID Type *
          <select name="id_type" value={form.id_type} onChange={updateField}>
            <option>Aadhaar</option>
            <option>Driving License</option>
            <option>Passport</option>
            <option>Voter ID</option>
          </select>
        </label>
        <TextField label="ID Number *" name="id_number" value={form.id_number} onChange={updateField} />
        <TextField
          label="Check-in Date *"
          name="checkin_date"
          type="date"
          value={form.checkin_date}
          onChange={updateField}
        />
        <label className="full-row">
          Address *
          <textarea name="address" rows="4" value={form.address} onChange={updateField} />
        </label>

        <FileField label="Front ID Image *" name="front_image" onChange={updateFile} required />
        <FileField label="Back ID Image" name="back_image" onChange={updateFile} />
        <FileField label="Guest Photo" name="guest_photo" onChange={updateFile} />

        <div className="form-actions full-row">
          <button className="primary-button" disabled={saving} type="submit">
            <Save size={18} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

function TextField({ label, name, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} onChange={onChange} required />
    </label>
  );
}

function FileField({ label, name, onChange, required = false }) {
  const cameraInputRef = useRef(null);
  const filesInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [chooserOpen, setChooserOpen] = useState(false);

  function handleChange(event) {
    const file = event.target.files[0];
    setSelectedFile(file?.name || "");
    setChooserOpen(false);
    onChange(event);
  }

  return (
    <div className="file-field">
      <span className="field-label">{label}</span>

      <button className="file-trigger" type="button" onClick={() => setChooserOpen(true)}>
        <Camera size={18} />
        <span>{selectedFile || "Choose image"}</span>
      </button>

      {chooserOpen && (
        <div className="file-chooser" role="dialog" aria-label={`${label} source`}>
          <div className="file-chooser-header">
            <strong>{label}</strong>
            <button className="icon-button" type="button" onClick={() => setChooserOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <button type="button" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={20} />
            Camera
          </button>
          <button type="button" onClick={() => filesInputRef.current?.click()}>
            <FolderOpen size={20} />
            Files
          </button>
        </div>
      )}

      <input
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden-file-input"
        name={name}
        onChange={handleChange}
        required={required && !selectedFile}
        type="file"
      />
      <input
        ref={filesInputRef}
        accept="image/*"
        className="hidden-file-input"
        name={name}
        onChange={handleChange}
        required={required && !selectedFile}
        type="file"
      />
    </div>
  );
}
