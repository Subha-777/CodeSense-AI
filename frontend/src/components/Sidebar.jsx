import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "AI Review", icon: "🤖" },
  { to: "/history", label: "History", icon: "📜" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", next);
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">⚡</span>
            {!collapsed && <span className="sidebar-logo-text">CodeSense</span>}
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${location.pathname === item.to ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </Link>
          ))}

          {user?.isAdmin && (
            <Link
              to="/admin"
              className={`sidebar-link ${location.pathname === "/admin" ? "active" : ""}`}
              title={collapsed ? "Admin" : undefined}
            >
              <span className="sidebar-icon">🛠️</span>
              {!collapsed && <span className="sidebar-label">Admin</span>}
            </Link>
          )}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
          {!collapsed && <span className="sidebar-username">{user?.name}</span>}
        </div>
        <button className="sidebar-logout" onClick={logout} title="Logout">
          🚪 {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;