import ical from 'ical-generator'
import type { Game } from './game.ts'

const GAME_HOURS = 2

export function toIcs(calendarName: string, games: Game[], now: Date): string {
  const calendar = ical({ name: calendarName, ttl: 12 * 60 * 60 })
  for (const game of games) {
    const title = `${game.home} v ${game.away}`
    const details = {
      id: `${game.id}@event-schedule`,
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
      calendar.createEvent({ ...details, summary: title, start, end })
    } else {
      // All-day placeholder until the time is announced; the same UID later becomes a timed event.
      calendar.createEvent({ ...details, summary: `${title} (time TBC)`, start: new Date(game.date), allDay: true })
    }
  }
  return calendar.toString()
}
