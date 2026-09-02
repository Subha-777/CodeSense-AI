require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");

const authRoutes = require("./routes/auth");
const protect = require("./middleware/authMiddleware");
const Review = require("./models/Review");
const User = require("./models/User");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = 5000;
const upload = multer();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);

app.get("/", (req, res) => {
  res.json({ message: "CodeSense AI Server is running!" });
});

// Auth routes
app.use("/api/auth", authRoutes);
// Admin routes
app.use("/api/admin", adminRoutes);

// Get logged-in user's review history
app.get("/api/reviews", protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .sort({ createdAt: -1 }); // newest first

    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a review
app.delete("/api/reviews/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Make sure the review belongs to the logged-in user
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics for the logged-in user
app.get("/api/analytics", protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id }).sort({ createdAt: 1 });

    const totalReviews = reviews.length;

    const scoredReviews = reviews.filter((r) => r.qualityScore !== null);
    const averageScore =
      scoredReviews.length > 0
        ? Math.round(
            scoredReviews.reduce((sum, r) => sum + r.qualityScore, 0) /
              scoredReviews.length
          )
        : null;

    // Count reviews per language
    const languageCounts = {};
    reviews.forEach((r) => {
      languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
    });

    // Score trend: list of { date, score } for charting
    // Score trend: list of { date, score } for charting
    const scoreTrend = scoredReviews.map((r) => ({
      date: r.createdAt,
      score: r.qualityScore,
    }));

    // Weekly activity — reviews per day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyData = await Review.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const found = weeklyData.find((d) => d._id === dateStr);
      weeklyActivity.push({
        day: dayName,
        date: dateStr,
        count: found ? found.count : 0,
      });
    }

    // Calculate streak — consecutive days with at least 1 review
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const allReviewDates = reviews.map((r) =>
      new Date(r.createdAt).toISOString().split("T")[0]
    );
    const uniqueDates = [...new Set(allReviewDates)].sort().reverse();

    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      if (uniqueDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      totalReviews,
      averageScore,
      languageCounts,
      scoreTrend,
      weeklyActivity,
      streak,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review route
app.post("/review", protect, upload.single("file"), async (req, res) => {
  try {
    let code = req.body.code;
    const language = req.body.language || "javascript";
    const reviewMode = req.body.reviewMode || "professional";

    if (req.file) {
      code = req.file.buffer.toString("utf-8");
    }

    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const getPrompt = (code, language, mode) => {
      const base = `You are an expert ${language} code reviewer with 20+ years of experience.

IMPORTANT SCORING RULES — Follow these strictly:
- 90-100: Nearly perfect code. Minor style suggestions only.
- 85-89: Good code. Small improvements possible.
- 75-84: Average code. Several design issues but works correctly.
- 65-74: Below average. Multiple significant issues affecting maintainability.
- Below 65: Poor code. Correctness, security, or serious structural problems.

IMPORTANT SEVERITY RULES — Follow these strictly:
- 🔴 Critical: ONLY for crashes, security vulnerabilities, infinite loops, data loss, SQL injection, null pointer exceptions, or code that breaks functionality.
- 🟡 Warning: Design issues, missing validation, bad practices, performance problems that don't break functionality.
- 🔵 Suggestion: Style improvements, optional enhancements, readability tweaks.

IMPORTANT VALIDATION RULE:
Always check BOTH type AND range for numeric inputs. Example:
if (typeof price !== "number" || typeof discountPercentage !== "number") — check types first
if (price < 0 || discountPercentage < 0 || discountPercentage > 100) — then check ranges

SCORING APPROACH:
- Always show strengths FIRST before problems
- Code that works correctly and is readable should score at least 80/100
- Only use 🔴 Critical for actual breaking issues, never for design preferences`;
      const modes = {
        quick: `${base}

Give a QUICK code review. Be extremely concise and direct. Maximum 200 words total.

## ⭐ Score
X/100

## 🔴 Top Issues Only
List maximum 5 most important issues ONLY in this exact format:
🔴/🟡/🔵 [Issue title]
Fix: [One sentence fix only]

No long explanations. No paragraphs. Keep every fix to one sentence maximum.

## ✅ Good Practices
Maximum 3 bullet points only.

## ⏱️ Complexity
- Time: O(?) 
- Space: O(?)

## 🚀 Optimized Code
Clean improved version with minimal comments.

Code:
\`\`\`${language}
${code}
\`\`\``,

        professional: `${base}

You are reviewing this code as a Senior Software Engineer. Give professional, practical feedback only. No beginner explanations.

## ⭐ Overall Score
X/100

## 📊 Scores
- Readability: X/100
- Maintainability: X/100
- Performance: X/100
- Security: X/100

## 💪 Strengths
3-4 bullet points on what is done well. Be specific.

## 🐞 Issues Found
For each issue use this format:
🔴/🟡/🔵 **[Issue Title]**
- Problem: [One clear sentence]
- Fix: [Practical solution]
- Impact: [Why this matters in production]

## 🔧 Senior Developer Advice
2-3 practical engineering recommendations beyond just fixing bugs.
Think about scalability, maintainability, and real-world usage.

## ⏱️ Complexity Analysis
- Time Complexity: O(?) — brief explanation
- Space Complexity: O(?) — brief explanation

## 🚀 Optimized Code
Clean production-ready version. Minimal comments — only comment non-obvious logic.

## 🧪 Test Cases
3 key test cases:
- Input: [value] | Expected: [result] | Purpose: [what it checks]

Code:
\`\`\`${language}
${code}
\`\`\``,

        learning: `${base}

You are a patient programming teacher explaining to a complete beginner. Every explanation should feel like an online teacher.

## ⭐ Score
X/100

## 📝 What Does This Code Do?
Explain in 3-4 simple sentences what this code does. Use simple words. No technical jargon.

## ✅ What You Did Well
Show this FIRST. 3-4 specific things the student did correctly with encouragement.

## 🐞 Issues Found
For EACH issue use EXACTLY this teaching format:

🔴/🟡/🔵 **[Issue Title]**

**Why is this wrong?**
[Simple explanation a beginner can understand]

**Bad Example:**
\`\`\`
[show the problematic code]
\`\`\`

**Good Example:**
\`\`\`
[show the correct code]
\`\`\`

**Best Practice:**
[One sentence rule to remember]

**Common Mistake:**
[What beginners usually get wrong here]

**Mini Tip:** 💡 [One memorable tip]

## 📖 Line-by-Line Explanation
Explain every line in simple words like explaining to someone who just started programming.

## 🎓 Key Concepts Used
For each concept:
- **[Concept Name]**: [Simple explanation with a real-world analogy]

## ✏️ Practice Exercises
Give 2-3 simple exercises the student can try based on this code to reinforce learning.

## 🚀 Improved Code
Show the corrected code with simple comments explaining each improvement in plain English.

Code:
\`\`\`${language}
${code}
\`\`\``,

        security: `${base}

You are a Security Engineer reviewing this code for vulnerabilities. Only focus on security issues.

IMPORTANT RULES:
- If there are no security issues, clearly state "No security vulnerabilities detected." Do NOT invent fake problems.
- Only report real, actual security risks present in this code.

## 🛡️ Security Score
X/100

## 🔒 Security Summary
2-3 sentences on the overall security posture of this code.

## 🚨 Vulnerabilities Found
Check ONLY for these real vulnerabilities:
SQL Injection, XSS, CSRF, Command Injection, Weak Authentication,
Insecure Password Storage, Missing Input Validation, Hardcoded API Keys,
Sensitive Data Exposure, File Upload Risks, Insecure Deserialization, Missing Rate Limiting

For each REAL vulnerability found:
🔴 **Critical** / 🟡 **Medium** / 🔵 **Low** — [Vulnerability Name]
- **What it is:** [Simple explanation]
- **Risk:** [What could go wrong if exploited]
- **Attack Scenario:** [How an attacker could exploit this — one sentence]
- **Fix:** [Exact solution]

## ✅ Security Good Practices
What security practices the code already follows correctly.

## 🔐 Security Recommendations
Additional security improvements to consider even if not critical.

## 🛡️ Secure Version
Show the fully secured version of the code.

Code:
\`\`\`${language}
${code}
\`\`\``,

        performance: `${base}

You are a Performance Engineer reviewing this code for efficiency. Only focus on performance.

IMPORTANT RULES:
- If there are no performance issues, clearly state "No performance bottlenecks detected." Do NOT invent fake problems.
- Only report real performance issues actually present in this code.

## ⚡ Performance Score
X/100

## 📊 Complexity Analysis
- **Current Time Complexity:** O(?) — explanation
- **Current Space Complexity:** O(?) — explanation
- **Optimal Time Complexity:** O(?) — is improvement possible?
- **Optimal Space Complexity:** O(?) — is improvement possible?

## ⚡ Performance Summary
2-3 sentences on overall performance of this code.

## 🐌 Performance Issues Found
Check ONLY for these real issues:
Nested loops, Unnecessary iterations, Memory leaks, Expensive operations inside loops,
Inefficient data structures, Unnecessary object creation, Blocking operations,
Redundant calculations, Inefficient DOM updates, N+1 query problems

For each REAL issue found:
🔴/🟡/🔵 **[Issue Title]**
- **Problem:** [What the bottleneck is]
- **Impact:** [How much this affects performance]
- **Fix:** [Exact optimization]

## 🚀 Optimization Techniques
Specific techniques that apply to THIS code:
- Algorithm improvements
- Better data structures
- Caching opportunities
- Memory optimizations

## 📈 Expected Improvement
After optimization: [Describe expected performance gain]

## ⚡ Optimized Code
Performance-optimized version with comments explaining each optimization.

Code:
\`\`\`${language}
${code}
\`\`\``,

        interview: `${base}

You are a Senior Technical Interviewer at a top tech company. Review this code from an interviewer's perspective.

## ⭐ Interview Score
X/100

## 🎯 Interview Difficulty
Pick exactly one:
🟢 Fresher Level | 🟡 Intermediate Level | 🔴 Senior Level

## 🤖 AI Confidence
Pick exactly one:
High (90-100%) | Medium (70-89%) | Low (below 70%)

## 👔 First Impression
2 sentences only. What does an interviewer think in the first 10 seconds of seeing this code?

## ✅ Strengths
Show this FIRST. 3-4 specific things that would IMPRESS an interviewer. Be direct.

## ⚠️ Weaknesses
3-4 specific things an interviewer would QUESTION or CRITICIZE. Be direct.

## 🧠 How Interviewers Think About This Code
2-3 sentences on what an interviewer is actually evaluating when they see this type of code.

## 🐞 Issues an Interviewer Would Notice
For EACH issue use this SHORT format:
🔴/🟡/🔵 **[Issue Title]**
- **What interviewer sees:** [One sentence]
- **What they expect:** [One sentence]
- **Interview Tip:** [Exactly what to say if asked about this]

Maximum 4 issues. Keep each issue to 3 lines maximum.

## ❓ Common Interview Questions
Scale based on code size:
- Less than 10 lines: 3 questions
- 10 to 30 lines: 5 questions  
- More than 30 lines: 8 questions

For each question:
**Q: [Question]**
💡 **Ideal Answer:** [2-3 sentences. Direct and confident.]
🔄 **Follow-up:** [One likely follow-up question]
🎯 **Senior Tip:** [One insider tip on how to impress the interviewer]

## ⏱️ Complexity Analysis
- Time Complexity: O(?) — one line
- Space Complexity: O(?) — one line

## 🚀 Optimized Code
Clean, minimal improved version.
IMPORTANT: Minimal comments only. Do NOT over-comment obvious code.

## 📚 Topics to Study
5 bullet points maximum. Topics to review before the interview based on this code.

Code:
\`\`\`${language}
${code}
\`\`\``,
      };

      return modes[mode] || modes.professional;
    };

    const prompt = getPrompt(code, language, reviewMode);

    let text = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        break; // success, exit loop
      } catch (retryError) {
        attempts++;
        if (attempts === maxAttempts) throw retryError;
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Extract quality score (e.g. "98/100") from the review text
    const scoreMatch = text.match(/(\d{1,3})\s*\/\s*100/);
    const qualityScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

    // Save review to database
    await Review.create({
      userId: req.user._id,
      code,
      language,
      review: text,
      qualityScore,
    });

    res.json({ review: text });
  } catch (error) {
    console.error("Error details:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI Chat route
app.post("/api/chat", protect, async (req, res) => {
  try {
    const { messages, code, language, review } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build context-aware prompt
    const systemContext = `You are an expert code reviewer and programming teacher with 20+ years of experience. 
You have just reviewed the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Your review was:
${review}

Now the user wants to ask follow-up questions about the code or review. 
Answer helpfully, clearly, and educationally. Keep responses concise but complete.
If they ask for code examples, provide them in proper code blocks.`;

    // Build conversation history for Gemini
    const conversationHistory = messages
      .slice(1) // Skip the initial greeting message
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    // Start chat with context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemContext }],
        },
        {
          role: "model",
          parts: [{ text: "I understand. I've reviewed the code and I'm ready to answer any follow-up questions about it." }],
        },
        ...conversationHistory.slice(0, -1), // all except last message
      ],
    });

    // Get last user message
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GitHub Integration - Fetch code from GitHub URL
app.post("/api/github/fetch", protect, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "GitHub URL is required" });
    }

    // Convert GitHub blob URL to raw URL
    let rawUrl = url;
    if (url.includes("github.com") && url.includes("/blob/")) {
      rawUrl = url
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
    }

    // Validate it's a GitHub URL
    if (!rawUrl.includes("github.com") && !rawUrl.includes("raw.githubusercontent.com")) {
      return res.status(400).json({ error: "Please enter a valid GitHub URL" });
    }

    // Fetch the code from GitHub
    const response = await fetch(rawUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: "File not found. Make sure the URL is correct and the repository is public" });
      }
      return res.status(400).json({ error: "Failed to fetch code from GitHub" });
    }

    const code = await response.text();

    // Check file size — limit to 50KB to avoid token limit issues
    if (code.length > 50000) {
      return res.status(400).json({ 
        error: "File is too large for review. Please use a file smaller than 50KB or paste a specific function/section of the code." 
      });
    }

    // Detect language from file extension
    const extension = rawUrl.split(".").pop().toLowerCase();
    const languageMap = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      go: "go",
      php: "php",
    };
    const language = languageMap[extension] || "javascript";

    res.json({ code, language });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from GitHub: " + error.message });
  }
});

// Code Conversion Route
app.post("/api/convert", protect, async (req, res) => {
  try {
    const { code, fromLanguage, toLanguage } = req.body;

    if (!code || !fromLanguage || !toLanguage) {
      return res.status(400).json({ error: "Code, source language, and target language are required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert programmer. Convert the following ${fromLanguage} code to ${toLanguage}.

IMPORTANT RULES:
1. Preserve the exact same logic and functionality
2. Follow ${toLanguage} best practices and conventions
3. Use proper ${toLanguage} naming conventions
4. Add brief comments only where the logic differs significantly between languages
5. Return ONLY the converted code — no explanations, no markdown, no backticks
6. Make sure the converted code is complete and runnable

${fromLanguage} code to convert:
${code}

Return only the ${toLanguage} code:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let convertedCode = response.text();

    // Clean up any markdown formatting if present
    convertedCode = convertedCode
      .replace(/```[\w]*\n?/g, "")
      .replace(/```/g, "")
      .trim();

    res.json({ convertedCode, toLanguage });
  } catch (error) {
    console.error("Conversion error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Documentation Generator Route
app.post("/api/generate-docs", protect, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert technical writer and ${language} developer. Generate comprehensive, professional documentation for the following ${language} code.

IMPORTANT RULES:
1. Generate documentation in the style of the language (JSDoc for JavaScript/TypeScript, docstrings for Python, Javadoc for Java, etc.)
2. Document EVERY function, class, and method
3. Include parameter types and descriptions
4. Include return value descriptions
5. Include usage examples where helpful
6. Add inline comments for complex logic
7. Return the COMPLETE code with documentation added — not just the docs separately

Structure your response as:

## 📋 Documentation Summary
Brief overview of what this code does.

## 📦 Functions/Classes Documented
List each function/class with:
- **Name**: function name
- **Purpose**: what it does
- **Parameters**: list with types and descriptions
- **Returns**: what it returns
- **Example**: usage example

## 💻 Documented Code
The complete code with all documentation added.

Code to document:
\`\`\`${language}
${code}
\`\`\``;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const documentation = response.text();

    res.json({ documentation });
  } catch (error) {
    console.error("Documentation error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------- Run Code (JDoodle Compiler API) ----------
const JDOODLE_LANGUAGE_MAP = {
  javascript: { language: "nodejs", versionIndex: "0" },
  typescript: { language: "typescript", versionIndex: "0" },
  python:     { language: "python3", versionIndex: "0" },
  java:       { language: "java", versionIndex: "0" },
  c:          { language: "c", versionIndex: "0" },
  cpp:        { language: "cpp17", versionIndex: "0" },
  go:         { language: "go", versionIndex: "0" },
  php:        { language: "php", versionIndex: "0" },
  csharp:     { language: "csharp", versionIndex: "0" },
  rust:       { language: "rust", versionIndex: "0" },
};

app.post("/api/run-code", protect, async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "No code provided" });
    }
    if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Code execution is not configured on the server" });
    }

    const mapped = JDOODLE_LANGUAGE_MAP[language];
    if (!mapped) {
      return res.status(400).json({ error: `Running ${language} code isn't supported yet` });
    }

    const jdoodleRes = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        stdin: stdin || "",
        language: mapped.language,
        versionIndex: mapped.versionIndex,
      }),
    });

    const result = await jdoodleRes.json();

    if (!jdoodleRes.ok || result.error) {
      console.error("JDoodle error:", result);
      return res.status(502).json({ error: result.error || "Code execution service failed" });
    }

    // JDoodle doesn't separate stdout/stderr — errors come back inside "output" too,
    // so we detect likely compile/runtime errors by statusCode
    const isError = result.statusCode !== 200 || looksLikeError(result.output);

    res.json({
      stdout: isError ? "" : result.output,
      stderr: isError ? result.output : "",
      compileOutput: "",
      status: isError ? "Error" : "Accepted",
      time: result.cpuTime,
      memory: result.memory ? result.memory / 1024 : null, // JDoodle returns KB; convert to match our /1024 display logic
    });
  } catch (error) {
    console.error("Run code error:", error.message);
    res.status(500).json({ error: "Failed to execute code: " + error.message });
  }
});

// JDoodle returns statusCode: 200 even when the program crashed at runtime,
// so we also check the output text itself for common error signatures
function looksLikeError(output) {
  if (!output) return false;
  const errorPatterns = [
    /Traceback \(most recent call last\)/i,   // Python
    /Exception in thread/i,                    // Java
    /error:/i,                                 // C/C++/Rust compiler errors
    /ReferenceError|TypeError|SyntaxError/i,   // JavaScript/TypeScript
    /Fatal error/i,                            // PHP
    /panicked at/i,                            // Rust runtime panic
    /Unhandled exception/i,                    // C#
    /^\s*at\s+.+\(.+:\d+:\d+\)/m,               // generic stack trace line
  ];
  return errorPatterns.some((pattern) => pattern.test(output));
}

app.listen(PORT, () => {
  console.log(`CodeSense AI Server running on port ${PORT}`);
}).on("error", (err) => {
  console.error("Server error:", err);
});