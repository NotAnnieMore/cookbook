function numberTokens(value: string) {
  return new Set(
    (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map((token) => {
      const normalized = token.replace(",", ".").replace(/^0+(?=\d)/, "");
      return normalized.replace(/\.0+$/, "");
    }),
  );
}

export function hasOnlyGroundedNumbers(source: string, candidate: string) {
  const sourceNumbers = numberTokens(source);
  return [...numberTokens(candidate)].every((number) => sourceNumbers.has(number));
}
