import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

// GitHub redirects here after the user approves access, with a temporary
// "code" in the URL. We send that code to our backend, which exchanges
// it for the user's GitHub profile and logs them in.
function GithubCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // the code is single-use - guard against double-firing
    hasRun.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setError("No code received from GitHub.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/github`,
          { code }
        );
        login(res.data.user, res.data.token);
        if (res.data.user.isAdmin) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        setError(err.response?.data?.error || "GitHub sign-in failed");
      }
    };

    exchangeCode();
  }, [searchParams, login, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Signing you in...</h2>
        {error ? (
          <p className="auth-error">{error}</p>
        ) : (
          <p className="auth-subtitle">Connecting to GitHub, please wait.</p>
        )}
      </div>
    </div>
  );
}

export default GithubCallback;