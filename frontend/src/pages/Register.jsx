import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";
import GoogleAuthButton from "../components/GoogleAuthButton";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
    setLoading(false);
  };

  // Google sign-in skips OTP entirely - Google has already verified this
  // is a real, owned email address, so the backend creates + logs the
  // user in immediately, in one step.
  const handleGoogleSuccess = (data) => {
    setError("");
    login(data.user, data.token);
    if (data.user.isAdmin) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleGoogleError = (message) => {
    setError(message);
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up for CodeSense AI</p>

        {error && <div className="auth-error">{error}</div>}

        <label>Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter your full name"
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />

        <label>Password</label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Enter password (min 6 characters)"
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <label>Confirm Password</label>
        <div className="password-input-wrapper">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Sending OTP..." : "Register"}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="google-btn-wrapper">
          <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;