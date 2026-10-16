import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedPath, teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { toIcs } from '../src/ics.ts'
import { renderLanding, renderTeamPage } from '../src/page.ts'
import { DEFAULT_SITE_URL, canonicalHost, resolveSiteUrl } from '../src/site.ts'

// The site URL once the custom domain exists (README § Domains), and before it.
const canonical = 'https://scarf.fan'
const pages = 'https://topless.github.io/scarf'

const now = new Date('2026-10-02T06:00:00Z')
const [football, basketball] = teams
const game: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Greece',
  away: 'Germany',
  date: '2026-10-04',
  kickoff: '2026-10-04T18:45:00Z',
  utcOffsetHours: 3,
  venue: 'Toumba Stadium',
  city: 'Thessaloniki',
}
const section = { team: football, games: [game] }

test('the canonical host wins, then the Pages address, then the github.io default', () => {
  assert.equal(resolveSiteUrl({ CANONICAL_HOST: 'scarf.fan', SITE_URL: pages }), canonical)
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://example.github.io/scarf' }), 'https://example.github.io/scarf')
  assert.equal(resolveSiteUrl({}), pages)
  assert.equal(DEFAULT_SITE_URL, pages)
})

test('a trailing slash is stripped, and an empty variable counts as unset', () => {
  assert.equal(resolveSiteUrl({ SITE_URL: `${pages}/` }), pages)
  assert.equal(resolveSiteUrl({ CANONICAL_HOST: ' scarf.fan ' }), canonical)
  // GitHub Actions passes a repository variable that is not set as an empty string.
  assert.equal(resolveSiteUrl({ CANONICAL_HOST: '', SITE_URL: '' }), pages)
})

test('CNAME is written only when the canonical host is set, and only a bare host passes', () => {
  assert.equal(canonicalHost({ CANONICAL_HOST: 'scarf.fan' }), 'scarf.fan')
  assert.equal(canonicalHost({}), undefined)
  assert.equal(canonicalHost({ CANONICAL_HOST: '' }), undefined)
  assert.equal(canonicalHost({ SITE_URL: pages }), undefined)
  assert.throws(() => canonicalHost({ CANONICAL_HOST: 'https://scarf.fan' }), /bare host/)
  assert.throws(() => canonicalHost({ CANONICAL_HOST: 'scarf.fan/' }), /bare host/)
})

test('every page names its canonical address, on the given host or the default one', () => {
  assert.match(renderTeamPage(section, teams, now, canonical), /<link rel="canonical" href="https:\/\/scarf\.fan\/greece\/football\/">/)
  assert.match(renderTeamPage(section, teams, now), /<link rel="canonical" href="https:\/\/topless\.github\.io\/scarf\/greece\/football\/">/)
  assert.match(renderLanding([section], now, canonical), /<link rel="canonical" href="https:\/\/scarf\.fan\/">/)
  assert.match(renderLanding([section], now), /<link rel="canonical" href="https:\/\/topless\.github\.io\/scarf\/">/)
})

test('on the canonical host, nothing a fan reads points at github.io', () => {
  const html = renderTeamPage(section, teams, now, canonical)
  assert.doesNotMatch(html, /github\.io/)
  assert.match(html, /href="webcal:\/\/scarf\.fan\/greece\/football\.ics"/)
  assert.match(html, /value="https:\/\/scarf\.fan\/greece\/football\.ics"/)
  assert.doesNotMatch(renderLanding([section], now, canonical), /github\.io/)
})

test('the feed footer and the event link follow the canonical host', () => {
  const ics = toIcs(basketball, [{ ...game, id: 'fiba-2' }], now, canonical).replaceAll(/\r\n[ \t]/g, '')
  assert.match(ics, /Kept up to date by scarf · scarf\.fan\/greece\/basketball/)
  assert.match(ics, /URL;VALUE=URI:https:\/\/scarf\.fan\/greece\/basketball\//)
  assert.doesNotMatch(ics, /github\.io/)
})

test('feed paths are the same on both hosts', () => {
  assert.equal(feedPath(football), 'greece/football.ics')
  assert.equal(feedPath(basketball), 'greece/basketball.ics')
  for (const site of [canonical, pages]) {
    const html = renderTeamPage(section, teams, now, site)
    assert.ok(html.includes(`value="${site}/greece/football.ics"`))
  }
})
