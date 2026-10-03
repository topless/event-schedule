import type { Team } from './config.ts'
import type { Game } from './game.ts'

export interface Section {
  team: Team
  games: Game[]
}

const DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })

// siteUrl is the public address of the page; without it (local builds) the subscribe links are left out.
export function renderPage(siteName: string, sections: Section[], now: Date, siteUrl?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(siteName)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 42rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.2rem; margin: 2.5rem 0 0.25rem; }
  .subscribe, .when, footer { font-size: 0.9rem; opacity: 0.8; }
  ul { list-style: none; padding: 0; }
  li { border: 1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.75rem 0; }
  li p { margin: 0; }
  .match { font-size: 1.1rem; font-weight: 600; }
  footer { margin-top: 3rem; }
</style>
</head>
<body>
<h1>${esc(siteName)}</h1>
${sections.map((s) => renderSection(s, siteUrl)).join('\n')}
<footer>
<p>Last checked ${DAY.format(now)}, ${TIME.format(now)} UTC. Dates and venues come from UEFA and FIBA.
TV channels are the expected broadcasters; check again close to the game.</p>
</footer>
<script>
  for (const el of document.querySelectorAll('time[data-kickoff]')) {
    const time = new Date(el.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    el.after(' · ' + time + ' your time')
  }
</script>
</body>
</html>
`
}

function renderSection({ team, games }: Section, siteUrl?: string): string {
  const file = `${team.slug}.ics`
  const links = [`<a href="${file}">calendar file</a>`]
  if (siteUrl) {
    const webcal = `${siteUrl.replace(/^https?:/, 'webcal:')}/${file}`
    links.unshift(
      `<a href="${esc(webcal)}">Apple or Outlook</a>`,
      `<a href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}">Google Calendar (on a computer)</a>`,
    )
  }
  return `<section>
<h2>${esc(team.name)}</h2>
<p class="subscribe">Subscribe: ${links.join(' · ')}</p>
${games.length ? `<ul>\n${games.map(renderGame).join('\n')}\n</ul>` : '<p>No games announced yet.</p>'}
</section>`
}

function renderGame(game: Game): string {
  const place = [game.venue, game.city].filter(Boolean).join(', ') || 'Venue not announced'
  return `<li>
<p class="when">${renderWhen(game)}</p>
<p class="match">${esc(game.home)} v ${esc(game.away)}</p>
<p>${esc(game.competition)} · ${esc(place)}</p>
${game.tv ? `<p>TV: ${esc(game.tv)}</p>` : ''}
${game.tickets ? `<p><a href="${esc(game.tickets)}">Tickets</a></p>` : ''}
${game.note ? `<p>${esc(game.note)}</p>` : ''}
</li>`
}

function renderWhen(game: Game): string {
  if (!game.kickoff) return `${DAY.format(new Date(game.date))}, time not announced`
  const kickoff = new Date(game.kickoff)
  const text =
    game.utcOffsetHours === undefined
      ? `${DAY.format(kickoff)}, ${TIME.format(kickoff)} UTC`
      : `${formatAtVenue(kickoff, game.utcOffsetHours)} local time`
  return `<time datetime="${esc(game.kickoff)}" data-kickoff>${text}</time>`
}

function formatAtVenue(kickoff: Date, utcOffsetHours: number): string {
  const shifted = new Date(kickoff.getTime() + utcOffsetHours * 60 * 60 * 1000)
  return `${DAY.format(shifted)}, ${TIME.format(shifted)}`
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
