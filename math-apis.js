/**
 * DigiMath — Local Math Engine
 * Uses math.js for symbolic and numeric math (NO API REQUIRED)
 */

const MathAPIs = (() => {

  /**
   * Local Math Solver using math.js
   */
  async function solveLocal(operation, expression) {
    if (!window.math) {
      throw new Error('Math.js library not loaded');
    }
    
    try {
      let result;
      switch (operation) {
        case 'simplify':
          result = math.simplify(expression).toString();
          break;
        case 'factor':
          // math.js doesn't have a direct 'factor' for all expressions like Newton, 
          // but we can use simplify or custom logic. For now, simplify.
          result = math.simplify(expression).toString();
          break;
        case 'derive':
          result = math.derivative(expression, 'x').toString();
          break;
        case 'evaluate':
          result = math.evaluate(expression).toString();
          break;
        case 'abs':
          result = math.abs(math.evaluate(expression)).toString();
          break;
        default:
          result = math.evaluate(expression).toString();
      }
      
      return {
        operation,
        expression,
        result: result
      };
    } catch (err) {
      console.error('Math.js Error:', err);
      throw new Error('Could not solve: ' + err.message);
    }
  }

  async function simplify(expr) { return solveLocal('simplify', expr); }
  async function factor(expr) { return solveLocal('factor', expr); }
  async function derive(expr) { return solveLocal('derive', expr); }
  async function evaluate(expr) { return solveLocal('evaluate', expr); }
  async function absolute(expr) { return solveLocal('abs', expr); }

  /**
   * Numbers API — Fun math facts (Keeping this as it's a simple GET, 
   * but we can add a local facts directory too)
   */
  async function numberFact(number, type = 'math') {
    try {
      const res = await fetch(`http://numbersapi.com/${number}/${type}?json`);
      if (!res.ok) return { text: "Numbers are fascinating!" };
      return res.json();
    } catch (e) {
      return { text: "A very interesting number indeed." };
    }
  }

  return {
    simplify, factor, derive, evaluate, absolute,
    numberFact, solveLocal
  };
})();

window.MathAPIs = MathAPIs;
