import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareSize, teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { nextGameLine, renderShareCard, renderShareImage, SHARE_MAX_BYTES } from '../src/share.ts'

const [football, basketball] = teams
const site = 'https://example.github.io/scarf'

const timed: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Netherlands',
  away: 'Greece',
  date: '2026-11-13',
  kickoff: '2026-11-13T19:45:00Z',
  utcOffsetHours: 1,
  venue: 'Johan Cruijff ArenA',
  city: 'Amsterdam',
}
const unscheduled: Game = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }
const flag = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18"><rect width="27" height="18" fill="#0D5EAF"/></svg>'

const text = (card: string) => card.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('share card names the next game with the venue-local time and its city', () => {
  assert.equal(nextGameLine(timed), 'Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam')
  assert.equal(nextGameLine(unscheduled), 'Greece vs Georgia · Thu 26 Nov · time not announced')
  assert.equal(nextGameLine(undefined), 'No games announced yet · subscribe and they find you')
  assert.match(text(renderShareCard(football, timed, site, flag)), /NEXT Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam/)
})

test('share card carries the headline, the eyebrow, the flag and the team colours', () => {
  const card = renderShareCard(football, timed, site, flag)
  assert.match(text(card), /scarf .*National team · Men's football .*Greece football, in your calendar\./)
  assert.ok(card.includes(`<img src="data:image/svg+xml;base64,${Buffer.from(flag).toString('base64')}" width="30" height="20">`))
  assert.match(card, /repeating-linear-gradient\(90deg, #0D5EAF 0px 40px, #FFFFFF 40px 80px\)/)
  assert.match(card, /width="340" height="340"/)
  assert.doesNotMatch(renderShareCard(football, timed, site), /width="30" height="20"/)
})

test('share card footer prints the team page without the scheme, and the federation of its source', () => {
  const football_ = text(renderShareCard(football, timed, site, flag))
  assert.match(football_, /example\.github\.io\/scarf\/greece\/football Free · updated daily from UEFA/)
  assert.doesNotMatch(football_, /https?:/)
  assert.match(text(renderShareCard(football, timed, `${site}/`, flag)), /example\.github\.io\/scarf\/greece\/football /)
  assert.match(text(renderShareCard(basketball, undefined, site, flag)), /scarf\/greece\/basketball Free · updated daily from FIBA/)
  assert.match(text(renderShareCard(football, timed)), /topless\.github\.io\/scarf\/greece\/football/)
})

test('share card escapes text from the sources', () => {
  const card = renderShareCard(football, { ...timed, away: 'A <b> & "C"' }, site, flag)
  assert.match(card, /Netherlands vs A &lt;b&gt; &amp; &quot;C&quot;/)
})

test('nothing on the share card breaks the voice rules', () => {
  for (const game of [timed, unscheduled, undefined]) {
    const copy = text(renderShareCard(football, game, site, flag))
    assert.doesNotMatch(copy, /!|\bTBA\b|\bTBC\b|don't miss|notification/i)
    assert.doesNotMatch(copy, /\bv\b/)
    assert.doesNotMatch(copy, /\d\d:\d\d(?! in )/)
  }
})

test('share image renders a 1200×630 PNG under the size limit without a browser', async () => {
  const png = await renderShareImage(football, timed, site)
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  // IHDR follows the signature: width and height as big-endian 32-bit integers.
  assert.equal(png.readUInt32BE(16), shareSize.width)
  assert.equal(png.readUInt32BE(20), shareSize.height)
  assert.ok(png.byteLength < SHARE_MAX_BYTES, `${png.byteLength} bytes`)
})
