import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  UserRound,
  Repeat2,
  ShieldCheck,
  BarChart3,
  X,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import type { Permission } from "../types";

const items: {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
}[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/books",
    label: "Books & Copies",
    icon: BookOpen,
    permission: "BOOK_READ",
  },
  { to: "/members", label: "Members", icon: Users, permission: "MEMBER_READ" },
  {
    to: "/circulation",
    label: "Circulation",
    icon: Repeat2,
    permission: "BOOK_ISSUE",
  },
  {
    to: "/fines",
    label: "Fines & Payments",
    icon: CircleDollarSign,
    permission: "FINE_READ",
  },
  {
    to: "/users",
    label: "User Management",
    icon: UserRound,
    permission: "USER_READ",
  },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "REPORT_VIEW",
  },
  {
    to: "/audit",
    label: "Audit & Settings",
    icon: ShieldCheck,
    permission: "AUDIT_LOG_VIEW",
  },
];
export function Layout() {
  const { user, logout, can } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const nav = useNavigate();
  const visible = items.filter((x) => !x.permission || can(x.permission));
  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={21} />
          </div>
          {!collapsed && (
            <div>
              <strong>LibraERP</strong>
              <small>Library operations</small>
            </div>
          )}
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X size={18} />
          </button>
        </div>
        <nav>
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobile(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {can("LIBRARY_SETTINGS") && (
            <NavLink to="/settings">
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          )}
          <button
            className="logout-link"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobile(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-spacer" />
          <div className="profile">
            <div className="avatar">
              {user?.name?.slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-copy">
              <strong>{user?.name}</strong>
              <span>{user?.role?.replaceAll("_", " ")}</span>
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
      <button className="collapse" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}
