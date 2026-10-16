import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { alertsFeedPath, feedPath, teams, type Team } from './config.ts'
import { fetchFibaGames } from './fiba.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, parse, recordSeen, serialize } from './known-games.ts'
import { manual } from './manual.ts'
import { renderLanding, renderTeamPage, type Section } from './page.ts'
import { fetchUefaGames } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed and one page per team, the
// landing page, and the brand assets (stylesheets, icons, flags) next to them.
// Any failure aborts the whole build, so the previously published files stay in place.

const now = new Date()
const today = now.toISOString().slice(0, 10)
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

// The games earlier builds saw, so this one can tell a newly announced game from an old one for
// the -alerts feeds. Missing or empty on the very first build, which seeds it and announces nothing.
const KNOWN_GAMES = 'src/known-games.json'
const knownBefore = await readFile(KNOWN_GAMES, 'utf8').catch((error: NodeJS.ErrnoException) => {
  if (error.code === 'ENOENT') return ''
  throw error
})
const known = parse(knownBefore)

function fetchGames(team: Team): Promise<Game[]> {
  const { source } = team
  return source.kind === 'uefa'
    ? fetchUefaGames(source.teamId, today)
    : fetchFibaGames(source.event, source.teamCode)
}

const sections: Section[] = []
for (const team of teams) {
  const games = (await fetchGames(team))
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  const key = `${team.country}/${team.sport}`
  const seen = recordSeen(known[key], games.map((game) => game.id), today)
  known[key] = seen.feed
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  await writeFile(`dist/${feedPath(team)}`, toIcs(team, games, now, siteUrl))
  await writeFile(`dist/${alertsFeedPath(team)}`, toIcs(team, games, now, siteUrl, announced(seen.feed)))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games, ${seen.fresh.length} new`)
}
for (const section of sections) {
  const { country, sport } = section.team
  await writeFile(`dist/${country}/${sport}/index.html`, renderTeamPage(section, teams, now, siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, now))
await cp('assets', 'dist', { recursive: true })
// Written only when it changed, so the Actions job has nothing to commit on a quiet day
// (.github/workflows/publish.yml). After a local build, commit or discard the change (README).
const knownAfter = serialize(known)
if (knownAfter !== knownBefore) await writeFile(KNOWN_GAMES, knownAfter)
