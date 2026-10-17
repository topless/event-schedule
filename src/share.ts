import { readFile } from 'node:fs/promises'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import satori from 'satori'
import { html } from 'satori-html'
import { shareSize, siteName, type Team } from './config.ts'
import type { Game } from './game.ts'
import { federation, kickoffText, shortDate, teamKind } from './page.ts'

// The 1200×630 share image behind a team page's og:image, ported from reference/share-card.html.
// The card is HTML with inline styles, laid out by Satori (a flexbox subset, no browser) into an
// SVG that resvg rasterises. Fonts are the static instances in fonts/, so the render needs nothing
// from the network and behaves the same on every machine.

const { width: WIDTH, height: HEIGHT } = shareSize
export const SHARE_MAX_BYTES = 300 * 1024

// The team page's address without the scheme, as printed in the card's footer. The default host
// is the GitHub Pages one until the custom domain exists (see HANDOVER.md).
const DEFAULT_HOST = 'topless.github.io/scarf'

const WOOL = '#FBF8F2'
const INK = '#17171C'
const RED = '#D7263D'
const STAND = '#6B675F'
const DISPLAY = "'Bricolage Grotesque', sans-serif"

// The card for a team and its next game as a PNG, the flag read from the team's asset.
export async function renderShareImage(team: Team, next: Game | undefined, siteUrl?: string): Promise<Buffer> {
  const flag = team.flag ? await readFile(new URL(`../assets/${team.flag}`, import.meta.url), 'utf8') : undefined
  return renderSharePng(renderShareCard(team, next, siteUrl, flag))
}

// The card as HTML in the subset Satori lays out: every box is a flex box, styles are inline,
// and the three SVGs (brand mark, flag, team mark) are embedded as images.
export function renderShareCard(team: Team, next: Game | undefined, siteUrl?: string, flagSvg?: string): string {
  const host = (siteUrl ?? DEFAULT_HOST).replace(/^https?:\/\//, '').replace(/\/$/, '')
  const [band, ...stripes] = team.colours
  return `<div style="display: flex; flex-direction: column; width: ${WIDTH}px; height: ${HEIGHT}px; background: ${WOOL}; color: ${INK}; font-family: 'Albert Sans', sans-serif">
  <div style="height: 28px; background: ${stripeBand(team.colours)}; border-bottom: 2.5px solid ${INK}"></div>
  <div style="flex: 1; display: flex; gap: 40px; padding: 48px 64px 40px">
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 24px">
      <div style="display: flex; align-items: center; gap: 12px">
        ${image(brandMark(), 48, 48)}
        <span style="font-family: ${DISPLAY}; font-weight: 800; font-size: 40px; line-height: 1; letter-spacing: -0.045em">${siteName}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px">
        <div style="display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 600; color: ${STAND}">
          ${flagSvg ? image(flagSvg, 30, 20) : ''}
          <span>${esc(teamKind(team))}</span>
        </div>
        <div style="font-family: ${DISPLAY}; font-weight: 800; font-size: 84px; line-height: 0.92; letter-spacing: -0.045em; max-width: 720px">${esc(team.name)}, in your calendar.</div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px; font-size: 22px; font-weight: 600">
        <span style="display: flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 999px; background: ${RED}; color: #FFFFFF; font-size: 15px; font-weight: 700; letter-spacing: 0.04em">NEXT</span>
        <span>${esc(nextGameLine(next))}</span>
      </div>
    </div>
    <div style="width: 340px; display: flex; align-items: center; justify-content: center">
      ${image(teamMark(band, stripes), 340, 340)}
    </div>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 64px 28px; font-size: 17px; color: ${STAND}">
    <span>${esc(`${host}/${team.country}/${team.sport}`)}</span>
    <span>Free · updated daily from ${federation(team)}</span>
  </div>
</div>`
}

// "Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam", or "… · time not announced".
export function nextGameLine(game?: Game): string {
  if (!game) return 'No games announced yet · subscribe and they find you'
  return `${game.home} vs ${game.away} · ${kickoffText(game, shortDate)}`
}

// Rasterises a card into a PNG and refuses one over the size limit, so an oversized image fails
// the build instead of being deployed (the same policy as a failed fetch).
export async function renderSharePng(card: string): Promise<Buffer> {
  const svg = await satori(html(card), { width: WIDTH, height: HEIGHT, fonts: await fonts() })
  await wasm()
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
  if (png.byteLength > SHARE_MAX_BYTES) {
    throw new Error(`share image is ${png.byteLength} bytes, over the ${SHARE_MAX_BYTES} limit`)
  }
  return Buffer.from(png)
}

// Hard-stop stripes, 40 px per colour as in the reference card (the page uses 18 and 24).
function stripeBand(colours: string[]): string {
  return `repeating-linear-gradient(90deg, ${colours.map((c, i) => `${c} ${i * 40}px ${(i + 1) * 40}px`).join(', ')})`
}

// The brand mark, as in assets/scarf-mark.svg.
function brandMark(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><g transform="rotate(-14 32 32)"><rect x="8" y="22" width="48" height="20" rx="7" fill="${RED}"/><rect x="17" y="22" width="7" height="20" fill="${WOOL}"/><rect x="29" y="22" width="7" height="20" fill="${WOOL}"/><rect x="41" y="22" width="7" height="20" fill="${WOOL}"/><rect x="8" y="22" width="48" height="20" rx="7" stroke="${INK}" stroke-width="3"/><path d="M8 27H2M8 32H2M8 37H2M56 27h6M56 32h6M56 37h6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g></svg>`
}

// The large mark on the right of the card in the team's colours: the band in the first colour,
// the knitted stripes cycling through the rest.
function teamMark(band: string, stripes: string[]): string {
  const stripe = (x: number, width: number, i: number) =>
    `<rect x="${x}" y="22" width="${width}" height="20" fill="${stripes[i % stripes.length]}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><g transform="rotate(-24 32 32)"><rect x="4" y="22" width="56" height="20" rx="7" fill="${band}"/>${stripe(13, 7, 0)}${stripe(25, 7, 1)}${stripe(37, 7, 2)}${stripe(49, 5, 3)}<rect x="4" y="22" width="56" height="20" rx="7" stroke="${INK}" stroke-width="2"/><path d="M4 27H0M4 32H0M4 37H0M60 27h4M60 32h4M60 37h4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g></svg>`
}

function image(svg: string, width: number, height: number): string {
  return `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${width}" height="${height}">`
}

function esc(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

// Static instances of the brand faces (docs/brand.md), read once; Satori reads TrueType, not the
// variable fonts Google Fonts serves to browsers.
const FONT_FILES = [
  { name: 'Bricolage Grotesque', weight: 800, file: 'BricolageGrotesque-ExtraBold.ttf' },
  { name: 'Albert Sans', weight: 400, file: 'AlbertSans-Regular.ttf' },
  { name: 'Albert Sans', weight: 600, file: 'AlbertSans-SemiBold.ttf' },
  { name: 'Albert Sans', weight: 700, file: 'AlbertSans-Bold.ttf' },
] as const

type Font = { name: string; weight: 400 | 600 | 700 | 800; style: 'normal'; data: ArrayBuffer }
let loadedFonts: Promise<Font[]> | undefined
function fonts(): Promise<Font[]> {
  loadedFonts ??= Promise.all(
    FONT_FILES.map(async ({ name, weight, file }) => {
      const data = await readFile(new URL(`../fonts/${file}`, import.meta.url))
      return { name, weight, style: 'normal' as const, data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }
    }),
  )
  return loadedFonts
}

let wasmReady: Promise<void> | undefined
function wasm(): Promise<void> {
  wasmReady ??= readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'))).then(initWasm)
  return wasmReady
}
