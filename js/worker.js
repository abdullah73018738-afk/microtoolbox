/**
 * Web Worker for AST-Based Transformation, Text Calculations & Tag Generation
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
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([\{\}\:\;\,])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function minifyHTML(code) {
  return code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeText(text) {
  if (!text) {
    return { words: 0, chars: 0, lines: 0, readTime: '0m' };
  }

  const chars = text.length;
  const lines = text.split('\n').length;
  const wordsArray = text.trim().match(/[\w\u00C0-\u024F]+/g);
  const words = wordsArray ? wordsArray.length : 0;
  const readTimeMinutes = Math.ceil(words / 200);

  return {
    words,
    chars,
    lines,
    readTime: `${readTimeMinutes}m`
  };
}

function parseAndFormatJSON(jsonString, indent = 2) {
  const parsed = JSON.parse(jsonString);
  return JSON.stringify(parsed, null, indent);
}

function generateTags(topic) {
  if (!topic) return '';
  const words = topic.split(/[\s,]+/);
  const baseTags = words.map(w => w.trim().toLowerCase()).filter(Boolean);
  
  const extensions = ['viral', 'trending', '2026', 'guide', 'tips', 'best', 'official', 'tutorial'];
  const allTags = new Set([...baseTags]);

  baseTags.forEach(tag => {
    extensions.forEach(ext => {
      allTags.add(`${tag} ${ext}`);
      allTags.add(`${tag}${ext}`);
    });
  });

  const tagList = Array.from(allTags);
  const commaSeparated = tagList.join(', ');
  const hashtags = tagList.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');

  return `=== SEO Tags (Comma Separated) ===\n${commaSeparated}\n\n=== Social Hashtags ===\n${hashtags}`;
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

      case 'GENERATE_TAGS':
        result = generateTags(payload.topic);
        break;

      default:
        throw new Error(`Unknown action type: ${action}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
