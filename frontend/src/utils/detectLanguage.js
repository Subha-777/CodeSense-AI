export function detectLanguage(code) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (/<!DOCTYPE html>/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return "html";
  if (/#include\s*<stdio\.h>/.test(trimmed) && !/#include\s*<iostream/.test(trimmed)) return "c";
  if (/#include\s*<iostream/.test(trimmed) || /\bstd::/.test(trimmed) || /\bcout\s*<</.test(trimmed)) return "cpp";
  if (/\bpublic\s+class\s+\w+/.test(trimmed) || /\bSystem\.out\.println/.test(trimmed)) return "java";
  if (/^\s*package\s+main/m.test(trimmed) || /\bfunc\s+main\s*\(/.test(trimmed)) return "go";
  if (/<\?php/.test(trimmed)) return "php";
  if (/\bfn\s+main\s*\(/.test(trimmed) || /\blet\s+mut\b/.test(trimmed)) return "rust";

  if (
    /^\s*def\s+\w+\s*\(.*\)\s*:/m.test(trimmed) ||
    /^\s*(if|elif|for|while)\b.*:\s*$/m.test(trimmed) ||
    /^\s*import\s+\w+/m.test(trimmed) ||
    /^\s*from\s+\w+\s+import\b/m.test(trimmed) ||
    (/\bprint\(/.test(trimmed) && /\binput\(/.test(trimmed))
  ) return "python";

  return null;
}