import { useState } from "react";
import "./ConvertResult.css";

function ConvertResult({ result, onClose, onUseCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="convert-overlay">
      <div className="convert-modal">
        <div className="convert-modal-header">
          <h3>🔄 Converted to {result.language}</h3>
          <button className="convert-close" onClick={onClose}>✕</button>
        </div>
        <div className="convert-modal-body">
          <pre className="convert-code">{result.code}</pre>
        </div>
        <div className="convert-modal-footer">
          <button className="convert-action-btn copy" onClick={handleCopy}>
            {copied ? "✅ Copied!" : "📋 Copy Code"}
          </button>
          <button
            className="convert-action-btn use"
            onClick={() => {
              onUseCode(result.code, result.language);
              onClose();
            }}
          >
            ✏️ Use This Code
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConvertResult;