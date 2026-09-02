import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { generateReviewPDF } from "../utils/pdfGenerator";
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

const getScoreEmoji = (score) => {
  if (score >= 90) return "🟢";
  if (score >= 70) return "🟡";
  return "🔴";
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

function ScoreBar({ label, score }) {
  const color = getScoreColor(score);
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }}></div>
      </div>
      <span className="score-bar-value" style={{ color }}>{score}</span>
    </div>
  );
}

function ReviewPanel({ review, loading, code, language, runResult, runLoading, runError }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Jump to the Run Output tab the moment a run starts, so the user sees it immediately
  useEffect(() => {
    if (runLoading) setActiveTab("output");
  }, [runLoading]);

  const copyReview = () => {
    navigator.clipboard.writeText(review);
    alert("Review copied to clipboard!");
  };

  const downloadPDF = () => {
    generateReviewPDF({ code, language, review });
  };
  const [copiedOptimized, setCopiedOptimized] = useState(false);

const copyOptimizedCode = () => {
  // Strip markdown code fences (```java ... ```) so only runnable code is copied
  const codeBlockMatch = sections.optimized.match(/```[\w]*\n([\s\S]*?)```/);
  const cleanCode = codeBlockMatch ? codeBlockMatch[1].trim() : sections.optimized;
  navigator.clipboard.writeText(cleanCode);
  setCopiedOptimized(true);
  setTimeout(() => setCopiedOptimized(false), 2000);
};
  const overallScore = review ? extractScore(review) : null;
  const scores = review ? extractScores(review) : {};
  const sections = review ? extractSections(review) : {};
  const hasScores = Object.keys(scores).length > 0;

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
          <div className="score-card">
            <div className="score-main">
              <span className="score-emoji">{getScoreEmoji(overallScore)}</span>
              <span className="score-number" style={{ color: getScoreColor(overallScore) }}>
                {overallScore}
              </span>
              <span className="score-outof">/100</span>
            </div>
            <div className="score-label">Overall Quality Score</div>

            {hasScores && (
              <div className="score-bars">
                {scores.readability && <ScoreBar label="Readability" score={scores.readability} />}
                {scores.maintainability && <ScoreBar label="Maintainability" score={scores.maintainability} />}
                {scores.performance && <ScoreBar label="Performance" score={scores.performance} />}
                {scores.security && <ScoreBar label="Security" score={scores.security} />}
                {scores.complexity && <ScoreBar label="Complexity" score={scores.complexity} />}
              </div>
            )}
          </div>
        )}

        {!loading && (
          <>
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
                  {runLoading && <div className="run-output-loading">⏳ Executing your code...</div>}

                  {runError && !runLoading && (
                    <div className="run-output-error">❌ {runError}</div>
                  )}

                  {!runLoading && !runError && !runResult && (
                    <p className="tab-empty-hint">Click "Run" to execute your code and see output here.</p>
                  )}

                  {runResult && !runLoading && (
                    <>
                      <div className="run-status-row">
                        <span className={`run-status-badge ${runResult.status === "Accepted" ? "success" : "warn"}`}>
                          {runResult.status}
                        </span>
                        {runResult.time && <span className="run-meta">⏱️ {runResult.time}s</span>}
                        {runResult.memory && <span className="run-meta">💾 {Math.round(runResult.memory)} MB</span>}
                      </div>

                      {runResult.compileOutput && (
                        <div className="run-block compile-error"><strong>Compile Output:</strong><pre>{runResult.compileOutput}</pre></div>
                      )}
                      {runResult.stdout && (
                        <div className="run-block stdout"><strong>stdout:</strong><pre>{runResult.stdout}</pre></div>
                      )}
                      {runResult.stderr && (
                        <div className="run-block stderr"><strong>stderr:</strong><pre>{runResult.stderr}</pre></div>
                      )}
                      {!runResult.stdout && !runResult.stderr && !runResult.compileOutput && (
                        <div className="run-block no-output">No output produced.</div>
                      )}
                    </>
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