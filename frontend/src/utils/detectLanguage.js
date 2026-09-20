// frontend/src/utils/detectLanguage.js
export function detectLanguage(code) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (/#include\s*<stdio\.h>/.test(trimmed) && !/#include\s*<iostream/.test(trimmed)) return "c";
  if (/#include\s*<iostream/.test(trimmed) || /\bstd::/.test(trimmed) || /\bcout\s*<</.test(trimmed)) return "cpp";
  if (/\bpublic\s+class\s+\w+/.test(trimmed) || /\bSystem\.out\.println/.test(trimmed)) return "java";
  if (/^\s*def\s+\w+\s*\(/m.test(trimmed) || (/\bprint\(.*\)\s*$/m.test(trimmed) && !/;/.test(trimmed))) return "python";
  if (/^\s*package\s+main/m.test(trimmed) || /\bfunc\s+main\s*\(/.test(trimmed)) return "go";
  if (/:\s*(string|number|boolean|any)\b/.test(trimmed) || /\binterface\s+\w+\s*{/.test(trimmed)) return "typescript";
  if (/<\?php/.test(trimmed)) return "php";
  if (/\bfn\s+main\s*\(/.test(trimmed) || /\blet\s+mut\b/.test(trimmed)) return "rust";
  if (/\busing\s+System;/.test(trimmed) || /\bConsole\.WriteLine/.test(trimmed)) return "csharp";

  return null;
}