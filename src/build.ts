import { cp, mkdir, writeFile } from 'node:fs/promises'
import { feedPath, teams, type Team } from './config.ts'
import { fetchFibaGames } from './fiba.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { manual } from './manual.ts'
import { renderLanding, renderTeamPage, type Section } from './page.ts'
import { fetchUefaGames } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed and one page per team, the
// landing page, and the brand assets (stylesheets, icons, flags) next to them.
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

const sections: Section[] = []
for (const team of teams) {
  const games = (await fetchGames(team))
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  await writeFile(`dist/${feedPath(team)}`, toIcs(team, games, now, siteUrl))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games`)
}
for (const section of sections) {
  const { country, sport } = section.team
  await writeFile(`dist/${country}/${sport}/index.html`, renderTeamPage(section, teams, siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections))
await cp('assets', 'dist', { recursive: true })
