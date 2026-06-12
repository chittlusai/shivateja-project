import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./shared/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GuestDetails from "./pages/GuestDetails.jsx";
import GuestForm from "./pages/GuestForm.jsx";
import GuestList from "./pages/GuestList.jsx";
import Login from "./pages/Login.jsx";
import Managers from "./pages/Managers.jsx";
import SearchGuest from "./pages/SearchGuest.jsx";
import { getUser, isAuthenticated } from "./shared/auth.js";
import "./styles.css";

function ProtectedRoute({ children }) {
  return isAuthenticated() && getUser() ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="guests" element={<GuestList />} />
          <Route path="managers" element={<Managers />} />
          <Route path="guest/new" element={<GuestForm />} />
          <Route path="guest/search" element={<SearchGuest />} />
          <Route path="guest/:id" element={<GuestDetails />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
