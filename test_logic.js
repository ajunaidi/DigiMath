const MATH_DIRECTORY = [
  {
    pattern: /fundamental theorem of calculus|ftc/i,
    solution: "### The Fundamental Theorem of Calculus (FTC)..."
  },
  {
    pattern: /euler's formula|eulers formula/i,
    solution: "### Euler's Formula..."
  }
];

function findLocalSolution(query) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  const match = MATH_DIRECTORY.find(item => item.pattern.test(normalizedQuery));
  return match ? match.solution : null;
}

const testText = `The Fundamental theorem of Calculus.
No matter if you are a mathematician...
F(x) = \int_a^x f(t) dt
F'(x) = f(x)
On a side note: e^ix = cosx + isinx`;

console.log("Testing FTC Match:", findLocalSolution(testText) ? "SUCCESS" : "FAIL");
