/** Značka tutoriálu namiesto čísla (v editore mapy). */
export const TUTORIAL_MARK = '✦'

/**
 * Čísla kapitol na mape v danom poradí. Tutoriál sa nečísluje, takže prvá
 * „skutočná“ kapitola je vždy 1.
 */
export function chapterNumbers(
  chapters: { key: string; isTutorial: boolean }[],
): Map<string, string> {
  let next = 1
  return new Map(
    chapters.map(({ key, isTutorial }) => [
      key,
      isTutorial ? TUTORIAL_MARK : String(next++),
    ]),
  )
}
