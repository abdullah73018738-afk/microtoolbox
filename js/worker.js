/**
 * Web Worker for AST-Based Transformation & High-Volume Text Calculations
 */

// Basic AST-style Lexer/Tokenizer for JavaScript Code Transformation
function minifyJS(code) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let inSingleComment = false;
  let inMultiComment = false;
  let inTemplateLiteral = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';

    // Handle Inline Single-Line Comments
    if (inSingleComment) {
      if (char === '\n') inSingleComment = false;
      continue;
    }

    // Handle Multi-Line Comments
    if (inMultiComment) {
      if (char === '*' && nextChar === '/') {
        inMultiComment = false;
        i++;
      }
      continue;
    }

    // Handle Strings & Escaped Characters
    if (inString) {
      output += char;
      if (char === '\\') {
        output += nextChar;
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    // Handle Template Literals
    if (inTemplateLiteral) {
      output += char;
      if (char === '\\') {
        output += nextChar;
        i++;
      } else if (char === '`') {
        inTemplateLiteral = false;
      }
      continue;
    }

    // Detect Comment/String Entry
    if (char === '/' && nextChar === '/') {
      inSingleComment = true;
      i++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inMultiComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      output += char;
      continue;
    }
    if (char === '`') {
      inTemplateLiteral = true;
      output += char;
      continue;
    }

    // Collapse Redundant Whitespace securely outside string contexts
    if (/\s/.test(char)) {
      if (output.length > 0 && /\w/.test(output[output.length - 1]) && /\w/.test(nextChar)) {
        output += ' ';
      }
      continue;
    }

    output += char;
  }

  return output;
}

function minifyCSS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Strip comments safely
    .replace(/\s*([\{\}\:\;\,])\s*/g, '$1') // Strip spaces around structural symbols
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

function minifyHTML(code) {
  return code
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/>\s+</g, '><') // Collapse spaces between tags
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function analyzeText(text) {
  if (!text) {
    return { words: 0, chars: 0, lines: 0, readTime: '0m' };
  }

  const chars = text.length;
  const lines = text.split('\n').length;
  // Word extraction using non-blocking Unicode Regex matching
  const wordsArray = text.trim().match(/[\w\u00C0-\u024F]+/g);
  const words = wordsArray ? wordsArray.length : 0;
  
  // Average reading speed: ~200 WPM
  const readTimeMinutes = Math.ceil(words / 200);

  return {
    words,
    chars,
    lines,
    readTime: `${readTimeMinutes}m`
  };
}

function parseAndFormatJSON(jsonString, indent = 2) {
  const parsed = JSON.parse(jsonString); // Will throw native error if invalid
  return JSON.stringify(parsed, null, indent);
}

// Worker Communication Handler
self.onmessage = function (e) {
  const { id, action, payload } = e.data;

  try {
    let result;
    switch (action) {
      case 'MINIFY':
        if (payload.lang === 'js') result = minifyJS(payload.code);
        else if (payload.lang === 'css') result = minifyCSS(payload.code);
        else if (payload.lang === 'html') result = minifyHTML(payload.code);
        break;

      case 'ANALYZE_TEXT':
        result = analyzeText(payload.text);
        break;

      case 'FORMAT_JSON':
        result = parseAndFormatJSON(payload.json, payload.indent);
        break;

      default:
        throw new Error(`Unknown action type: ${action}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
