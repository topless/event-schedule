import { fetchText, type Game } from './game.ts'

// Undocumented endpoint behind uefa.com's fixtures pages. One call returns every match of a
// national team: Nations League, qualifiers and friendlies.
const LIMIT = 50

interface UefaMatch {
  id: string
  homeTeam: { internationalName: string }
  awayTeam: { internationalName: string }
  competition: { metaData: { name: string } }
  kickOffTime: { date: string; dateTime?: string; utcOffsetInHours?: number }
  stadium?: {
    translations?: { officialName?: { EN?: string } }
    city?: { translations?: { name?: { EN?: string } } }
  }
}

export async function fetchUefaGames(teamId: number, today: string): Promise<Game[]> {
  const to = `${Number(today.slice(0, 4)) + 2}-12-31`
  const url = `https://match.uefa.com/v5/matches?teamId=${teamId}&fromDate=${today}&toDate=${to}&limit=${LIMIT}&offset=0&order=ASC`
  const matches = JSON.parse(await fetchText(url)) as UefaMatch[]
  if (matches.length === LIMIT) throw new Error(`UEFA returned ${LIMIT} matches; paging is needed`)
  return parseUefaMatches(matches)
}

export function parseUefaMatches(matches: UefaMatch[]): Game[] {
  return matches.map((m) => {
    const game: Game = {
      id: `uefa-${m.id}`,
      competition: m.competition.metaData.name,
      home: m.homeTeam.internationalName,
      away: m.awayTeam.internationalName,
      date: m.kickOffTime.date,
      kickoff: m.kickOffTime.dateTime,
      utcOffsetHours: m.kickOffTime.utcOffsetInHours,
      venue: m.stadium?.translations?.officialName?.EN,
      city: m.stadium?.city?.translations?.name?.EN,
    }
    if (!m.id || !game.competition || !game.home || !game.away || !/^\d{4}-\d{2}-\d{2}$/.test(game.date)) {
      throw new Error(`UEFA match format changed: ${JSON.stringify(game)}`)
    }
    return game
  })
}
