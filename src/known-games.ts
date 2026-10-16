// Which games the build has already seen, kept in src/known-games.json between runs (the Actions
// job commits it back to main). With it a run can tell a game announced today from one it has
// carried for weeks, which is what the -alerts feed variant needs. Pure functions; the build reads
// and writes the file.

export interface KnownFeed {
  // The day (YYYY-MM-DD, UTC) a build first watched this team. Everything it saw that day had been
  // announced long before, so those games get no alert; only games seen later count as new.
  seeded: string
  games: Record<string, string> // game id → the day (YYYY-MM-DD, UTC) a build first saw it
}

// Keyed by "{country}/{sport}", the frozen path prefix, so a team added later seeds on its own day
// instead of announcing its whole fixture list.
export type KnownGames = Record<string, KnownFeed>

// Today's games folded into what was known. Ids never leave: a game the source drops for a day
// (or that has been played) stays known, so its return cannot read as an announcement.
export function recordSeen(previous: KnownFeed | undefined, ids: string[], today: string): { feed: KnownFeed; fresh: string[] } {
  if (!previous) return { feed: { seeded: today, games: dated(ids, today) }, fresh: [] }
  const fresh = ids.filter((id) => !Object.hasOwn(previous.games, id))
  return { feed: { ...previous, games: { ...previous.games, ...dated(fresh, today) } }, fresh }
}

// Game id → the day it was first seen, for the games that appeared after the team was seeded.
export function announced(feed: KnownFeed): Record<string, string> {
  return Object.fromEntries(Object.entries(feed.games).filter(([, day]) => day > feed.seeded))
}

// Sorted keys and a trailing newline, so the committed file changes only when a game is added.
export function serialize(known: KnownGames): string {
  const sorted = Object.fromEntries(
    Object.keys(known)
      .sort()
      .map((key) => [key, { seeded: known[key].seeded, games: Object.fromEntries(Object.entries(known[key].games).sort(byKey)) }]),
  )
  return JSON.stringify(sorted, null, 2) + '\n'
}

export function parse(text: string): KnownGames {
  return text.trim() ? (JSON.parse(text) as KnownGames) : {}
}

const dated = (ids: string[], day: string): Record<string, string> => Object.fromEntries(ids.map((id) => [id, day]))
const byKey = ([a]: [string, string], [b]: [string, string]): number => (a < b ? -1 : a > b ? 1 : 0)
