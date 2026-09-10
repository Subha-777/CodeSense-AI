import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // If someone lands here directly without registering first, send them back.
  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Session expired</h2>
          <p className="auth-subtitle">
            Please <Link to="/register">register again</Link> to receive a new OTP.
          </p>
        </div>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-registration-otp`, {
        email,
        otp,
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/resend-registration-otp`, {
        email,
      });
      setInfo("A new OTP has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP");
    }
    setResending(false);
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleVerify}>
        <h2>Verify Your Email</h2>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {info && <div className="auth-success">{info}</div>}
        {error && <div className="auth-error">{error}</div>}

        <label>Enter OTP</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          required
        />

        <button type="submit" disabled={loading || otp.length !== 6}>
          {loading ? "Verifying..." : "Verify & Create Account"}
        </button>

        <p className="auth-switch">
          Didn't get the code?{" "}
          <button
            type="button"
            className="link-btn"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default VerifyOtp;