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

const INTRO =
  'Upcoming games of the national teams we follow: kickoff, stadium, TV and tickets. ' +
  'Subscribe once and your calendar keeps itself up to date and reminds you an hour before kickoff.'

// siteUrl is the public address of the page; without it (local builds) the subscribe links are left out.
export function renderPage(siteName: string, sections: Section[], now: Date, siteUrl?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(INTRO)}">
<title>${esc(siteName)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 42rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin: 2.5rem 0 0.25rem; }
  .intro, .subscribe { font-size: 0.9rem; }
  .intro { margin-top: 0; opacity: 0.8; }
  .subscribe a { display: inline-block; padding: 0.25rem 0; }
  ul { list-style: none; padding: 0; }
  li { border: 1px solid #8888; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.75rem 0; }
  li p { margin: 0; }
  .when { font-size: 0.9rem; font-weight: 600; }
  .yours { font-weight: 400; opacity: 0.8; white-space: nowrap; }
  .match { font-size: 1.1rem; font-weight: 600; }
  footer { margin-top: 3rem; font-size: 0.9rem; opacity: 0.8; }
</style>
</head>
<body>
<h1>${esc(siteName)}</h1>
<p class="intro">${esc(INTRO)}</p>
${sections.map((s) => renderSection(s, siteUrl)).join('\n')}
<footer>
<p>Updated daily from UEFA and FIBA; last run ${DAY.format(now)}, ${TIME.format(now)} UTC. New games and kickoff times
appear here, and in subscribed calendars, a day or two after they are announced. TV channels are the expected
broadcasters; check again close to the game. In Google Calendar the reminder may not show: set a notification for
the calendar in its settings.</p>
</footer>
<script>
  for (const el of document.querySelectorAll('time[data-offset]')) {
    const kickoff = new Date(el.dateTime)
    if (-kickoff.getTimezoneOffset() / 60 === Number(el.dataset.offset)) continue
    const yours = document.createElement('span')
    yours.className = 'yours'
    yours.textContent = '· ' + kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' your time'
    el.after(' ', yours)
  }
</script>
</body>
</html>
`
}

function renderSection({ team, games }: Section, siteUrl?: string): string {
  const file = `${team.slug}.ics`
  const webcal = `${siteUrl?.replace(/^https?:/, 'webcal:')}/${file}`
  const subscribe = siteUrl
    ? `<a href="${esc(webcal)}">iPhone, Mac or Outlook</a> · ` +
      `<a href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}">Google Calendar (on a computer)</a>, ` +
      `or paste <code>${esc(siteUrl)}/${file}</code> into another calendar app`
    : `<a href="${file}">calendar file</a>`
  return `<section id="${team.slug}">
<h2>${esc(team.name)}</h2>
<p class="subscribe">Subscribe: ${subscribe}</p>
${games.length ? `<ul>\n${games.map(renderGame).join('\n')}\n</ul>` : '<p>No games announced yet.</p>'}
</section>`
}

function renderGame(game: Game): string {
  const place = [game.venue, game.city].filter(Boolean).join(', ') || 'Venue not announced'
  return `<li>
<p class="when">${renderWhen(game)}</p>
<p class="match">${esc(game.home)} vs ${esc(game.away)}</p>
<p>${esc(game.competition)} · ${esc(place)}</p>
${game.tv ? `<p>TV: ${esc(game.tv)}</p>` : ''}
${game.tickets ? `<p><a href="${esc(game.tickets)}">Tickets</a></p>` : ''}
${game.note ? `<p>${esc(game.note)}</p>` : ''}
</li>`
}

// Venue time with the city, so "20:45 in Amsterdam" cannot be mistaken for the reader's own time;
// the script adds the reader's time when their zone differs.
function renderWhen(game: Game): string {
  if (!game.kickoff) return `${DAY.format(new Date(game.date))}, time not announced`
  const kickoff = new Date(game.kickoff)
  if (game.utcOffsetHours === undefined) {
    return `<time datetime="${esc(game.kickoff)}">${DAY.format(kickoff)}, ${TIME.format(kickoff)} UTC</time>`
  }
  const shifted = new Date(kickoff.getTime() + game.utcOffsetHours * 60 * 60 * 1000)
  const where = game.city ? `in ${esc(game.city)}` : 'at the venue'
  return `<time datetime="${esc(game.kickoff)}" data-offset="${game.utcOffsetHours}">${DAY.format(shifted)}, ${TIME.format(shifted)} ${where}</time>`
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
