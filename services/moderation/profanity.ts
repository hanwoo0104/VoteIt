const blockedWords = ["바보", "멍청", "꺼져", "죽어", "혐오", "쓰레기"];

export function containsProfanity(text: string) {
  const normalized = text.replace(/\s/g, "").toLowerCase();
  return blockedWords.some((word) => normalized.includes(word));
}

export function sanitizeComment(text: string) {
  return blockedWords.reduce((result, word) => {
    const pattern = new RegExp(word, "gi");
    return result.replace(pattern, "*".repeat(word.length));
  }, text);
}
