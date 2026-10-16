import assert from 'node:assert/strict'
import { test } from 'node:test'
import { siteName, teams } from '../src/config.ts'
import { withDetails, type Game } from '../src/game.ts'
import { toIcs } from '../src/ics.ts'
import { renderPage } from '../src/page.ts'

const now = new Date('2026-10-02T06:00:00Z')
const [football] = teams

const timed: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Greece',
  away: 'Germany',
  date: '2026-10-04',
  kickoff: '2026-10-04T18:45:00Z',
  utcOffsetHours: 3,
  venue: 'Toumba Stadium',
  city: 'Thessaloniki',
  tv: 'Alpha',
  tickets: 'https://tickets.example/a?b=1&c=2',
}
const unscheduled: Game = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }

// Long lines are folded in the file; join them back so a header can be asserted as one line.
const icsLines = (ics: string) => ics.replaceAll(/\r\n[ \t]/g, '').split('\r\n')

test('manual details fill gaps, and the source wins once it has its own values', () => {
  const manual = { kickoff: '2026-11-26T17:00:00Z', venue: 'Manual Arena', tickets: 'https://tickets.example/manual' }
  const defaults = { tv: 'ERT', tickets: 'https://tickets.example/default' }

  const filled = withDetails(unscheduled, defaults, manual)
  assert.equal(filled.kickoff, '2026-11-26T17:00:00Z')
  assert.equal(filled.venue, 'Manual Arena')
  assert.equal(filled.tv, 'ERT')
  assert.equal(filled.tickets, 'https://tickets.example/manual')

  const announced = withDetails({ ...unscheduled, kickoff: '2026-11-26T18:30:00Z', venue: 'Official Arena' }, defaults, manual)
  assert.equal(announced.kickoff, '2026-11-26T18:30:00Z')
  assert.equal(announced.venue, 'Official Arena')
})

test('feed header names the team then the brand, and carries the team colour', () => {
  const lines = icsLines(toIcs(football, [timed], now))
  assert.ok(lines.includes('PRODID:-//scarf//feeds//EN'))
  assert.ok(lines.includes('X-WR-CALNAME:Greece football · scarf'))
  assert.ok(
    lines.includes(
      "X-WR-CALDESC:Every game of the Greece men's national football team — kickoff, venue, TV, tickets. Kept up to date by scarf.",
    ),
  )
  assert.ok(lines.includes('X-APPLE-CALENDAR-COLOR:#0D5EAF'))
  assert.ok(lines.includes('REFRESH-INTERVAL;VALUE=DURATION:PT12H'))
})

test('calendar has a timed event in UTC and an all-day placeholder while the time is unknown', () => {
  const lines = icsLines(toIcs(football, [timed, unscheduled], now))
  assert.ok(lines.includes('UID:uefa-1@scarf'))
  assert.ok(lines.includes('DTSTART:20261004T184500Z'))
  assert.ok(lines.includes('DTEND:20261004T204500Z'))
  assert.ok(lines.includes('SUMMARY:Greece vs Germany'))
  assert.ok(lines.includes('LOCATION:Toumba Stadium\\, Thessaloniki'))
  assert.ok(lines.includes('TRIGGER:-PT1H'))
  assert.ok(lines.includes('UID:fiba-2@scarf'))
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20261126'))
  assert.ok(lines.includes('SUMMARY:Greece vs Georgia (time not announced)'))
  assert.equal(lines.filter((l) => l === 'BEGIN:VALARM').length, 1)
})

test('page shows venue-local time, escapes text and links the calendars at the frozen paths', () => {
  const html = renderPage(siteName, [{ team: football, games: [timed, unscheduled] }], now, 'https://example.github.io/scarf')
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun,? 4 Oct 2026, 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /Thu,? 26 Nov 2026, time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /href="https:\/\/tickets\.example\/a\?b=1&amp;c=2"/)
  assert.match(html, /href="webcal:\/\/example\.github\.io\/scarf\/greece\/football\.ics"/)
  assert.match(html, /<code>https:\/\/example\.github\.io\/scarf\/greece\/football\.ics<\/code>/)
  assert.match(html, /<section id="greece-football">/)
})

test('page says so when a team has no upcoming games', () => {
  const html = renderPage(siteName, [{ team: football, games: [] }], now)
  assert.match(html, /No games announced yet/)
  assert.doesNotMatch(html, /webcal:/)
})

test('nothing a fan reads carries the working title or a TBA', () => {
  const ics = toIcs(football, [timed, unscheduled], now)
  const html = renderPage(siteName, [{ team: football, games: [timed, unscheduled] }], now, 'https://example.github.io/scarf')
  for (const text of [ics, html]) assert.doesNotMatch(text, /event-schedule|Event schedule|\bTBA\b|\bTBC\b/)
  assert.doesNotMatch(ics, /!/)
})
