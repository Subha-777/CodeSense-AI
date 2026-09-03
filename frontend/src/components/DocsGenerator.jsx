import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";
import "./DocsGenerator.css";

function DocsGenerator({ code, language, onClose }) {
  const [loading, setLoading] = useState(false);
  const [documentation, setDocumentation] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { token } = useAuth();

  const handleGenerate = async () => {
    if (!code.trim()) {
      setError("Please enter some code first!");
      return;
    }

    setLoading(true);
    setError("");
    setDocumentation(null);

    try {
      const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/generate-docs`,
  { code, language },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setDocumentation(res.data.documentation);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate documentation");
    }
    setLoading(false);
  };

  // Auto-generate as soon as the modal mounts
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(documentation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([documentation], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documentation-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="docs-overlay">
      <div className="docs-modal">
        <div className="docs-modal-header">
          <h3>📄 Generated Documentation</h3>
          <button className="docs-close" onClick={onClose}>✕</button>
        </div>

        <div className="docs-modal-body">
          {loading && (
            <div className="docs-loading">
              <div className="docs-spinner"></div>
              <p>Generating documentation...</p>
              <p className="docs-loading-sub">AI is analyzing your code structure</p>
            </div>
          )}

          {error && <div className="docs-error">❌ {error}</div>}

          {documentation && !loading && (
            <div className="docs-content">
              <ReactMarkdown>{documentation}</ReactMarkdown>
            </div>
          )}
        </div>

        {documentation && !loading && (
          <div className="docs-modal-footer">
            <button className="docs-action-btn copy" onClick={handleCopy}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
            <button className="docs-action-btn download" onClick={handleDownload}>
              ⬇️ Download .md
            </button>
            <button className="docs-action-btn close" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocsGenerator;