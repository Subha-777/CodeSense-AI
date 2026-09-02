import { useEffect } from "react";
import "./Popup.css";

function Popup({ message, type = "success", onClose, confirmText, onConfirm }) {
  useEffect(() => {
    if (!onConfirm) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose, onConfirm]);

  return (
    <div className="popup-overlay">
      <div className={`popup-box ${type}`}>
        <div className="popup-icon">
          {type === "success" && "✅"}
          {type === "error" && "❌"}
          {type === "warning" && "⚠️"}
          {type === "confirm" && "🗑️"}
        </div>
        <p className="popup-message">{message}</p>
        <div className="popup-buttons">
          {onConfirm ? (
            <>
              <button className="popup-btn cancel" onClick={onClose}>
                Cancel
              </button>
              <button className="popup-btn confirm" onClick={onConfirm}>
                {confirmText || "Confirm"}
              </button>
            </>
          ) : (
            <button className="popup-btn ok" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Popup;