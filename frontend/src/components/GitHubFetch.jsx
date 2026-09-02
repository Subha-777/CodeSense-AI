import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./GitHubFetch.css";

function GitHubFetch({ onCodeFetched }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { token } = useAuth();

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a GitHub URL");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/github/fetch",
        { url: url.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onCodeFetched(res.data.code, res.data.language);
      setSuccess(`✅ Code fetched successfully! Language detected: ${res.data.language}`);
      setUrl("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch code from GitHub");
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleFetch();
  };

  return (
    <div className="github-fetch">
      <div className="github-fetch-header">
        <span className="github-icon">
          <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </span>
        <span className="github-title">Import from GitHub</span>
      </div>

      <div className="github-fetch-body">
        <div className="github-input-row">
          <input
            type="text"
            className="github-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/user/repo/blob/main/file.py"
            disabled={loading}
          />
          <button
            className="github-fetch-btn"
            onClick={handleFetch}
            disabled={loading || !url.trim()}
          >
            {loading ? "⏳" : "Fetch"}
          </button>
        </div>

        {error && <p className="github-error">❌ {error}</p>}
        {success && <p className="github-success">{success}</p>}

        <p className="github-hint">
          💡 Paste any public GitHub file URL — code will be loaded automatically
        </p>
      </div>
    </div>
  );
}

export default GitHubFetch;