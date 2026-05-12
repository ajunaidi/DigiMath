/**
 * MathVoice — Speech-to-LaTeX Parser
 * Converts natural language math expressions to LaTeX WITHOUT any AI API.
 * 100% browser-based, rule-based parser.
 */

const MathParser = (() => {

  // Greek letter mappings
  const GREEK = {
    'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta',
    'epsilon': '\\epsilon', 'zeta': '\\zeta', 'eta': '\\eta', 'theta': '\\theta',
    'iota': '\\iota', 'kappa': '\\kappa', 'lambda': '\\lambda', 'mu': '\\mu',
    'nu': '\\nu', 'xi': '\\xi', 'pi': '\\pi', 'rho': '\\rho',
    'sigma': '\\sigma', 'tau': '\\tau', 'upsilon': '\\upsilon', 'phi': '\\phi',
    'chi': '\\chi', 'psi': '\\psi', 'omega': '\\omega',
    'capital alpha': 'A', 'capital beta': 'B', 'capital gamma': '\\Gamma',
    'capital delta': '\\Delta', 'capital theta': '\\Theta', 'capital lambda': '\\Lambda',
    'capital sigma': '\\Sigma', 'capital phi': '\\Phi', 'capital psi': '\\Psi',
    'capital omega': '\\Omega', 'capital pi': '\\Pi',
  };

  // Number word → digit mappings
  const NUMBERS = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20',
    'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60',
    'seventy': '70', 'eighty': '80', 'ninety': '90', 'hundred': '100',
  };

  // Ordered rules: [pattern, replacement]
  // Patterns are applied in order on the normalized input text
  const RULES = [
    // === Calculus: Integrals ===
    [/\bintegral\s+of\s+(.+?)\s+d\s*([a-z])\s+from\s+(\S+)\s+to\s+(\S+)/gi,
      (m, expr, v, a, b) => `\\int_{${wrap(a)}}^{${wrap(b)}} ${parseInner(expr)} \\, d${v}`],
    [/\bintegral\s+from\s+(\S+)\s+to\s+(\S+)\s+of\s+(.+?)\s+d\s*([a-z])/gi,
      (m, a, b, expr, v) => `\\int_{${wrap(a)}}^{${wrap(b)}} ${parseInner(expr)} \\, d${v}`],
    [/\bintegral\s+of\s+(.+?)\s+d\s*([a-z])/gi,
      (m, expr, v) => `\\int ${parseInner(expr)} \\, d${v}`],
    [/\bdouble integral\s+of\s+(.+)/gi,
      (m, expr) => `\\iint ${parseInner(expr)}`],
    [/\btriple integral\s+of\s+(.+)/gi,
      (m, expr) => `\\iiint ${parseInner(expr)}`],

    // === Calculus: Limits ===
    [/\blimit\s+as\s+([a-z])\s+(?:approaches|goes to|tends to|to)\s+(\S+)\s+of\s+(.+)/gi,
      (m, v, val, expr) => `\\lim_{${v} \\to ${wrap(val)}} ${parseInner(expr)}`],
    [/\blimit\s+of\s+(.+?)\s+as\s+([a-z])\s+(?:approaches|goes to|tends to|to)\s+(\S+)/gi,
      (m, expr, v, val) => `\\lim_{${v} \\to ${wrap(val)}} ${parseInner(expr)}`],

    // === Calculus: Derivatives ===
    [/\bderivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([a-z])/gi,
      (m, expr, v) => `\\frac{d}{d${v}} ${parseInner(expr)}`],
    [/\bsecond derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([a-z])/gi,
      (m, expr, v) => `\\frac{d^2}{d${v}^2} ${parseInner(expr)}`],
    [/\bpartial derivative\s+of\s+(.+?)\s+with\s+respect\s+to\s+([a-z])/gi,
      (m, expr, v) => `\\frac{\\partial}{\\partial ${v}} ${parseInner(expr)}`],
    [/\bd\s*([a-z])\s*\/\s*d\s*([a-z])/gi,
      (m, a, b) => `\\frac{d${a}}{d${b}}`],

    // === Sums & Products ===
    [/\bsum\s+(?:of\s+)?(.+?)\s+from\s+([a-z])\s*=\s*(\S+)\s+to\s+(\S+)/gi,
      (m, expr, v, a, b) => `\\sum_{${v}=${wrap(a)}}^{${wrap(b)}} ${parseInner(expr)}`],
    [/\bsummation\s+(?:of\s+)?(.+?)\s+from\s+([a-z])\s*=\s*(\S+)\s+to\s+(\S+)/gi,
      (m, expr, v, a, b) => `\\sum_{${v}=${wrap(a)}}^{${wrap(b)}} ${parseInner(expr)}`],
    [/\bproduct\s+(?:of\s+)?(.+?)\s+from\s+([a-z])\s*=\s*(\S+)\s+to\s+(\S+)/gi,
      (m, expr, v, a, b) => `\\prod_{${v}=${wrap(a)}}^{${wrap(b)}} ${parseInner(expr)}`],
    [/\bsum\s+of\s+(.+)/gi, (m, expr) => `\\sum ${parseInner(expr)}`],

    // === Fractions ===
    [/\b(\S+)\s+(?:over|divided by|upon)\s+(\S+)/gi,
      (m, a, b) => `\\frac{${wrap(a)}}{${wrap(b)}}`],
    [/\bfraction\s+(\S+)\s+(?:over|by)\s+(\S+)/gi,
      (m, a, b) => `\\frac{${wrap(a)}}{${wrap(b)}}`],

    // === Roots ===
    [/\b(?:cube|cubic)\s+root\s+(?:of\s+)?(.+)/gi,
      (m, expr) => `\\sqrt[3]{${parseInner(expr)}}`],
    [/\b(?:fourth|4th)\s+root\s+(?:of\s+)?(.+)/gi,
      (m, expr) => `\\sqrt[4]{${parseInner(expr)}}`],
    [/\b(?:nth|n-th)\s+root\s+(?:of\s+)?(.+)/gi,
      (m, expr) => `\\sqrt[n]{${parseInner(expr)}}`],
    [/\bsquare\s+root\s+(?:of\s+)?(.+)/gi,
      (m, expr) => `\\sqrt{${parseInner(expr)}}`],
    [/\bsqrt\s+(?:of\s+)?(.+)/gi,
      (m, expr) => `\\sqrt{${parseInner(expr)}}`],

    // === Powers / Exponents ===
    [/\b([a-z0-9]+)\s+(?:to the power of|to the power|raised to|power)\s+(\S+)/gi,
      (m, base, exp) => `${base}^{${wrap(exp)}}`],
    [/\b([a-z0-9]+)\s+squared/gi, (m, base) => `${base}^{2}`],
    [/\b([a-z0-9]+)\s+cubed/gi, (m, base) => `${base}^{3}`],
    [/\b([a-z0-9]+)\s+(?:to the|superscript)\s+(\S+)/gi,
      (m, base, exp) => `${base}^{${wrap(exp)}}`],

    // === Subscripts ===
    [/\b([a-z])\s+(?:sub|subscript)\s+(\S+)/gi,
      (m, base, sub) => `${base}_{${wrap(sub)}}`],

    // === Trig & Functions ===
    [/\b(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh)\s+(?:of\s+)?(\S+)/gi,
      (m, fn, arg) => `\\${fn}(${wrap(arg)})`],
    [/\b(?:log|logarithm)\s+base\s+(\S+)\s+(?:of\s+)?(\S+)/gi,
      (m, base, arg) => `\\log_{${wrap(base)}}(${wrap(arg)})`],
    [/\b(?:natural log|ln)\s+(?:of\s+)?(\S+)/gi,
      (m, arg) => `\\ln(${wrap(arg)})`],
    [/\blog\s+(?:of\s+)?(\S+)/gi,
      (m, arg) => `\\log(${wrap(arg)})`],

    // === Special Symbols ===
    [/\binfinity\b/gi, '\\infty'],
    [/\bplus or minus\b/gi, '\\pm'],
    [/\bminus or plus\b/gi, '\\mp'],
    [/\bnot equal(?:\s+to)?\b/gi, '\\neq'],
    [/\bless than or equal(?:\s+to)?\b/gi, '\\leq'],
    [/\bgreater than or equal(?:\s+to)?\b/gi, '\\geq'],
    [/\bless than\b/gi, '<'],
    [/\bgreater than\b/gi, '>'],
    [/\bapproximately equal(?:\s+to)?\b/gi, '\\approx'],
    [/\bproportional to\b/gi, '\\propto'],
    [/\btherefore\b/gi, '\\therefore'],
    [/\bbecause\b/gi, '\\because'],
    [/\bdegrees?\b/gi, '^{\\circ}'],

    // === Operators ===
    [/\bplus\b/gi, '+'],
    [/\bminus\b/gi, '-'],
    [/\btimes\b/gi, '\\times'],
    [/\bmultiplied by\b/gi, '\\times'],
    [/\bdivided by\b/gi, '\\div'],
    [/\bequals?\b/gi, '='],
    [/\bdot\b/gi, '\\cdot'],
    [/\bcross\b/gi, '\\times'],

    // === Matrices ===
    [/\bmatrix\s+(.+)/gi,
      (m, content) => {
        const rows = content.split(/;\s*/);
        const matContent = rows.map(r => r.trim().split(/[,\s]+/).join(' & ')).join(' \\\\ ');
        return `\\begin{pmatrix} ${matContent} \\end{pmatrix}`;
      }],

    // === Absolute value / brackets ===
    [/\babsolute value of\s+(.+)/gi, (m, expr) => `|${parseInner(expr)}|`],
    [/\bopen (?:parenthesis|paren|bracket)\b/gi, '('],
    [/\bclose (?:parenthesis|paren|bracket)\b/gi, ')'],
    [/\bopen curly\b/gi, '\\{'],
    [/\bclose curly\b/gi, '\\}'],

    // === Sets ===
    [/\bunion\b/gi, '\\cup'],
    [/\bintersection\b/gi, '\\cap'],
    [/\bsubset\b/gi, '\\subset'],
    [/\bsuperset\b/gi, '\\supset'],
    [/\belement of\b/gi, '\\in'],
    [/\bnot element of\b/gi, '\\notin'],
    [/\bempty set\b/gi, '\\emptyset'],
    [/\bfor all\b/gi, '\\forall'],
    [/\bthere exists\b/gi, '\\exists'],

    // === Arrows ===
    [/\bimplies\b/gi, '\\Rightarrow'],
    [/\bif and only if\b/gi, '\\Leftrightarrow'],
    [/\bright arrow\b/gi, '\\rightarrow'],
    [/\bleft arrow\b/gi, '\\leftarrow'],
    [/\bmaps to\b/gi, '\\mapsto'],
  ];

  function wrap(val) {
    if (!val) return '';
    // Replace number words
    const lower = val.toLowerCase();
    if (NUMBERS[lower]) return NUMBERS[lower];
    // Replace greek
    if (GREEK[lower]) return GREEK[lower];
    return val;
  }

  function parseInner(text) {
    if (!text) return '';
    return parse(text.trim());
  }

  function parse(input) {
    if (!input || !input.trim()) return '';
    let text = input.trim().toLowerCase();

    // Replace number words with digits
    for (const [word, digit] of Object.entries(NUMBERS)) {
      text = text.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }

    // Replace Greek letter names
    for (const [name, latex] of Object.entries(GREEK)) {
      text = text.replace(new RegExp(`\\b${name}\\b`, 'gi'), latex);
    }

    // Apply each rule in order
    for (const [pattern, replacement] of RULES) {
      if (typeof replacement === 'function') {
        text = text.replace(pattern, replacement);
      } else {
        text = text.replace(pattern, replacement);
      }
    }

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  return { parse, GREEK, NUMBERS };
})();

// Export for use
if (typeof window !== 'undefined') {
  window.MathParser = MathParser;
}
