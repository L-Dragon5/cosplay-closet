export function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  // ponytail: indexes are in bounds by construction, so `!` over guards.
  for (let i = 1; i <= m; i++) {
    const row = dp[i]!
    const prev = dp[i - 1]!
    for (let j = 1; j <= n; j++) {
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]!
          : 1 + Math.min(prev[j]!, row[j - 1]!, prev[j - 1]!)
    }
  }
  return dp[m]![n]!
}
