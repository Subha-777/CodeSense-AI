import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./AiChat.css";

function AiChat({ code, language, review }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I've reviewed your ${language} code. Feel free to ask me anything about it — I can explain issues, suggest improvements, or answer any coding questions! 💬`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/chat",
        {
          messages: updatedMessages,
          code,
          language,
          review,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: res.data.reply },
      ]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again!",
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Why is this code inefficient?",
    "Explain line by line",
    "How can I improve security?",
    "Give me a simpler version",
    "What design pattern should I use?",
    "Generate more test cases",
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        className="chat-float-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Ask AI about your code"
      >
        {isOpen ? "✕" : "💬"}
        {!isOpen && messages.length > 1 && (
          <span className="chat-notification">{messages.filter(m => m.role === "assistant").length - 1}</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-title">🤖 AI Code Assistant</span>
              <span className="chat-subtitle">Ask anything about your code</span>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="suggested-questions">
              <p className="suggested-label">Quick questions:</p>
              <div className="suggested-grid">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    className="suggested-btn"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"}`}
              >
                <span className="chat-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </span>
                <div className="chat-text">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble assistant">
                <span className="chat-avatar">🤖</span>
                <div className="chat-text typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send)"
              rows={2}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AiChat;