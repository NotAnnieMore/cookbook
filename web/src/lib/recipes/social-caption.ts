export function prepareSocialRecipeCaption(caption: string) {
  return caption
    .replace(/\r\n?/g, "\n")
    .replace(/^([^\n]{4,90}?(?:✨️?|🤎|❤️|😋|🍰|🍴))\s+(?=\p{Lu})/u, "$1\n")
    .replace(/\s*\*{0,2}(ingredients?|ingredientes?)\s*:\s*\*{0,2}\s*/gi, "\nIngredients\n")
    .replace(/\s*\*{0,2}(instructions?|directions?|prepara(?:ç|c)[aã]o)\s*:\s*\*{0,2}\s*/gi, "\nInstructions\n")
    .replace(/([^\n]) {2,}([\p{Lu}][\p{L} ]{2,40}) {2,}(?=[👉➡➜➤•])/gu, "$1\n$2:\n")
    .replace(/\s*(?:👉|➡️?|➜|➤|•)\s*/g, "\n- ")
    .replace(/[ \t]+\*[ \t]+(?=\S)/g, "\n- ")
    .replace(/[ \t]+(?=\d+[.)][ \t]+)/g, "\n")
    .replace(/(?:\s*#[\p{L}\p{N}_-]+)+\s*$/u, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hashtagsFromCaption(caption: string) {
  return [...new Set([...caption.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((match) => match[1]))].slice(0, 12);
}
