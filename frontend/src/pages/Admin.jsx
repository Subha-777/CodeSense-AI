import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { useAuth } from "../context/AuthContext";
import "./Admin.css";
import Popup from "../components/Popup";
import { usePopup } from "../hooks/usePopup";

const COLORS = ["#58a6ff", "#9b7bff", "#3fb950", "#e3b341", "#f0506e", "#79c0ff"];

function Admin() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { popup, showPopup, showConfirm, closePopup } = usePopup();

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, analyticsRes, systemRes] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/stats", { headers }),
        axios.get("http://localhost:5000/api/admin/users", { headers }),
        axios.get("http://localhost:5000/api/admin/analytics", { headers }),
        axios.get("http://localhost:5000/api/admin/system", { headers }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setAnalytics(analyticsRes.data);
      setSystem(systemRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load admin data");
    }
    setLoading(false);
  };

  const handleDeleteUser = (userId, userName) => {
    showConfirm(
      `Are you sure you want to delete ${userName} and all their reviews? This cannot be undone.`,
      async () => {
        closePopup();
        try {
          await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, { headers });
          setUsers(users.filter((u) => u.id !== userId));
          showPopup("User deleted successfully!", "success");
        } catch (err) {
          showPopup(err.response?.data?.error || "Failed to delete user", "error");
        }
      },
      "Delete User"
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  };

  const languageChartData = stats?.languageStats?.map((l) => ({
    name: l._id, count: l.count
  })) || [];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>⚙️ Admin Dashboard</h1>
          <span className="admin-badge">Administrator</span>
        </div>
        <Link to="/dashboard" className="back-link">← Back to Editor</Link>
      </div>

      {loading && <p className="admin-status">Loading dashboard...</p>}
      {error && <p className="admin-status error">{error}</p>}

      {!loading && !error && (
        <>
          {/* Tab Navigation */}
          <div className="admin-tabs">
            {["overview", "users", "analytics", "system"].map((tab) => (
              <button
                key={tab}
                className={`admin-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "overview" && "📊 Overview"}
                {tab === "users" && "👥 Manage Users"}
                {tab === "analytics" && "📈 Analytics"}
                {tab === "system" && "🖥️ System"}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <div className="admin-content">
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">👥</span>
                  <span className="admin-stat-value">{stats.totalUsers}</span>
                  <span className="admin-stat-label">Total Users</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">📝</span>
                  <span className="admin-stat-value">{stats.totalReviews}</span>
                  <span className="admin-stat-label">Total Reviews</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">⭐</span>
                  <span className="admin-stat-value">
                    {stats.averageScore !== null ? `${stats.averageScore}/100` : "—"}
                  </span>
                  <span className="admin-stat-label">Platform Avg Score</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">🕐</span>
                  <span className="admin-stat-value">{stats.reviewsLast24h}</span>
                  <span className="admin-stat-label">Reviews (24h)</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">🆕</span>
                  <span className="admin-stat-value">{stats.newUsersThisWeek}</span>
                  <span className="admin-stat-label">New Users (7 days)</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-icon">🌐</span>
                  <span className="admin-stat-value">{stats.languageStats?.length || 0}</span>
                  <span className="admin-stat-label">Languages Used</span>
                </div>
              </div>

              <div className="admin-charts-row">
                <div className="admin-chart-card">
                  <h3>Reviews by Language</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={languageChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="name" stroke="#8b949e" fontSize={12} />
                      <YAxis stroke="#8b949e" fontSize={12} />
                      <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                      <Bar dataKey="count" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="admin-chart-card">
                  <h3>Most Active Users</h3>
                  <div className="active-users-list">
                    {stats.mostActiveUsers?.map((u, i) => (
                      <div key={i} className="active-user-row">
                        <span className="active-user-rank">#{i + 1}</span>
                        <div className="active-user-info">
                          <span className="active-user-name">{u.name}</span>
                          <span className="active-user-email">{u.email}</span>
                        </div>
                        <span className="active-user-count">{u.reviewCount} reviews</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-chart-card full-width">
                <h3>Activity (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="_id" stroke="#8b949e" fontSize={11} />
                    <YAxis stroke="#8b949e" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                    <Line type="monotone" dataKey="count" stroke="#9b7bff" strokeWidth={2} dot={{ fill: "#9b7bff", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="admin-content">
              <div className="users-table-header">
                <h3>All Users ({users.length})</h3>
              </div>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Reviews</th>
                      <th>Avg Score</th>
                      <th>Last Review</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td className="email-cell">{u.email}</td>
                        <td>{formatDate(u.joinedAt)}</td>
                        <td>{u.reviewCount}</td>
                        <td>{u.avgScore !== null ? `${u.avgScore}/100` : "—"}</td>
                        <td>{formatDate(u.lastReview)}</td>
                        <td>
                          <span className={`role-badge ${u.isAdmin ? "admin" : "user"}`}>
                            {u.isAdmin ? "Admin" : "User"}
                          </span>
                        </td>
                        <td>
                          {!u.isAdmin && (
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && analytics && (
            <div className="admin-content">
              <div className="admin-charts-row">
                <div className="admin-chart-card">
                  <h3>Score Distribution</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analytics.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="range" stroke="#8b949e" fontSize={12} />
                      <YAxis stroke="#8b949e" fontSize={12} />
                      <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {analytics.scoreDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="admin-chart-card">
                  <h3>Monthly Reviews (Last 6 Months)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={analytics.reviewsPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="_id" stroke="#8b949e" fontSize={11} />
                      <YAxis stroke="#8b949e" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                      <Line type="monotone" dataKey="count" stroke="#3fb950" strokeWidth={2} dot={{ fill: "#3fb950", r: 4 }} name="Reviews" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === "system" && system && (
            <div className="admin-content">
              <div className="system-grid">
                <div className="system-card">
                  <h3>🖥️ Server Info</h3>
                  <div className="system-info-list">
                    <div className="system-info-row">
                      <span>Status</span>
                      <span className="status-online">🟢 Online</span>
                    </div>
                    <div className="system-info-row">
                      <span>Uptime</span>
                      <span>{system.server.uptime}</span>
                    </div>
                    <div className="system-info-row">
                      <span>Node.js Version</span>
                      <span>{system.server.nodeVersion}</span>
                    </div>
                    <div className="system-info-row">
                      <span>Platform</span>
                      <span>{system.server.platform}</span>
                    </div>
                    <div className="system-info-row">
                      <span>CPU Cores</span>
                      <span>{system.server.cpuCount}</span>
                    </div>
                    <div className="system-info-row">
                      <span>CPU Model</span>
                      <span className="small-text">{system.server.cpuModel}</span>
                    </div>
                  </div>
                </div>

                <div className="system-card">
                  <h3>💾 Memory Usage</h3>
                  <div className="memory-bar-wrapper">
                    <div className="memory-bar">
                      <div
                        className="memory-bar-fill"
                        style={{ width: `${system.server.memoryUsagePercent}%` }}
                      ></div>
                    </div>
                    <span className="memory-percent">{system.server.memoryUsagePercent}% used</span>
                  </div>
                  <div className="system-info-list">
                    <div className="system-info-row">
                      <span>Used Memory</span>
                      <span>{system.server.usedMemoryMB} MB</span>
                    </div>
                    <div className="system-info-row">
                      <span>Total Memory</span>
                      <span>{system.server.totalMemoryMB} MB</span>
                    </div>
                  </div>
                </div>

                <div className="system-card">
                  <h3>🗄️ Database</h3>
                  <div className="system-info-list">
                    <div className="system-info-row">
                      <span>Status</span>
                      <span className="status-online">🟢 Connected</span>
                    </div>
                    <div className="system-info-row">
                      <span>Total Users</span>
                      <span>{system.database.totalUsers}</span>
                    </div>
                    <div className="system-info-row">
                      <span>Total Reviews</span>
                      <span>{system.database.totalReviews}</span>
                    </div>
                    <div className="system-info-row">
                      <span>First Record</span>
                      <span>{formatDate(system.database.oldestRecord)}</span>
                    </div>
                    <div className="system-info-row">
                      <span>Latest Record</span>
                      <span>{formatDate(system.database.newestRecord)}</span>
                    </div>
                  </div>
                </div>

                <div className="system-card">
                  <h3>🤖 AI Service</h3>
                  <div className="system-info-list">
                    <div className="system-info-row">
                      <span>Provider</span>
                      <span>Google Gemini</span>
                    </div>
                    <div className="system-info-row">
                      <span>Model</span>
                      <span>gemini-2.5-flash</span>
                    </div>
                    <div className="system-info-row">
                      <span>Status</span>
                      <span className="status-online">🟢 Active</span>
                    </div>
                    <div className="system-info-row">
                      <span>Total API Calls</span>
                      <span>{system.database.totalReviews}</span>
                    </div>
                  </div>
                  {popup && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={closePopup}
          onConfirm={popup.confirm ? popup.onConfirm : null}
          confirmText={popup.confirmText}
        />
      )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Admin;