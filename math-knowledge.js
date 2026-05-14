/**
 * DigiMath — Local Mathematical Knowledge Directory
 * A collection of standard solutions, identities, and patterns.
 * This is checked before calling external APIs to save cost and increase speed.
 */

const MATH_DIRECTORY = [
  {
    pattern: /quadratic formula|solve x\^2|ax\^2/i,
    solution: "The quadratic formula for $ax^2 + bx + c = 0$ is:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
  },
  {
    pattern: /derivative of sin|d\/dx sin|sine derivative/i,
    solution: "$$\\frac{d}{dx}(\\sin x) = \\cos x$$"
  },
  {
    pattern: /derivative of cos|d\/dx cos|cosine derivative/i,
    solution: "$$\\frac{d}{dx}(\\cos x) = -\\sin x$$"
  },
  {
    pattern: /integral of 1\/x|integrate 1\/x|ln x integral/i,
    solution: "$$\\int \\frac{1}{x} dx = \\ln|x| + C$$"
  },
  {
    pattern: /pythagorean theorem|a\^2 \+ b\^2|hypotenuse/i,
    solution: "The Pythagorean theorem states:\n$$a^2 + b^2 = c^2$$\nwhere $c$ is the hypotenuse."
  },
  {
    pattern: /euler's identity|e\^i pi|e\^ip/i,
    solution: "Euler's Identity is considered the most beautiful formula in math:\n$$e^{i\\pi} + 1 = 0$$"
  },
  {
    pattern: /area of circle|pi r\^2|circle area/i,
    solution: "The area of a circle with radius $r$ is:\n$$A = \\pi r^2$$"
  },
  {
    pattern: /integral of e\^x|integrate e\^x/i,
    solution: "$$\\int e^x dx = e^x + C$$"
  },
  {
    pattern: /derivative of tan|d\/dx tan|tangent derivative/i,
    solution: "$$\\frac{d}{dx}(\\tan x) = \\sec^2 x$$"
  },
  {
    pattern: /stokes' theorem|stokes theorem/i,
    solution: "Stokes' Theorem relates surface integrals to line integrals:\n$$\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S}$$"
  },
  {
    pattern: /divergence theorem|gauss theorem/i,
    solution: "The Divergence Theorem:\n$$\\iiint_V (\\nabla \\cdot \\mathbf{F}) dV = \\iint_{\\partial V} \\mathbf{F} \\cdot d\\mathbf{S}$$"
  },
  {
    pattern: /taylor series|taylor expansion/i,
    solution: "The Taylor Series of a function $f(x)$ at $a$ is:\n$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n$$"
  },
  {
    pattern: /fourier transform|ft/i,
    solution: "The Continuous Fourier Transform is defined as:\n$$\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx$$"
  },
  {
    pattern: /laplace transform/i,
    solution: "The Laplace Transform is defined as:\n$$\\mathcal{L}\\{f(t)\\} = \\int_{0}^{\\infty} e^{-st} f(t) dt$$"
  },
  {
    pattern: /green's theorem|greens theorem/i,
    solution: "Green's Theorem:\n$$\\oint_C (P dx + Q dy) = \\iint_D \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dA$$"
  },
  {
    pattern: /cauchy-riemann|cr equations/i,
    solution: "Cauchy-Riemann Equations for a complex function $f(z) = u + iv$:\n$$\\frac{\\partial u}{\\partial x} = \\frac{\\partial v}{\\partial y}, \\quad \\frac{\\partial u}{\\partial y} = -\\frac{\\partial v}{\\partial x}$$"
  }
];

/**
 * Searches the local directory for a matching solution.
 * @param {string} query 
 * @returns {string|null}
 */
function findLocalSolution(query) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  const match = MATH_DIRECTORY.find(item => item.pattern.test(normalizedQuery));
  return match ? match.solution : null;
}

window.MathDirectory = {
  find: findLocalSolution,
  data: MATH_DIRECTORY
};
