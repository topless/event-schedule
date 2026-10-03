import { mkdir, writeFile } from 'node:fs/promises'
import { siteName, teams, type Team } from './config.ts'
import { fetchFibaGames } from './fiba.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { manual } from './manual.ts'
import { renderPage, type Section } from './page.ts'
import { fetchUefaGames } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed per team plus the web page.
// Any failure aborts the whole build, so the previously published files stay in place.

const now = new Date()
const today = now.toISOString().slice(0, 10)
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

function fetchGames(team: Team): Promise<Game[]> {
  const { source } = team
  return source.kind === 'uefa'
    ? fetchUefaGames(source.teamId, today)
    : fetchFibaGames(source.event, source.teamCode)
}

await mkdir('dist', { recursive: true })
const sections: Section[] = []
for (const team of teams) {
  const games = (await fetchGames(team))
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  await writeFile(`dist/${team.slug}.ics`, toIcs(team.name, games, now))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games`)
}
await writeFile('dist/index.html', renderPage(siteName, sections, now, siteUrl))
