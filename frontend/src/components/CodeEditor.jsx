import { useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { go } from "@codemirror/lang-go";
import "./CodeEditor.css";

const getLanguageExtension = (lang) => {
  switch (lang) {
    case "python": return python();
    case "java": return java();
    case "c":
    case "cpp": return cpp();
    case "go": return go();
    case "typescript": return javascript({ typescript: true });
    default: return javascript();
  }
};

function CodeEditor({ code, setCode, language, loading, handleReview, reviewMode, setReviewMode, onConvert, onGenerateDocs, onRun, running }) {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [convertTo, setConvertTo] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) viewRef.current.destroy();

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setCode(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "14px", fontFamily: "'JetBrains Mono', 'Courier New', monospace" },
          ".cm-scroller": { overflow: "auto", height: "100%" },
          ".cm-content": { padding: "12px 0" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, [language]);

  useEffect(() => {
    if (!viewRef.current) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc !== code) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCode(e.target.result);
      reader.readAsText(file);
    }
  };

  const handleConvert = async () => {
    if (!code.trim()) { alert("Please enter some code first!"); return; }
    if (!convertTo) { alert("Please select a target language!"); return; }
    setConvertLoading(true);
    await onConvert(convertTo);
    setConvertLoading(false);
    setConvertTo("");
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2 className="editor-title">📝 Your Code</h2>
        <div className="editor-header-actions">
          <label className="icon-btn" title="Upload File">
            📁
            <input type="file" accept=".js,.py,.java,.c,.cpp,.php,.txt" onChange={handleFileUpload} hidden />
          </label>
          {onGenerateDocs && (
            <button className="icon-btn" onClick={onGenerateDocs} title="Generate Documentation">
              📄
            </button>
          )}
        </div>
      </div>

      <div className="editor-wrapper" ref={editorRef}></div>

      <div className="stdin-toggle-row">
        <button className="stdin-toggle" onClick={() => setShowStdin(!showStdin)}>
          {showStdin ? "− Hide Input" : "+ Add Program Input"}
        </button>
      </div>

      {showStdin && (
        <div className="stdin-section">
          <textarea
            className="stdin-textarea"
            placeholder="Enter input for your program, one value per line..."
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            autoFocus
          />
        </div>
      )}

      <div className="editor-footer">
        <div className="mode-selector">
          <span className="mode-label">Mode:</span>
          {[
            { value: "quick", label: "⚡ Quick" },
            { value: "professional", label: "💼 Professional" },
            { value: "learning", label: "📚 Learning" },
            { value: "security", label: "🔒 Security" },
            { value: "performance", label: "🚀 Performance" },
            { value: "interview", label: "🎯 Interview" },
          ].map((mode) => (
            <button
              key={mode.value}
              className={`mode-btn ${reviewMode === mode.value ? "active" : ""}`}
              onClick={() => setReviewMode(mode.value)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="editor-footer-bottom">
          <span className="line-count">{code.split("\n").length} lines</span>
          <div className="footer-buttons">
            <div className="convert-wrapper">
              <select className="convert-select btn-secondary" value={convertTo} onChange={(e) => setConvertTo(e.target.value)}>
                <option value="">Convert to...</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="php">PHP</option>
                <option value="csharp">C#</option>
                <option value="rust">Rust</option>
              </select>
              <button className="convert-btn btn-secondary" onClick={handleConvert} disabled={convertLoading || !convertTo}>
                {convertLoading ? "⏳" : "🔄 Convert"}
              </button>
            </div>
            <button className="run-btn btn-secondary" onClick={() => onRun(stdin)} disabled={running}>
              {running ? "⏳ Running..." : "▶️ Run"}
            </button>
            <button className={`review-btn btn-primary ${loading ? "loading" : ""}`} onClick={handleReview} disabled={loading}>
              {loading ? "⏳ Reviewing..." : "🔍 Review Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;