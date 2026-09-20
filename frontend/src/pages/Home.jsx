import { useState, useEffect } from "react";import axios from "axios";
import CodeEditor from "../components/CodeEditor";
import ReviewPanel from "../components/ReviewPanel";
import Header from "../components/Header";
import AiChat from "../components/AiChat";
import { useAuth } from "../context/AuthContext";
import GitHubFetch from "../components/GitHubFetch";
import ConvertResult from "../components/ConvertResult";
import DocsGenerator from "../components/DocsGenerator";
import { useLocation, useNavigate } from "react-router-dom";
import { detectLanguage } from "../utils/detectLanguage";
import "../App.css";

function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [reviewMode, setReviewMode] = useState("professional");
  const { token } = useAuth();
  const [showDocs, setShowDocs] = useState(false);
  const [convertResult, setConvertResult] = useState(null);

  const [runId, setRunId] = useState(null);

  const location = useLocation();
const navigate = useNavigate();

useEffect(() => {
  if (location.state?.historyItem) {
    const item = location.state.historyItem;
    setCode(item.code);
    setLanguage(item.language);
    setReview(item.review);
    navigate(location.pathname, { replace: true, state: {} });
  } else if (location.state?.fresh) {
    setCode("");
    setReview("");
    navigate(location.pathname, { replace: true, state: {} });
  }
}, [location.state]);
useEffect(() => {
  const detected = detectLanguage(code);
  if (detected && detected !== language) {
    setLanguage(detected);
  }
}, [code]);


  const handleReview = async () => {
    if (!code.trim()) {
      alert("Please enter some code first!");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
  `${import.meta.env.VITE_API_URL}/review`,
  { code, language, reviewMode },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setReview(response.data.review);
    } catch (error) {
      if (error.response?.status === 503) {
        setReview("⚠️ Gemini AI is temporarily busy. Please wait a moment and try again!");
      } else if (error.response?.status === 429) {
        setReview("⚠️ Too many requests. Please wait a minute before trying again!");
      } else {
        setReview("❌ Error reviewing code. Please check your connection and try again!");
      }
    }
    setLoading(false);
  };

  const handleConvert = async (targetLanguage) => {
    if (!code.trim()) {
      alert("Please enter some code first!");
      return;
    }
    try {
      const response = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/convert`,
  { code, fromLanguage: language, toLanguage: targetLanguage },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setConvertResult({
        code: response.data.convertedCode,
        language: targetLanguage,
      });
    } catch (error) {
      alert("Conversion failed. Please try again!");
    }
  };

const [running, setRunning] = useState(false);

const handleRun = () => {
  if (!code.trim()) {
    alert("Please enter some code first!");
    return;
  }
  setRunning(true);
  setRunId(Date.now());
};
    
  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        language={language}
        setLanguage={setLanguage}
      />
      <main className="main-content">
        <div className="editor-side">
          <GitHubFetch
            onCodeFetched={(fetchedCode, fetchedLanguage) => {
              setCode(fetchedCode);
              setLanguage(fetchedLanguage);
            }}
          />
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            loading={loading}
            handleReview={handleReview}
            reviewMode={reviewMode}
            setReviewMode={setReviewMode}
            onConvert={handleConvert}
            onGenerateDocs={() => setShowDocs(true)}
            onRun={handleRun}
            running={running}
          />
        </div>
        <div className="review-side">
          <ReviewPanel
  review={review}
  loading={loading}
  code={code}
  language={language}
  runId={runId}
  token={token}
  onRunFinished={() => setRunning(false)}
/>
        </div>
        {convertResult && (
          <ConvertResult
            result={convertResult}
            onClose={() => setConvertResult(null)}
            onUseCode={(newCode, newLanguage) => {
              setCode(newCode);
              setLanguage(newLanguage);
            }}
          />
        )}
        {review && (
          <AiChat code={code} language={language} review={review} />
        )}
      </main>
      {showDocs && (
        <DocsGenerator
          code={code}
          language={language}
          onClose={() => setShowDocs(false)}
        />
      )}
    </div>
  );
}

export default Home;