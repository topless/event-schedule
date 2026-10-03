import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseFibaGames } from '../src/fiba.ts'
import { parseUefaMatches } from '../src/uefa.ts'

// Both fixtures are cut down from real responses fetched on 2026-10-02.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

test('UEFA matches become games with kickoff and venue', () => {
  const games = parseUefaMatches(JSON.parse(fixture('uefa-matches.json')))
  assert.equal(games.length, 3)
  assert.deepEqual(games[1], {
    id: 'uefa-2047926',
    competition: 'UEFA Nations League',
    home: 'Greece',
    away: 'Germany',
    date: '2026-10-04',
    kickoff: '2026-10-04T18:45:00Z',
    utcOffsetHours: 3,
    venue: 'Toumba Stadium',
    city: 'Thessaloniki',
  })
})

test('a changed UEFA format fails loudly', () => {
  const [match] = JSON.parse(fixture('uefa-matches.json'))
  assert.throws(() => parseUefaMatches([{ ...match, kickOffTime: {} }]), /format changed/)
})

test('FIBA page yields only the requested team, with time and venue once announced', () => {
  const games = parseFibaGames(fixture('fiba-games.html'), 'GRE')
  assert.deepEqual(
    games.map((g) => g.id),
    ['fiba-127101', 'fiba-127114', 'fiba-127107'],
  )
  assert.deepEqual(games[0], {
    id: 'fiba-127101',
    competition: 'FIBA Basketball World Cup 2027 European Qualifiers',
    home: 'Greece',
    away: 'Spain',
    date: '2026-08-31',
    kickoff: '2026-08-31T16:00:00Z',
    utcOffsetHours: 3,
    venue: 'Telekom Center Athens',
    city: 'Athens',
  })
})

test('FIBA game without an announced time has no kickoff or venue', () => {
  const game = parseFibaGames(fixture('fiba-games.html'), 'GRE')[1]
  assert.equal(game.date, '2026-11-26')
  assert.equal(game.kickoff, undefined)
  assert.equal(game.venue, undefined)
})

test('a FIBA page without games for the team fails loudly instead of emptying the calendar', () => {
  assert.throws(() => parseFibaGames('<html><body>Just a moment...</body></html>', 'GRE'), /format changed/)
  assert.throws(() => parseFibaGames(fixture('fiba-games.html'), 'GRC'), /no games found for GRC/)
})
