/** Conservative dictionary-based difficulty, independent of game-specific rules. */
export interface Difficulty { replies: number; complete: boolean; matches?: number }
export interface RankProgress { ratings: Record<string,Difficulty>; completed: number; total: number; failed: number }
export function startingVariants(ending: string, dueum: boolean): string[] {
  if (!dueum || !/^[가-힣]$/.test(ending)) return [ending];
  const code = ending.charCodeAt(0) - 0xac00;
  const initial = Math.floor(code / 588), vowel = Math.floor(code % 588 / 28), final = code % 28;
  const variants = new Set([ending]);
  // ㄹ → ㄴ; ㄹ + 야/여/예/요/유/이 → ㅇ; ㄴ + 여/요/유/이 → ㅇ.
  // Including ㄴ variants conservatively avoids overclaiming a terminal word.
  if (initial === 5) {
    variants.add(String.fromCharCode(0xac00 + 2 * 588 + vowel * 28 + final));
    if ([2,6,7,12,17,20].includes(vowel)) variants.add(String.fromCharCode(0xac00 + 11 * 588 + vowel * 28 + final));
  }
  if (initial === 2 && [6,12,17,20].includes(vowel)) variants.add(String.fromCharCode(0xac00 + 11 * 588 + vowel * 28 + final));
  return [...variants];
}
