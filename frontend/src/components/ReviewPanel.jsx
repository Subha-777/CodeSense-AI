import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { generateReviewPDF } from "../utils/pdfGenerator";
import InteractiveTerminal from "./InteractiveTerminal";  
import "./ReviewPanel.css";

// Extract overall score from review text
const extractScore = (text) => {
  const specificMatch =
    text.match(/Overall[:\s]*(\d{1,3})\s*\/\s*100/i) ||
    text.match(/Interview Score[:\s]*(\d{1,3})\s*\/\s*100/i) ||
    text.match(/Security Score[:\s]*(\d{1,3})\s*\/\s*100/i) ||
    text.match(/Performance Score[:\s]*(\d{1,3})\s*\/\s*100/i) ||
    text.match(/##\s*⭐[^#\n]*\n+(\d{1,3})\s*\/\s*100/i) ||
    text.match(/Score\s*\n+(\d{1,3})\s*\/\s*100/i);

  if (specificMatch) return parseInt(specificMatch[1]);

  const fallback = text.match(/(\d{1,3})\s*\/\s*100/);
  return fallback ? parseInt(fallback[1]) : null;
};

// Extract individual scores
const extractScores = (text) => {
  const scores = {};
  const patterns = [
    { key: "readability", regex: /Readability[:\s]*(\d{1,3})\s*\/\s*100/i },
    { key: "maintainability", regex: /Maintainability[:\s]*(\d{1,3})\s*\/\s*100/i },
    { key: "performance", regex: /Performance[:\s]*(\d{1,3})\s*\/\s*100/i },
    { key: "security", regex: /Security[:\s]*(\d{1,3})\s*\/\s*100/i },
    { key: "complexity", regex: /Complexity[:\s]*(\d{1,3})\s*\/\s*100/i },
  ];
  patterns.forEach(({ key, regex }) => {
    const match = text.match(regex);
    if (match) scores[key] = parseInt(match[1]);
  });
  return scores;
};

const getScoreColor = (score) => {
  if (score >= 80) return "#3fb950";
  if (score >= 60) return "#e3b341";
  return "#f0506e";
};

const extractSections = (text) => {
  const sections = {};

  const sectionPatterns = [
    { key: "summary", keywords: ["Summary", "What Does This Code Do", "Executive Summary"] },
    { key: "complexity", keywords: ["Complexity Analysis", "Complexity"] },
    { key: "issues", keywords: ["Issues Found", "Vulnerabilities Found", "Performance Issues Found", "Issues an Interviewer", "Weaknesses"] },
    { key: "security", keywords: ["Security Analysis", "Security Deep Dive", "Security Summary", "Security Recommendations"] },
    { key: "good", keywords: ["Good Practices", "What You Did Well", "Security Good Practices", "Strengths"] },
    { key: "optimized", keywords: ["Optimized Code", "Improved Code", "Secure Version", "Improved Version"] },
    { key: "tests", keywords: ["Test Cases", "Practice Exercises"] },
    { key: "beginner", keywords: ["Beginner Explanation", "Beginner"] },
    { key: "teacher", keywords: ["AI Teacher", "Teacher Mode", "Learn From This"] },
    { key: "advanced", keywords: ["Advanced Insights", "Optimization Techniques", "Architecture", "Senior Developer Advice"] },
    { key: "interview", keywords: ["Interview Questions", "Common Interview Questions", "How to Talk", "How Interviewers Think"] },
    { key: "linebyline", keywords: ["Line-by-Line", "Line by Line"] },
    { key: "performance", keywords: ["Performance Summary", "Optimization Techniques", "Expected Improvement"] },
  ];

  sectionPatterns.forEach(({ key, keywords }) => {
    for (const keyword of keywords) {
      const regex = new RegExp(
        `##?\\s*(?:[\\d.]+\\s*)?(?:[\\p{Emoji}\\s]*)?${keyword}[^\\n]*(\\n[\\s\\S]*?)(?=\\n##|$)`,
        'iu'
      );
      const match = text.match(regex);
      if (match && !sections[key]) {
        sections[key] = match[1].trim();
        break;
      }
    }
  });

  return sections;
};

function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{icon} {title}</span>
        <span className="collapsible-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

function ScoreGauge({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="score-gauge-wrap">
      <svg
        className="score-gauge-svg"
        width="100%"
        height="100%"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Overall score: ${score} out of 100`}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>

      <div className="score-gauge-center">
        <span className="score-gauge-number" style={{ color }}>{score}</span>
        <span className="score-gauge-outof">/100</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  const color = getScoreColor(value);
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (value / 100) * circumference;

  const getStatus = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Work";
  };

  return (
    <div className="mini-stat" style={{ "--score-color": color }}>
      <div className="mini-stat-top">
        <div className="mini-stat-icon">
          {label === "Readability" && "📖"}
          {label === "Maintainability" && "🛠️"}
          {label === "Performance" && "⚡"}
          {label === "Security" && "🛡️"}
          {label === "Complexity" && "🧩"}
        </div>

        <svg className="mini-stat-ring" viewBox="0 0 48 48">
          <circle
            className="mini-ring-bg"
            cx="24"
            cy="24"
            r="20"
          />
          <circle
            className="mini-ring-progress"
            cx="24"
            cy="24"
            r="20"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>

        <span className="mini-stat-score">{value}</span>
      </div>

      <div className="mini-stat-label">{label}</div>

      <div className="mini-stat-bottom">
        <span className="mini-stat-status">{getStatus(value)}</span>
        <span className="mini-stat-percent">/100</span>
      </div>
    </div>
  );
}

function ReviewPanel({ review, loading, code, language, runId, token }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  // Jump to the Run Output tab the moment a run starts, so the user sees it immediately
    useEffect(() => {
    if (runId) setActiveTab("output");
  }, [runId]);

  const downloadPDF = () => {
    generateReviewPDF({ code, language, review });
  };

  const overallScore = review ? extractScore(review) : null;
  const scores = review ? extractScores(review) : {};
  const sections = review ? extractSections(review) : {};
  const hasScores = Object.keys(scores).length > 0;

  const copyOptimizedCode = () => {
    const codeBlockMatch = sections.optimized?.match(/```[\w]*\n([\s\S]*?)```/);
    const cleanCode = codeBlockMatch ? codeBlockMatch[1].trim() : sections.optimized;
    navigator.clipboard.writeText(cleanCode);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  const hasDetails = sections.complexity || sections.security || sections.teacher ||
    sections.tests || sections.beginner || sections.advanced ||
    sections.linebyline || sections.interview || sections.performance;

  const tabs = [
    { key: "overview", label: "Overview", icon: "📝" },
    { key: "issues", label: "Issues", icon: "🐞" },
    { key: "optimized", label: "Optimized Code", icon: "🚀" },
    { key: "details", label: "Details", icon: "📊" },
    { key: "output", label: "Run Output", icon: "🖥️" },
  ];

  return (
    <div className="review-container">
      <div className="review-header">
        <h2 className="review-title">🤖 AI Review</h2>
        {review && (
          <div className="review-actions">
            <button className="copy-btn" onClick={downloadPDF}>📄 PDF</button>
          </div>
        )}
      </div>

      <div className="review-content">
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Analyzing your code...</p>
            <p className="loading-subtext">Our AI is reviewing your code carefully!</p>
          </div>
        )}

        {!loading && overallScore !== null && (
          <div className="score-hero">
            <ScoreGauge score={overallScore} />
            <div className="score-hero-label">Overall Quality Score</div>
            {hasScores && (
              <div className="score-mini-grid">
                {scores.readability !== undefined && <MiniStat label="Readability" value={scores.readability} />}
                {scores.maintainability !== undefined && <MiniStat label="Maintainability" value={scores.maintainability} />}
                {scores.performance !== undefined && <MiniStat label="Performance" value={scores.performance} />}
                {scores.security !== undefined && <MiniStat label="Security" value={scores.security} />}
                {scores.complexity !== undefined && <MiniStat label="Complexity" value={scores.complexity} />}
              </div>
            )}
          </div>
        )}

        {!loading && (
          <>
            <div className="review-tabs-wrapper">
            <div className="review-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`review-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
              </div>
            <div className="review-tab-content">
              {activeTab === "overview" && (
                <>
                  {!review && (
                    <p className="tab-empty-hint">Click "Review Code" to get AI feedback on your code.</p>
                  )}
                  {sections.good && (
                    <div className="review-section">
                      <h3 className="section-heading">✅ Strengths</h3>
                      <div className="section-content"><ReactMarkdown>{sections.good}</ReactMarkdown></div>
                    </div>
                  )}
                  {sections.summary && (
                    <div className="review-section">
                      <h3 className="section-heading">📝 Summary</h3>
                      <div className="section-content"><ReactMarkdown>{sections.summary}</ReactMarkdown></div>
                    </div>
                  )}
                  {review && !sections.good && !sections.summary && (
                    <div className="review-section">
                      <h3 className="section-heading">📋 Full Review</h3>
                      <div className="section-content"><ReactMarkdown>{review}</ReactMarkdown></div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "issues" && (
                sections.issues ? (
                  <div className="review-section">
                    <h3 className="section-heading">🐞 Issues Found</h3>
                    <div className="section-content"><ReactMarkdown>{sections.issues}</ReactMarkdown></div>
                  </div>
                ) : (
                  <p className="tab-empty-hint">{review ? "No issues section in this review mode." : "Run a review first."}</p>
                )
              )}

              {activeTab === "optimized" && (
                sections.optimized ? (
                  <div className="review-section">
                    <div className="section-heading-row">
                      <h3 className="section-heading">🚀 Optimized Code</h3>
                      <button className="section-copy-btn" onClick={copyOptimizedCode}>
                        {copiedOptimized ? "✅ Copied!" : "📋 Copy"}
                      </button>
                    </div>
                    <div className="section-content"><ReactMarkdown>{sections.optimized}</ReactMarkdown></div>
                  </div>
                ) : (
                  <p className="tab-empty-hint">{review ? "No optimized code for this review mode." : "Run a review first."}</p>
                )
              )}

              {activeTab === "details" && (
                <div className="collapsible-sections">
                  {hasDetails ? (
                    <>
                      {sections.complexity && (
                        <CollapsibleSection title="Complexity Analysis" icon="📊" defaultOpen>
                          <ReactMarkdown>{sections.complexity}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.security && (
                        <CollapsibleSection title="Security Analysis" icon="🔒">
                          <ReactMarkdown>{sections.security}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.teacher && (
                        <CollapsibleSection title="AI Teacher Mode" icon="🎓">
                          <ReactMarkdown>{sections.teacher}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.tests && (
                        <CollapsibleSection title="Test Cases" icon="✏️">
                          <ReactMarkdown>{sections.tests}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.beginner && (
                        <CollapsibleSection title="Beginner Explanation" icon="📖">
                          <ReactMarkdown>{sections.beginner}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.advanced && (
                        <CollapsibleSection title="Advanced Insights" icon="💡">
                          <ReactMarkdown>{sections.advanced}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.linebyline && (
                        <CollapsibleSection title="Line-by-Line Explanation" icon="🔍">
                          <ReactMarkdown>{sections.linebyline}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.interview && (
                        <CollapsibleSection title="Interview Questions" icon="🎯">
                          <ReactMarkdown>{sections.interview}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                      {sections.performance && (
                        <CollapsibleSection title="Performance Analysis" icon="🚀">
                          <ReactMarkdown>{sections.performance}</ReactMarkdown>
                        </CollapsibleSection>
                      )}
                    </>
                  ) : (
                    <p className="tab-empty-hint">
                      {review ? "No extra details for this review mode." : "Run a review first."}
                    </p>
                  )}
                </div>
              )}

              {activeTab === "output" && (
                <div className="run-output-body">
                  {runId ? (
                    <InteractiveTerminal
                      key={runId}
                      language={language}
                      code={code}
                      token={token}
                    />
                  ) : (
                    <p className="tab-empty-hint">Click "Run" to execute your code in a live terminal.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReviewPanel;