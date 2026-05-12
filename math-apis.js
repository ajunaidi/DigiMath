/**
 * DigiMath — Free Math APIs Integration
 * Newton API (free, no key) + Numbers API (free, no key)
 */

const MathAPIs = (() => {

  const NEWTON_BASE = 'https://newton.vercel.app/api/v2';

  /**
   * Newton API — Symbolic Math (FREE, no key)
   * Operations: simplify, factor, derive, integrate, zeroes, evaluate,
   *             tangent, area, cos, sin, tan, log, abs
   */
  async function newton(operation, expression) {
    const encoded = encodeURIComponent(expression);
    const res = await fetch(`${NEWTON_BASE}/${operation}/${encoded}`);
    if (!res.ok) throw new Error('Newton API request failed');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function simplify(expr) { return newton('simplify', expr); }
  async function factor(expr) { return newton('factor', expr); }
  async function derive(expr) { return newton('derive', expr); }
  async function integrate(expr) { return newton('integrate', expr); }
  async function findZeros(expr) { return newton('zeroes', expr); }
  async function evaluate(expr) { return newton('evaluate', expr); }
  async function tangent(expr) { return newton('tangent', expr); }
  async function area(expr) { return newton('area', expr); }
  async function cosine(expr) { return newton('cos', expr); }
  async function sine(expr) { return newton('sin', expr); }
  async function logarithm(expr) { return newton('log', expr); }
  async function absolute(expr) { return newton('abs', expr); }

  /**
   * Numbers API — Fun math facts (FREE, no key)
   */
  async function numberFact(number, type = 'math') {
    const res = await fetch(`http://numbersapi.com/${number}/${type}?json`);
    if (!res.ok) throw new Error('Numbers API failed');
    return res.json();
  }

  return {
    newton, simplify, factor, derive, integrate, findZeros,
    evaluate, tangent, area, cosine, sine, logarithm, absolute,
    numberFact
  };
})();

window.MathAPIs = MathAPIs;
