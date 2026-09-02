import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./History.css";
import Popup from "../components/Popup";
import { usePopup } from "../hooks/usePopup";

function History() {
  const [reviews, setReviews] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const { popup, showPopup, showConfirm, closePopup } = usePopup();
  const { token } = useAuth();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviews(res.data.reviews);
        setFiltered(res.data.reviews);
      } catch (err) {
        setError("Failed to load review history");
      }
      setLoading(false);
    };
    fetchReviews();
  }, [token]);

  // Search and filter
  useEffect(() => {
    let results = reviews;

    if (filterLanguage !== "all") {
      results = results.filter((r) => r.language === filterLanguage);
    }

    if (searchQuery.trim()) {
      results = results.filter(
        (r) =>
          r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.review.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.language.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFiltered(results);
  }, [searchQuery, filterLanguage, reviews]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = (id) => {
    showConfirm(
      "Are you sure you want to delete this review? This action cannot be undone.",
      async () => {
        closePopup();
        try {
          await axios.delete(`http://localhost:5000/api/reviews/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const updated = reviews.filter((r) => r._id !== id);
          setReviews(updated);
          setFiltered(updated);
          showPopup("Review deleted successfully!", "success");
        } catch (err) {
          showPopup("Failed to delete review", "error");
        }
      },
      "Delete"
    );
  };

  const getSnippet = (code) => {
    return code.length > 80 ? code.slice(0, 80) + "..." : code;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  // Get unique languages for filter dropdown
  const languages = ["all", ...new Set(reviews.map((r) => r.language))];

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>📜 Review History</h1>
        <Link to="/dashboard" className="back-link">← Back to Editor</Link>
      </div>

      {/* Search and Filter Bar */}
      <div className="history-controls">
        <input
          type="text"
          className="history-search"
          placeholder="🔍 Search reviews by code, language, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="history-filter"
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang === "all" ? "All Languages" : lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="history-status">Loading your history...</p>}
      {error && <p className="history-status error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="history-status">
          {searchQuery || filterLanguage !== "all"
            ? "No reviews match your search."
            : "No reviews yet. Go review some code first!"}
        </p>
      )}

      {/* Results count */}
      {!loading && reviews.length > 0 && (
        <p className="history-count">
          Showing {filtered.length} of {reviews.length} reviews
        </p>
      )}

      <div className="history-list">
        {filtered.map((r) => (
          <div key={r._id} className="history-card">
            <div className="history-card-header">
              <div
                className="history-card-left"
                onClick={() => toggleExpand(r._id)}
              >
                <span className="history-lang">{r.language}</span>
                <span className="history-snippet">{getSnippet(r.code)}</span>
              </div>
              <div className="history-card-right">
                {r.qualityScore !== null && r.qualityScore !== undefined && (
                  <span className="history-score">{r.qualityScore}/100</span>
                )}
                <span className="history-date">{formatDate(r.createdAt)}</span>
                <button
                  className="history-delete-btn"
                  onClick={() => handleDelete(r._id)}
                  title="Delete review"
                >
                  🗑️
                </button>
                <span
                  className="history-toggle"
                  onClick={() => toggleExpand(r._id)}
                >
                  {expandedId === r._id ? "▲" : "▼"}
                </span>
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
            {expandedId === r._id && (
              <div className="history-card-body">
                <h4>Code</h4>
                <pre className="history-code">{r.code}</pre>
                <h4>Review</h4>
                <pre className="history-review">{r.review}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;