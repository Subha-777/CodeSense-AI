import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { useAuth } from "../context/AuthContext";
import "./Analytics.css";

const COLORS = ["#58a6ff", "#9b7bff", "#3fb950", "#e3b341", "#f0506e", "#79c0ff"];

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/analytics`, {
  headers: { Authorization: `Bearer ${token}` },
});
        setData(res.data);
      } catch (err) {
        setError("Failed to load analytics");
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, [token]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const languageData = data
    ? Object.entries(data.languageCounts).map(([name, value]) => ({ name, value }))
    : [];

  const trendData = data
    ? data.scoreTrend.map((r, i) => ({
        name: formatDate(r.date),
        score: r.score,
        index: i + 1,
      }))
    : [];

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <Link to="/dashboard" className="back-link">← Back to Editor</Link>
      </div>

      {loading && <p className="analytics-status">Loading analytics...</p>}
      {error && <p className="analytics-status error">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{data.totalReviews}</span>
              <span className="stat-label">Total Reviews</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {data.averageScore !== null ? `${data.averageScore}/100` : "—"}
              </span>
              <span className="stat-label">Average Quality Score</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{Object.keys(data.languageCounts).length}</span>
              <span className="stat-label">Languages Used</span>
            </div>
            <div className="stat-card streak-card">
              <span className="stat-value streak-value">
                🔥 {data.streak || 0}
              </span>
              <span className="stat-label">Day Streak</span>
            </div>
          </div>
          {/* Weekly Activity */}
          <div className="weekly-activity-card">
            <h3 className="chart-title">📅 Weekly Activity</h3>
            <div className="weekly-bars">
              {data.weeklyActivity?.map((day, i) => (
                <div key={i} className="weekly-bar-col">
                  <div className="weekly-bar-wrapper">
                    <div
                      className="weekly-bar-fill"
                      style={{
                        height: `${day.count > 0 ? Math.max(20, (day.count / Math.max(...data.weeklyActivity.map(d => d.count))) * 80) : 4}px`,
                        background: day.count > 0
                          ? "linear-gradient(180deg, #667eea, #764ba2)"
                          : "#21262d",
                      }}
                    ></div>
                  </div>
                  <span className="weekly-bar-count">{day.count > 0 ? day.count : ""}</span>
                  <span className="weekly-bar-day">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <h3>Score Trend</h3>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="name" stroke="#8b949e" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#8b949e" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "#161b22", border: "1px solid #30363d" }}
                      labelStyle={{ color: "#e6edf3" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#58a6ff"
                      strokeWidth={2}
                      dot={{ fill: "#58a6ff", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="chart-empty">No scored reviews yet</p>
              )}
            </div>

            <div className="chart-card">
              <h3>Language Breakdown</h3>
              {languageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {languageData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#161b22", border: "1px solid #30363d" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="chart-empty">No data yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;