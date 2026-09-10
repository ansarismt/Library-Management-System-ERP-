import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Permission } from "../types";
import { ShieldAlert } from "lucide-react";
export function Protected() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="boot">
        <div className="brand-mark">L</div>
        <span>Loading LibraERP…</span>
      </div>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: loc.pathname }} />
  );
}
export function PermissionRoute({ permission }: { permission: Permission }) {
  const { can } = useAuth();
  if (!can(permission))
    return (
      <div className="denied">
        <ShieldAlert size={42} />
        <h2>Access restricted</h2>
        <p>
          Your role does not have <code>{permission}</code>.
        </p>
      </div>
    );
  return <Outlet />;
}
