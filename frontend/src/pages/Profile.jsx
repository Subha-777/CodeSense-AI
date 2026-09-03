import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

function Profile() {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, analyticsRes] = await Promise.all([
  axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
  axios.get(`${import.meta.env.VITE_API_URL}/api/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
]);
        setProfile(meRes.data.user);
        setStats(analyticsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoError("");
    setPhotoMessage("");

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image too large. Please use an image under 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPhotoLoading(true);
      try {
        const res = await axios.put(
  `${import.meta.env.VITE_API_URL}/api/auth/update-photo`,
  { profilePhoto: base64 },
  { headers: { Authorization: `Bearer ${token}` } }
);
        setProfile((prev) => ({ ...prev, profilePhoto: res.data.profilePhoto }));
        setPhotoMessage("Profile photo updated successfully!");
      } catch (err) {
        setPhotoError(err.response?.data?.error || "Failed to update photo");
      }
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setPwLoading(true);
    try {
      const res = await axios.put(
  `${import.meta.env.VITE_API_URL}/api/auth/change-password`,
  { currentPassword, newPassword },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setPwMessage(res.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err.response?.data?.error || "Failed to update password");
    }
    setPwLoading(false);
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRingClass = (score) => {
  if (score === null || score === undefined) return "ring-neutral";
  if (score >= 80) return "ring-high";
  if (score >= 60) return "ring-mid";
  return "ring-low";
};
  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
  <div className="profile-page">
    <div className="bg-blob bg-blob-1"></div>
    <div className="bg-blob bg-blob-2"></div>

    <div className="profile-header">
      <h1>My Profile</h1>
      <Link to="/dashboard" className="back-link">← Back to Editor</Link>
    </div>

    {loading ? (
      <p className="profile-status">Loading profile...</p>
    ) : (
      <div className="profile-content">

        {/* Cover + Avatar */}
        <div className="profile-cover">
          <div className="cover-gradient"></div>

          <div className="profile-avatar-wrapper">
            <div className={`profile-avatar-ring ${getRingClass(stats?.averageScore)}`}>
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar">{initials}</div>
              )}
            </div>
            <label className="avatar-overlay" title="Change photo">
              <span className="avatar-overlay-icon">{photoLoading ? "⏳" : "📷"}</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
            </label>
          </div>
        </div>

        <div className="profile-identity">
          <h2>{profile?.name}</h2>
          <p className="profile-email">{profile?.email}</p>
          <span className="profile-joined-badge">🗓️ Member since {formatDate(profile?.createdAt)}</span>
          {photoMessage && <p className="photo-success">{photoMessage}</p>}
          {photoError && <p className="photo-error">{photoError}</p>}
        </div>

        {/* Stat chips */}
        <div className="stat-chip-row">
          <div className="stat-chip">
            <span className="chip-value">{stats?.totalReviews ?? 0}</span>
            <span className="chip-label">Total Reviews</span>
          </div>
          <div className="stat-chip">
            <span className="chip-value">
              {stats?.averageScore !== null && stats?.averageScore !== undefined ? `${stats.averageScore}` : "—"}
              <span className="chip-unit">/100</span>
            </span>
            <span className="chip-label">Average Score</span>
          </div>
          <div className="stat-chip">
            <span className="chip-value">{stats ? Object.keys(stats.languageCounts).length : 0}</span>
            <span className="chip-label">Languages Used</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="profile-quicklinks">
          <Link to="/history" className="quicklink-pill">
            <span className="quicklink-icon">📜</span> Review History
          </Link>
          <Link to="/analytics" className="quicklink-pill">
            <span className="quicklink-icon">📊</span> Analytics Dashboard
          </Link>
        </div>

        {/* Change Password */}
        <div className="glass-panel">
          <h3>🔒 Change Password</h3>
          {pwMessage && <div className="pw-success">{pwMessage}</div>}
          {pwError && <div className="pw-error">{pwError}</div>}
          <form onSubmit={handlePasswordChange} className="password-form">
            <label>Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="Enter current password" />
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required placeholder="Enter new password" />
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required placeholder="Confirm new password" />
            <button type="submit" disabled={pwLoading}>{pwLoading ? "Updating..." : "Update Password"}</button>
          </form>
        </div>

        <button className="logout-btn-profile" onClick={logout}>Logout</button>
      </div>
    )}
  </div>
);
}
export default Profile;