import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "AI Review", icon: "🤖" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

function Sidebar() {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const showLabels = !collapsed || mobileOpen;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", next);
  };

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecentReviews(res.data.reviews.slice(0, 20));
      } catch (err) {
        // silently fail
      }
    };
    const fetchProfilePhoto = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfilePhoto(res.data.user?.profilePhoto || null);
      } catch (err) {
        // silently fail — falls back to initials
      }
    };
    if (token) {
      fetchRecent();
      fetchProfilePhoto();
    }
  }, [token]);

  const openReview = (r) => {
    navigate("/dashboard", { state: { historyItem: r } });
    closeMobile();
  };

  const startNew = () => {
    navigate("/dashboard", { state: { fresh: true } });
    closeMobile();
  };

  const getSnippet = (code) => (code.length > 40 ? code.slice(0, 40) + "…" : code);

  return (
    <>
      <button className="sidebar-hamburger" onClick={() => setMobileOpen(true)} title="Open menu">
        ☰
      </button>

      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile}></div>}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo-row">
            <div className="sidebar-logo">
              <span className="sidebar-logo-icon">⚡</span>
              {showLabels && <span className="sidebar-logo-text">CodeSense</span>}
            </div>
            <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? "»" : "«"}
            </button>
            <button className="sidebar-mobile-close" onClick={closeMobile} title="Close menu">✕</button>
          </div>

          <button className="sidebar-new-btn" onClick={startNew}>
            <span className="sidebar-icon">➕</span>
            {showLabels && <span className="sidebar-label">New Review</span>}
          </button>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar-link ${location.pathname === item.to ? "active" : ""}`}
                title={showLabels ? undefined : item.label}
                onClick={closeMobile}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {showLabels && <span className="sidebar-label">{item.label}</span>}
              </Link>
            ))}

            {user?.isAdmin && (
              <Link
                to="/admin"
                className={`sidebar-link ${location.pathname === "/admin" ? "active" : ""}`}
                title={showLabels ? undefined : "Admin"}
                onClick={closeMobile}
              >
                <span className="sidebar-icon">🛠️</span>
                {showLabels && <span className="sidebar-label">Admin</span>}
              </Link>
            )}
          </nav>

          {showLabels && recentReviews.length > 0 && (
            <div className="sidebar-history">
              <div className="sidebar-history-heading">Recent</div>
              <div className="sidebar-history-list">
                {recentReviews.map((r) => (
                  <button key={r._id} className="sidebar-history-item" onClick={() => openReview(r)}>
                    <span className="sidebar-history-lang">{r.language}</span>
                    <span className="sidebar-history-snippet">{getSnippet(r.code)}</span>
                  </button>
                ))}
              </div>
              <Link to="/history" className="sidebar-history-viewall" onClick={closeMobile}>
                <span>📜 View All History</span>
                <span className="viewall-arrow">→</span>
              </Link>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <Link to="/profile" className="sidebar-user" onClick={closeMobile}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="sidebar-avatar-img" />
            ) : (
              <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
            )}
            {showLabels && <span className="sidebar-username">{user?.name}</span>}
          </Link>
          <button className="sidebar-logout" onClick={logout} title="Logout">
            🚪 {showLabels && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;