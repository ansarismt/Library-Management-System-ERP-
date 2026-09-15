import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AuthProvider,
} from "./layout/AuthContext";

import {
  Layout,
} from "./layout/Layout";

import {
  Protected,
  PermissionRoute,
} from "./layout/Guards";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Members from "./pages/Members";
import Circulation from "./pages/Circulation";
import Fines from "./pages/Fines";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Reservations from "./pages/Reservations";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route
              index
              element={<Dashboard />}
            />
            <Route path="notifications" element={<Notifications />} />

            <Route
              element={
                <PermissionRoute permission="BOOK_READ" />
              }
            >
              <Route
                path="books"
                element={<Books />}
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="RESERVATION_READ" />
              }
            >
              <Route
                path="reservations"
                element={
                  <Reservations />
                }
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="MEMBER_READ" />
              }
            >
              <Route
                path="members"
                element={<Members />}
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="BOOK_ISSUE" />
              }
            >
              <Route
                path="circulation"
                element={
                  <Circulation />
                }
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="FINE_READ" />
              }
            >
              <Route
                path="fines"
                element={<Fines />}
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="USER_READ" />
              }
            >
              <Route
                path="users"
                element={<Users />}
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="REPORT_VIEW" />
              }
            >
              <Route
                path="reports"
                element={<Reports />}
              />
            </Route>

            <Route
              element={
                <PermissionRoute permission="AUDIT_LOG_VIEW" />
              }
            >
              <Route
                path="audit"
                element={<Audit />}
              />
            </Route>

          <Route
  element={
    <PermissionRoute permission="LIBRARY_SETTINGS" />
  }
>
  <Route
    path="settings"
    element={<Settings />}
  />
</Route>
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </AuthProvider>
  );

  
}
