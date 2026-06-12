import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getGuest, uploadUrl } from "../shared/api.js";

export default function GuestDetails() {
  const { id } = useParams();
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    getGuest(id)
      .then((data) => setGuest(data.guest))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  if (!guest) {
    return <div className="page">Loading guest...</div>;
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Guest Details</p>
          <h1>{guest.guest_name}</h1>
        </div>
        <Link className="ghost-button" to="/guest/search">
          <ArrowLeft size={18} /> Search
        </Link>
      </header>

      <div className="details-grid">
        <Detail label="Mobile" value={guest.mobile} />
        <Detail label="Property" value={guest.property?.name} />
        <Detail label="Room Number" value={guest.room_number} />
        <Detail label="ID Type" value={guest.id_type} />
        <Detail label="ID Number" value={guest.id_number} />
        <Detail label="Check-in Date" value={guest.checkin_date} />
        <Detail label="Status" value={guest.status} />
        <Detail label="Address" value={guest.address} wide />
      </div>

      <div className="image-grid">
        <ImagePanel
          label="Front ID Image"
          src={uploadUrl(guest.front_image)}
          onOpen={() => setActiveImage({ label: "Front ID Image", src: uploadUrl(guest.front_image) })}
        />
        <ImagePanel
          label="Back ID Image"
          src={uploadUrl(guest.back_image)}
          onOpen={() => setActiveImage({ label: "Back ID Image", src: uploadUrl(guest.back_image) })}
        />
        <ImagePanel
          label="Guest Photo"
          src={uploadUrl(guest.guest_photo)}
          onOpen={() => setActiveImage({ label: "Guest Photo", src: uploadUrl(guest.guest_photo) })}
        />
      </div>

      {activeImage?.src && (
        <div className="image-lightbox" role="dialog" aria-label={activeImage.label}>
          <div className="lightbox-bar">
            <strong>{activeImage.label}</strong>
            <button type="button" onClick={() => setActiveImage(null)} aria-label="Close image">
              <X size={22} />
            </button>
          </div>
          <img alt={activeImage.label} src={activeImage.src} />
        </div>
      )}
    </section>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={wide ? "detail wide" : "detail"}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function ImagePanel({ label, src, onOpen }) {
  return (
    <figure className="image-panel">
      <figcaption>{label}</figcaption>
      {src ? (
        <button className="image-open-button" type="button" onClick={onOpen}>
          <img alt={label} src={src} />
        </button>
      ) : (
        <div className="image-placeholder">No image</div>
      )}
    </figure>
  );
}
