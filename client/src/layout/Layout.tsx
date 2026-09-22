import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
  UserPen,
} from "lucide-react";

import { useAuth } from "./AuthContext";
import type { Permission } from "../types";
import { notificationsApi } from "../api/services";

const items: {
  to: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission | Permission[];
}[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    to: "/books",
    label: "Books & Copies",
    icon: BookOpen,
    permission: "BOOK_READ",
  },

  {
    to: "/reservations",
    label: "My Reservations",
    icon: CalendarClock,
    permission: "RESERVATION_READ",
  },
  { to: "/notifications", label: "Notification", icon: Bell },

  {
    to: "/members",
    label: "Members",
    icon: Users,
    permission: "MEMBER_READ",
  },

  {
    to: "/circulation",
    label: "Circulation",
    icon: Repeat2,
    permission: ["BOOK_ISSUE", "CIRCULATION_PERSONAL"],
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
    permission: "USER_CREATE",
  },

  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "REPORT_VIEW",
  },

  {
  to: "/audit",
  label: "Audit Logs",
  icon: ShieldCheck,
  permission: "AUDIT_LOG_VIEW",
},
];

const staffRoles = [
  "SUPER_ADMIN",
  "LIBRARY_ADMIN",
  "LIBRARIAN",
  "ASSISTANT_LIBRARIAN",
  "AUDITOR",
];

export function Layout() {
  const {
    user,
    logout,
    can,
  } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadQuery = useQuery({ queryKey: ["notification-unread-count"], queryFn: notificationsApi.unreadCount, refetchInterval: 60_000 });

  const nav = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && profileOpen) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [profileOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isStaff = user?.role
    ? staffRoles.includes(user.role)
    : false;

  const hasPermission = (perm?: Permission | Permission[]) => {
    if (!perm) return true;
    const perms = Array.isArray(perm) ? perm : [perm];
    return perms.some((p) => can(p));
  };

  const visible = items
    .filter(
      (x) => hasPermission(x.permission),
    )
    .map((item) => {
      if (item.to === "/reservations") {
        return {
          ...item,
          label: isStaff
            ? "Reservations"
            : "My Reservations",
        };
      }

      return item;
    });

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileOpen(!profileOpen);
  };

  const handleActionClick = (action: "settings" | "edit" | "logout") => {
    setProfileOpen(false);
    if (action === "settings") {
      nav("/settings");
    } else if (action === "edit") {
      nav("/settings");
    } else if (action === "logout") {
      logout();
      nav("/login");
    }
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          collapsed
            ? "collapsed"
            : ""
        } ${
          mobile
            ? "mobile-open"
            : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={21} />
          </div>

          {!collapsed && (
            <div>
              <strong>
                LibraERP
              </strong>

              <small>
                Library operations
              </small>
            </div>
          )}

          <button
            className="mobile-close"
            onClick={() =>
              setMobile(false)
            }
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav>
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={
                item.to === "/"
              }
              onClick={() =>
                setMobile(false)
              }
            >
              <item.icon size={18} />

              <span>
                {item.label}
              </span>
              {item.to === "/notifications" && !!unreadQuery.data?.count && <small className="badge badge-danger">{unreadQuery.data.count > 99 ? "99+" : unreadQuery.data.count}</small>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {can(
            "LIBRARY_SETTINGS",
          ) && (
            <NavLink to="/settings">
              <Settings size={18} />

              <span>
                Settings
              </span>
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

            <span>
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setMobile(true)
            }
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-spacer" />

          <div className="profile-wrapper" ref={profileRef}>
            <button
              className="profile"
              type="button"
              onClick={handleProfileClick}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <div className="avatar">
                {user?.name
                  ?.slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="profile-copy">
                <strong>
                  {user?.name}
                </strong>

                <span>
                  {user?.role?.replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {user?.name
                      ?.slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="dropdown-info">
                    <strong>{user?.name}</strong>
                    <span>{user?.role?.replaceAll("_", " ")}</span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <div className="dropdown-fields">
                  <div className="dropdown-field">
                    <UserRound size={14} />
                    <div className="field-content">
                      <small>Admin/User ID</small>
                      <span>{user?.id}</span>
                    </div>
                  </div>
                  <div className="dropdown-field">
                    <UserRound size={14} />
                    <div className="field-content">
                      <small>Email</small>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <div className="dropdown-field">
                    <UserRound size={14} />
                    <div className="field-content">
                      <small>Phone</small>
                      <span>{user?.memberId ?? "Not provided"}</span>
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <div className="dropdown-actions">
                  <button className="dropdown-action" onClick={() => handleActionClick("settings")}>
                    <Settings size={14} />
                    <span>Profile settings</span>
                  </button>
                  <button className="dropdown-action" onClick={() => handleActionClick("edit")}>
                    <UserPen size={14} />
                    <span>Edit profile</span>
                  </button>
                  <button className="dropdown-action logout" onClick={() => handleActionClick("logout")}>
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>

      {mobile && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}

      <button
        className="collapse"
        onClick={() =>
          setCollapsed(
            !collapsed,
          )
        }
        aria-label={
          collapsed
            ? "Expand sidebar"
            : "Collapse sidebar"
        }
      >
        {collapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>
    </div>
  );
}
