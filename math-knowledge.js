/**
 * DigiMath — Local Mathematical Knowledge Directory
 * A collection of standard solutions, identities, and patterns.
 * This is checked before calling external APIs to save cost and increase speed.
 */

const MATH_DIRECTORY = [
  {
    pattern: /quadratic formula|solve x\^2/i,
    solution: "The quadratic formula for $ax^2 + bx + c = 0$ is:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
  },
  {
    pattern: /derivative of sin|d\/dx sin/i,
    solution: "$$\\frac{d}{dx}(\\sin x) = \\cos x$$"
  },
  {
    pattern: /derivative of cos|d\/dx cos/i,
    solution: "$$\\frac{d}{dx}(\\cos x) = -\\sin x$$"
  },
  {
    pattern: /integral of 1\/x|integrate 1\/x/i,
    solution: "$$\\int \\frac{1}{x} dx = \\ln|x| + C$$"
  },
  {
    pattern: /pythagorean theorem|a\^2 \+ b\^2/i,
    solution: "The Pythagorean theorem states:\n$$a^2 + b^2 = c^2$$\nwhere $c$ is the hypotenuse."
  },
  {
    pattern: /euler's identity|e\^i pi/i,
    solution: "Euler's Identity is considered the most beautiful formula in math:\n$$e^{i\\pi} + 1 = 0$$"
  },
  {
    pattern: /area of circle|pi r\^2/i,
    solution: "The area of a circle with radius $r$ is:\n$$A = \\pi r^2$$"
  },
  {
    pattern: /integral of e\^x|integrate e\^x/i,
    solution: "$$\\int e^x dx = e^x + C$$"
  }
];

/**
 * Searches the local directory for a matching solution.
 * @param {string} query 
 * @returns {string|null}
 */
function findLocalSolution(query) {
  if (!query) return null;
  const match = MATH_DIRECTORY.find(item => item.pattern.test(query));
  return match ? match.solution : null;
}

window.MathDirectory = {
  find: findLocalSolution,
  data: MATH_DIRECTORY
};
