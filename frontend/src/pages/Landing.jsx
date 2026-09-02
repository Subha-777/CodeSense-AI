import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-bolt">⚡</span> CodeSense AI
        </div>
        <button className="nav-login-btn" onClick={() => navigate("/login")}>
          Log in
        </button>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <p className="hero-eyebrow">AI Code Review Platform</p>
          <h1 className="hero-title">
            Catch bugs before <br />anyone else does.
          </h1>
          <p className="hero-subtitle">
            Paste your code. Get an instant review with bugs, security
            issues, and a quality score — powered by AI, tracked over time.
          </p>
          <button
            className="cta-btn"
            onClick={() => navigate("/login")}
          >
            Start Reviewing →
          </button>
        </div>

        <div className="hero-demo">
          <div className="demo-window">
            <div className="demo-titlebar">
              <span className="demo-dot red"></span>
              <span className="demo-dot yellow"></span>
              <span className="demo-dot green"></span>
              <span className="demo-filename">divide.js</span>
            </div>
            <div className="demo-code">
              <div className="code-line">
                <span className="line-no">1</span>
                <span className="code-text">function divide(a, b) {`{`}</span>
              </div>
              <div className="code-line">
                <span className="line-no">2</span>
                <span className="code-text">&nbsp;&nbsp;return a / b;</span>
              </div>
              <div className="code-line">
                <span className="line-no">3</span>
                <span className="code-text">{`}`}</span>
              </div>
            </div>
          </div>

          <div className="demo-annotations">
            <div className="annotation critical" style={{ animationDelay: "0.3s" }}>
              <span className="annotation-tag">🔴 Critical</span>
              <span className="annotation-text">No check for division by zero</span>
            </div>
            <div className="annotation warning" style={{ animationDelay: "0.9s" }}>
              <span className="annotation-tag">🟡 Warning</span>
              <span className="annotation-text">No input type validation</span>
            </div>
            <div className="annotation suggestion" style={{ animationDelay: "1.5s" }}>
              <span className="annotation-tag">🔵 Suggestion</span>
              <span className="annotation-text">Add a doc comment for clarity</span>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        <h2 className="section-title">What it checks</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🐞</span>
            <h3>Bugs & Logic Errors</h3>
            <p>Finds mistakes a quick glance would miss, with a plain explanation of why each one matters.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🛡️</span>
            <h3>Security Issues</h3>
            <p>Flags risky patterns like injection points or unsafe input handling before they ship.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🌐</span>
            <h3>Multi-Language</h3>
            <p>Reviews JavaScript, Python, Java, C, and C++ — paste code or upload a file directly.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📈</span>
            <h3>Quality Score</h3>
            <p>Every review gets a score out of 100, so you can track if your code is actually improving.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📜</span>
            <h3>Review History</h3>
            <p>Every submission is saved to your account, so past reviews are never lost.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔒</span>
            <h3>Private by Account</h3>
            <p>Your code and reviews are tied to your login only — nobody else can see them.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <h4>Paste or upload code</h4>
            <p>Drop in any snippet or upload a file in a supported language.</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h4>AI reviews it instantly</h4>
            <p>Gemini analyzes structure, logic, and security in seconds.</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h4>Get a structured report</h4>
            <p>Bugs, fixes, and an optimized version — clearly labeled.</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <h4>Track your progress</h4>
            <p>Revisit past reviews and watch your quality score improve.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>CodeSense AI — Intelligent Code Review Platform</p>
        <button className="cta-btn small" onClick={() => navigate("/login")}>
          Start Reviewing →
        </button>
      </footer>
    </div>
  );
}

export default Landing;