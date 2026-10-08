/**
 * GLSL Code Formatter & Beautifier
 * Formats GLSL shader source according to standard OpenGL / Khronos / Iris conventions:
 * - Proper block indentation (4 spaces)
 * - Flush-left preprocessor directives (#version, #define, etc.)
 * - Standard operator and comma spacing
 * - Preservation of comments and control flow
 * - Clean vertical rhythm and whitespace trimming
 */

export function formatGlslCode(source: string, indentSize: number = 4): string {
  if (!source) return '';

  const indentStr = ' '.repeat(indentSize);
  const rawLines = source.split('\n');
  const formattedLines: string[] = [];

  let indentLevel = 0;
  let inMultiLineComment = false;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Preserve empty lines, but avoid multiple consecutive blank lines
    if (!trimmed) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    // Multi-line comment tracking
    if (inMultiLineComment) {
      // Keep indentation consistent with comment block
      formattedLines.push(indentStr.repeat(indentLevel) + trimmed);
      if (trimmed.includes('*/')) {
        inMultiLineComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inMultiLineComment = true;
      }
      formattedLines.push(indentStr.repeat(indentLevel) + trimmed);
      continue;
    }

    // Preprocessor directives are always flush-left (column 0)
    if (trimmed.startsWith('#')) {
      formattedLines.push(trimmed);
      continue;
    }

    // Count braces in this line
    const openBraces = countOccurrences(trimmed, '{');
    const closeBraces = countOccurrences(trimmed, '}');

    // If the line starts with a closing brace (e.g. "}", "} else {", "};"), dedent before printing
    let currentLineIndent = indentLevel;
    if (trimmed.startsWith('}')) {
      currentLineIndent = Math.max(0, indentLevel - 1);
    }

    // Beautify tokens and spacing in standard GLSL expressions
    const beautifiedContent = beautifyGlslLine(trimmed);

    formattedLines.push(indentStr.repeat(currentLineIndent) + beautifiedContent);

    // Update ongoing indent level for subsequent lines
    indentLevel = Math.max(0, indentLevel + openBraces - closeBraces);
  }

  // Ensure single trailing newline
  return formattedLines.join('\n').trim() + '\n';
}

function countOccurrences(line: string, char: string): number {
  let count = 0;
  let inString = false;
  let inSingleComment = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (c === '/' && next === '/') {
      inSingleComment = true;
      break; // Rest of line is comment
    }
    if (c === '"') inString = !inString;
    if (!inString && !inSingleComment && c === char) {
      count++;
    }
  }
  return count;
}

/**
 * Standardizes spacing around operators, commas, and control statements
 */
function beautifyGlslLine(line: string): string {
  // If line is a comment, don't modify internal spacing
  if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
    return line;
  }

  // Separate line from trailing comment if present
  let codePart = line;
  let commentPart = '';
  const commentIdx = line.indexOf('//');
  if (commentIdx !== -1) {
    codePart = line.substring(0, commentIdx).trimEnd();
    commentPart = ' ' + line.substring(commentIdx);
  }

  let formatted = codePart;

  // 1. Spacing after commas: "," -> ", "
  formatted = formatted.replace(/,([^\s])/g, ', $1');

  // 2. Spacing before open braces: ") {" or "){" -> ") {"
  formatted = formatted.replace(/\)\s*\{/g, ') {');

  // 3. Spacing after control keywords
  formatted = formatted.replace(/\b(if|for|while|switch)\s*\(/g, '$1 (');

  // 4. "}else{" or "} else {" -> "} else {"
  formatted = formatted.replace(/\}\s*else\s*\{/g, '} else {');
  formatted = formatted.replace(/\}\s*else\s+if\s*\(/g, '} else if (');

  // 5. Binary operators spacing: =, +=, -=, *=, /=, ==, !=, <=, >=, &&, ||
  formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*(\+=|-=|\*=|\/=|==|!=|<=|>=|&&|\|\||=)\s*([a-zA-Z0-9_\(\[\-+])/g, '$1 $2 $3');

  // 6. Arithmetic operators +, -, *, / between identifiers/numbers
  formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*(\+|\*|\/)\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');

  // 7. Clean multiple spaces inside expression
  formatted = formatted.replace(/ {2,}/g, ' ');

  // 8. Semicolon spacing: ensure no space before semicolon
  formatted = formatted.replace(/\s+;/g, ';');

  return formatted + commentPart;
}
