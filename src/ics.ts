import ical, { ICalAlarmType } from 'ical-generator'
import { siteName, type Team } from './config.ts'
import type { Game } from './game.ts'

const GAME_HOURS = 2
const REMINDER_HOURS = 1

export function toIcs(team: Team, games: Game[], now: Date): string {
  // Header fields follow docs/calendar-event-spec.md: team first, brand last, the team's colour.
  const calendar = ical({
    prodId: { company: siteName, product: 'feeds', language: 'EN' },
    name: `${team.name} · ${siteName}`,
    description: `Every game of the ${team.side} — kickoff, venue, TV, tickets. Kept up to date by ${siteName}.`,
    color: team.colours[0],
    ttl: 12 * 60 * 60,
  })
  for (const game of games) {
    const title = `${game.home} vs ${game.away}`
    const details = {
      // The source id keeps the UID stable, so a changed game replaces the old entry in place.
      id: `${game.id}@${siteName}`,
      stamp: now,
      location: [game.venue, game.city].filter(Boolean).join(', ') || undefined,
      description: [
        game.competition,
        game.tv && `TV: ${game.tv}`,
        game.tickets && `Tickets: ${game.tickets}`,
        game.note,
      ]
        .filter(Boolean)
        .join('\n'),
    }
    if (game.kickoff) {
      const start = new Date(game.kickoff)
      const end = new Date(start.getTime() + GAME_HOURS * 60 * 60 * 1000)
      const event = calendar.createEvent({ ...details, summary: title, start, end })
      // A reminder on the device; Apple honours it, Google is believed to ignore it (see README).
      event.createAlarm({ type: ICalAlarmType.display, trigger: REMINDER_HOURS * 60 * 60 })
    } else {
      // All-day placeholder until the time is announced; the same UID later becomes a timed event.
      calendar.createEvent({ ...details, summary: `${title} (time not announced)`, start: new Date(game.date), allDay: true })
    }
  }
  return calendar.toString()
}
