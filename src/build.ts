import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { alertsFeedPath, feedPath, landingSharePath, sharePath, teams, type Team } from './config.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, parse, recordSeen, serialize } from './known-games.ts'
import { manual } from './manual.ts'
import { renderLanding, renderTeamPage, type Section } from './page.ts'
import { renderLandingShareImage, renderShareImage } from './share.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, and the brand assets (stylesheets, icons,
// flags) next to them.
// Requests stay minimal: UEFA answers for every football team in one call, and a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers). Any failure aborts the whole build, so the previously published files
// stay in place.

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

const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const uefaMatches = uefaTeamIds.length ? await fetchUefaMatches(uefaTeamIds, today) : []
const fibaPages = new Map<string, string>()

async function gamesOf(team: Team): Promise<Game[]> {
  const { source } = team
  if (source.kind === 'uefa') return parseUefaMatches(uefaMatches, source.teamId)
  let page = fibaPages.get(source.event)
  if (page === undefined) {
    if (fibaPages.size > 0) await pause(5000) // a breath between two pages of the same site
    page = await fetchFibaPage(source.event)
    fibaPages.set(source.event, page)
  }
  return parseFibaGames(page, source.teamCode)
}

const sections: Section[] = []
for (const team of teams) {
  const games = (await gamesOf(team))
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
  const { team, games } = section
  await writeFile(`dist/${team.country}/${team.sport}/index.html`, renderTeamPage(section, teams, now, siteUrl))
  await writeFile(`dist/${sharePath(team)}`, await renderShareImage(team, games[0], siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, now, siteUrl))
await writeFile(`dist/${landingSharePath}`, await renderLandingShareImage(teams, siteUrl))
await cp('assets', 'dist', { recursive: true })
// Written only when it changed, so the Actions job has nothing to commit on a quiet day
// (.github/workflows/publish.yml). After a local build, commit or discard the change (README).
const knownAfter = serialize(known)
if (knownAfter !== knownBefore) await writeFile(KNOWN_GAMES, knownAfter)
