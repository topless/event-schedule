import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import { withDetails, type Game } from '../src/game.ts'
import { toIcs } from '../src/ics.ts'
import { renderPage } from '../src/page.ts'

const now = new Date('2026-10-02T06:00:00Z')

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

test('calendar has a timed event in UTC and an all-day placeholder while the time is unknown', () => {
  const lines = toIcs('Greece', [timed, unscheduled], now).split('\r\n')
  assert.ok(lines.includes('UID:uefa-1@event-schedule'))
  assert.ok(lines.includes('DTSTART:20261004T184500Z'))
  assert.ok(lines.includes('DTEND:20261004T204500Z'))
  assert.ok(lines.includes('SUMMARY:Greece v Germany'))
  assert.ok(lines.includes('LOCATION:Toumba Stadium\\, Thessaloniki'))
  assert.ok(lines.includes('TRIGGER:-PT1H'))
  assert.ok(lines.includes('UID:fiba-2@event-schedule'))
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20261126'))
  assert.ok(lines.includes('SUMMARY:Greece v Georgia (time TBC)'))
  assert.equal(lines.filter((l) => l === 'BEGIN:VALARM').length, 1)
})

test('page shows venue-local time, escapes text and links the calendars', () => {
  const html = renderPage('Schedule', [{ team: teams[0], games: [timed, unscheduled] }], now, 'https://example.github.io/schedule')
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-kickoff>Sun,? 4 Oct 2026, 21:45 local time<\/time>/)
  assert.match(html, /Thu,? 26 Nov 2026, time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /href="https:\/\/tickets\.example\/a\?b=1&amp;c=2"/)
  assert.match(html, /href="webcal:\/\/example\.github\.io\/schedule\/greece-football\.ics"/)
})

test('page says so when a team has no upcoming games', () => {
  const html = renderPage('Schedule', [{ team: teams[0], games: [] }], now)
  assert.match(html, /No games announced yet/)
  assert.doesNotMatch(html, /webcal:/)
})
