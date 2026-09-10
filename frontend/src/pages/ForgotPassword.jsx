import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

function ForgotPassword() {
  const [step, setStep] = useState("request"); // "request" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
        { email }
      );
      setInfo(res.data.message);
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });
      navigate("/login", { state: { registered: false, passwordReset: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      {step === "request" && (
        <form className="auth-card" onSubmit={handleRequestOtp}>
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">
            Enter your account email — we'll send you an OTP to reset your password.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </button>

          <p className="auth-switch">
            <Link to="/login">Back to Login</Link>
          </p>
        </form>
      )}

      {step === "reset" && (
        <form className="auth-card" onSubmit={handleResetPassword}>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">
            Enter the OTP sent to <strong>{email}</strong> and choose a new password.
          </p>

          {info && <div className="auth-success">{info}</div>}
          {error && <div className="auth-error">{error}</div>}

          <label>OTP</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />

          <label>New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter new password"
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <label>Confirm New Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Confirm new password"
          />

          <button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <p className="auth-switch">
            <button
              type="button"
              className="link-btn"
              onClick={() => setStep("request")}
            >
              Use a different email
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

export default ForgotPassword;