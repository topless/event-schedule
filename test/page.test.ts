import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { renderLanding, renderTeamPage } from '../src/page.ts'

const now = new Date('2026-10-02T06:00:00Z')
const [football, basketball] = teams
const site = 'https://example.github.io/scarf'

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

const teamPage = (games: Game[], siteUrl?: string) => renderTeamPage({ team: football, games }, teams, now, siteUrl)

test('team page shows venue-local times naming the city, and says when the time is not announced', () => {
  const html = teamPage([timed, unscheduled], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /Thu · time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /Greece vs Germany/)
  assert.match(html, /your time/)
})

test('team page escapes text from the sources', () => {
  const html = teamPage([{ ...timed, away: 'A <b> & "C"' }], site)
  assert.match(html, /Greece vs A &lt;b&gt; &amp; &quot;C&quot;/)
  assert.match(html, /href="https:\/\/tickets\.example\/a\?b=1&amp;c=2"/)
})

test('subscribe links point at the feed the build writes, on the public address', () => {
  const html = teamPage([timed], site)
  const webcal = 'webcal://example.github.io/scarf/greece/football.ics'
  assert.match(html, new RegExp(`<a class="btn-primary" href="${webcal}">Add to my calendar</a>`))
  assert.match(html, new RegExp(`<a class="btn-secondary" href="${webcal}">Apple</a>`))
  assert.ok(html.includes(`href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}">Google</a>`))
  assert.ok(html.includes(`addfromweb?url=${encodeURIComponent(`${site}/greece/football.ics`)}&amp;`))
  assert.match(html, /<input id="feed-url" type="text" readonly value="https:\/\/example\.github\.io\/scarf\/greece\/football\.ics">/)
  assert.match(html, /<button class="btn-secondary" type="button" data-copy="feed-url">Copy<\/button>/)
  assert.match(html, /On Google Calendar, set a notification for this calendar once — it applies to every game\./)
})

test('without a public address the page links the feed relative to /greece/football/', () => {
  const html = teamPage([timed])
  assert.match(html, /<a class="btn-primary" href="\.\.\/football\.ics">/)
  assert.doesNotMatch(html, /webcal:|calendar\.google\.com|outlook|feed-url/)
})

test('team page names the federation of its source, and links every team', () => {
  const football_ = teamPage([timed], site)
  const basketball_ = renderTeamPage({ team: basketball, games: [] }, teams, now, site)
  assert.match(football_, /Updated daily from UEFA\./)
  assert.match(football_, /Updated daily from UEFA · last run Fri 2 Oct 2026, 06:00 UTC/)
  assert.match(basketball_, /Updated daily from FIBA\./)
  assert.match(football_, /<a class="team-chip" href="\.\.\/\.\.\/greece\/football\/" style="[^"]*#0D5EAF[^"]*" aria-current="page">/)
  assert.match(football_, /href="\.\.\/\.\.\/greece\/basketball\/"/)
  assert.match(football_, /<link rel="stylesheet" href="\.\.\/\.\.\/brand-tokens\.css">/)
  assert.match(football_, /<link rel="apple-touch-icon" href="\.\.\/\.\.\/apple-touch-icon\.png">/)
  assert.match(football_, /fonts\.googleapis\.com\/css2\?family=Albert\+Sans[^"]*Bricolage\+Grotesque[^"]*display=swap/)
})

test('team page says so when no games are announced', () => {
  const html = teamPage([], site)
  assert.match(html, /No games announced yet/)
  assert.doesNotMatch(html, /<ul class="rows">/)
})

test('landing lists every team with its stripe and a link to its page', () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], now)
  assert.match(html, /<a class="card" href="greece\/football\/" style="--stripe: repeating-linear-gradient\(90deg, #0D5EAF 0px 18px, #FFFFFF 18px 36px\)/)
  assert.match(html, /<a class="card" href="greece\/basketball\/"/)
  assert.match(html, /Next: Greece vs Germany/)
  assert.match(html, /No games announced yet/)
  assert.match(html, /Updated daily from UEFA and FIBA/)
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/)
})

test('nothing a fan reads breaks the voice rules', () => {
  const pages = [teamPage([timed, unscheduled], site), renderLanding([{ team: football, games: [timed] }], now)]
  for (const html of pages) {
    const text = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
    assert.doesNotMatch(text, /!|event-schedule|Event schedule|\bTBA\b|\bTBC\b|don't miss/i)
    assert.doesNotMatch(text, /\bv\b/)
  }
})
