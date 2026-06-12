import { getToken } from "./auth.js";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:5000");

async function request(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function login(username, password) {
  return request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function createGuest(formData) {
  return request("/api/guest", {
    method: "POST",
    body: formData,
  });
}

export function searchGuests(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return request(`/api/guest/search?${query.toString()}`);
}

export function getGuest(id) {
  return request(`/api/guest/${id}`);
}

export function listManagers() {
  return request("/api/users/managers");
}

export function createManager(username, password, propertyId) {
  return request("/api/users/managers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, property_id: propertyId }),
  });
}

export function listProperties() {
  return request("/api/properties");
}

export function createProperty(name, address) {
  return request("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, address }),
  });
}

export function uploadUrl(path) {
  return path ? `${API_BASE_URL}/uploads/${path}` : "";
}

export function extractGuestDetails(formData) {
  return request("/api/guest/extract-id", {
    method: "POST",
    body: formData,
  });
}

