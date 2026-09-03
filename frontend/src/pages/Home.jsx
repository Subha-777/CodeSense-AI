import { useState } from "react";
import axios from "axios";
import CodeEditor from "../components/CodeEditor";
import ReviewPanel from "../components/ReviewPanel";
import Header from "../components/Header";
import AiChat from "../components/AiChat";
import { useAuth } from "../context/AuthContext";
import GitHubFetch from "../components/GitHubFetch";
import ConvertResult from "../components/ConvertResult";
import DocsGenerator from "../components/DocsGenerator";
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

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState("");

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

  const handleRun = async (stdin) => {
    if (!code.trim()) {
      alert("Please enter some code first!");
      return;
    }
    setRunning(true);
    setRunError("");
    setRunResult(null);
    try {
      const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/run-code`,
  { code, language, stdin },
  { headers: { Authorization: `Bearer ${token}` } }
);
      setRunResult(res.data);
    } catch (err) {
      setRunError(err.response?.data?.error || "Failed to run code");
    }
    setRunning(false);
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
            runResult={runResult}
            runLoading={running}
            runError={runError}
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