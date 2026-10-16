# scarf

Your colours, in your calendar. scarf publishes one subscribable calendar feed per national team:
every game with kickoff, venue, TV channel and ticket link, and a reminder an hour before. Fans
subscribe once, and the calendar they already use keeps itself up to date. Fans, not fanatics.

Teams so far: Greece men's football and basketball. The identity, the exact calendar-event copy and
the backlog come from the design handover: [HANDOVER.md](HANDOVER.md), [docs/brand.md](docs/brand.md),
[docs/calendar-event-spec.md](docs/calendar-event-spec.md), [docs/issues.md](docs/issues.md).

## How it works

The "Build feeds" GitHub Actions job runs `npm run build` once a day. The build:

1. fetches each team's games from the official source (UEFA for football, FIBA for basketball);
2. adds what no source provides (TV channel, ticket link) from [src/config.ts](src/config.ts) and [src/manual.ts](src/manual.ts);
3. writes one `dist/{country}/{sport}.ics` per team and `dist/index.html`, which GitHub Pages serves.

If a source cannot be fetched or its format changed, the build fails and the last published files stay online.

## Paths

Subscriptions point at these paths, so they are frozen (see [HANDOVER.md](HANDOVER.md)):

- `/{country}/{sport}.ics`: one feed per team, for example `/greece/football.ics` and `/greece/basketball.ics`.
- `/`: the page listing every team. Team pages at `/{country}/{sport}/` are planned.

Each event's `UID` is the source's id (`uefa-…`, `fiba-…`) and never changes, so an updated game
replaces the old entry instead of duplicating it.

## One-time setup on GitHub

The repository must be public (GitHub Pages on a free plan). In the repository settings, under
Pages, set the source to "GitHub Actions"; the first run fails until that is done.

## Domains

Until the custom domain exists, builds have no `CANONICAL_HOST` and keep working on
`https://topless.github.io/scarf`. That address is printed wherever a fan can see a URL: the subscribe
links and the paste field on each team page, the `<link rel="canonical">` in the head of every page,
and the footer of every calendar event.

The plan is one canonical domain and one secondary domain, with a single source of truth:

- **The canonical domain** is set as the custom domain on GitHub Pages and is the host in every
  printed URL. Once it is set on the repository, GitHub Pages answers the old `github.io` addresses
  with a 301 redirect to the same path on the canonical domain. Subscriptions made on `github.io`
  keep working because the feed paths are identical on both hosts, which is why the paths are frozen.
- **The secondary domain** is forwarded at the registrar with a 301 redirect, path preserved, to the
  canonical domain. Nothing is hosted there, and it is never printed anywhere: not in the feeds, not
  on the pages, not in this README.

To switch it on, once the domain is bought:

1. In the repository settings, under Pages, set the custom domain and let GitHub check the DNS.
2. Add a repository variable `CANONICAL_HOST` holding the bare host, for example `scarf.fan`: no
   scheme, no path. The "Build feeds" workflow passes it to the build, which fails on anything else.
3. Run the workflow from the Actions tab, or wait for the daily run. The build prints every URL from
   the new host and writes the host to `dist/CNAME`. With a GitHub Actions deployment GitHub ignores
   that file and goes by the Pages setting, so the file is a record of the domain, not what enables it.
4. Check a feed address on `github.io` with `curl -I`: it should answer 301 with the canonical URL.

## Running it

Needs Node 22.18 or newer.

```bash
npm install
npm test
npm run build
```

## Maintaining it by hand

- **TV channel and default ticket link** are per team in [src/config.ts](src/config.ts).
- **One game's details** (time, venue, tickets, a note) go in [src/manual.ts](src/manual.ts), keyed by the game id.
  The id is the first part of the event's `UID` in the calendar file, for example `fiba-127107`.
  Time and venue entered by hand are used only until the official source has its own.
- **A new team** is one more entry in [src/config.ts](src/config.ts): country and sport slugs, the stripe
  colours from [docs/brand.md](docs/brand.md), and a UEFA team id for football or a FIBA event and team
  code for basketball. Each new basketball competition needs its own FIBA event.

## Known limits

- The UEFA endpoint and the FIBA page are undocumented and can change without notice. Their terms do not
  allow automated collection, so this stays a small friends-only tool: one request per source per run
  (the daily run, plus one run per push to `main`).
- Calendar apps refresh subscribed feeds on their own schedule; Google Calendar can take a day. On a Mac,
  choose "Every day" for auto-refresh when subscribing; the default is reportedly weekly.
- Subscribing in Google Calendar only works in a computer browser, not in the phone app.
- Each timed game carries a reminder one hour before kickoff. Apple Calendar shows it unless "Remove alarms"
  is on for the subscription; Google Calendar is believed to ignore embedded reminders, but lets you set a
  notification for the whole calendar in its settings. Outlook is unverified.
- GitHub disables scheduled workflows after 60 days without repository activity and sends a warning email
  first. Push any commit or click "Enable workflow" under Actions to resume. The "last run" date on the
  page shows whether the job is still running.
- Games with no announced time appear as all-day entries marked "time not announced".

Background on the data sources: [docs/research-2026-10-02.md](docs/research-2026-10-02.md).
