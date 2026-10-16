#!/usr/bin/env bash
# Creates labels, milestones and the issues from docs/issues.md in topless/scarf.
# Run once, after the repository rename, from a machine where `gh auth status` is green.
# Review docs/issues.md first — this script is the same content, not a second source of truth.
set -euo pipefail

REPO="${REPO:-topless/scarf}"

label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; echo "label  $1"; }
label brand  "D7263D" "Identity, assets, copy and voice"
label feeds  "0D5EAF" "ICS generation and feed behaviour"
label pages  "17171C" "Team pages, landing, share images"
label alerts "F1BF00" "Ticket-sale and new-game alerts"
label data   "6B675F" "Sources, teams, manual data"
label ops    "E6E1D8" "Workflow, hosting, domains"
label later  "FBF8F2" "Parked until the basics ship"

milestone() {
  local title="$1" desc="$2"
  if ! gh api "repos/$REPO/milestones?state=all" --jq '.[].title' | grep -qx "$title"; then
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
  fi
  echo "milestone  $title"
}
milestone "M1 Rename & brand foundations" "Repo rename, tokens, event copy, team pages, share images, domain readiness"
milestone "M2 Alerts" "Tickets on sale, new game announced, placeholder transition"
milestone "M3 Teams & personal feed" "Spain, Denmark, women's and U21, team picker"
milestone "M4 Ops & reach" "Workflow keepalive, where to watch, results, clubs spike"

issue() { # title, milestone, labels(csv), body
  gh issue create --repo "$REPO" --title "$1" --milestone "$2" --label "$3" --body "$4" >/dev/null
  echo "issue  $1"
}

M1="M1 Rename & brand foundations"; M2="M2 Alerts"; M3="M3 Teams & personal feed"; M4="M4 Ops & reach"

issue "Rename repository and terminology to scarf" "$M1" "brand,ops" "$(cat <<'EOF'
**Why.** The brand is decided; nobody but the maintainer is subscribed yet, so paths can still change.

**What.** Follow the rename checklist in HANDOVER.md: repo name, package.json, workflow name, output paths (`/{country}/{sport}.ics`, `/{country}/{sport}/`), ICS header fields, README, copy words ("game" not "event", "reminder" not "notification", "time not announced" not "TBA"). Keep every UID unchanged.

**Acceptance.** `npm test` and `npm run build` pass; `dist/greece/football.ics` and `dist/greece/basketball.ics` exist; no occurrence of "Event schedule", "TBA" or "notification" in `src/`, `dist/` or README; UIDs unchanged for the sample fixtures.
EOF
)"

issue "Brand assets, tokens, favicon and app icon" "$M1" "brand" "$(cat <<'EOF'
Add `docs/brand.md`, `assets/brand-tokens.css`, `assets/scarf-mark.svg`, `assets/scarf-mark-greece.svg`, `assets/flag-gr.svg` from the handover pack. Generate `favicon.svg`, `apple-touch-icon.png` (180 px) and a 512 px icon from the red rounded-square spec. Load Bricolage Grotesque and Albert Sans from Google Fonts with `display=swap`.

**Acceptance.** Pages reference the tokens file; icons present in `dist/`; no missing-icon warnings.
EOF
)"

issue "Apply the calendar-event spec to feed generation" "$M1" "feeds" "$(cat <<'EOF'
Implement `docs/calendar-event-spec.md`: SUMMARY, two-hour DURATION, full LOCATION, URL, the DESCRIPTION template (lines dropped when unknown), VALARM text, X-WR-CALNAME, X-WR-CALDESC, X-APPLE-CALENDAR-COLOR, REFRESH-INTERVAL. Add string assertions for the voice checks (no `!`, emoji, "TBA", "notification"; every time followed by ` in <City>`).

**Acceptance.** Snapshot tests for a timed game and a time-not-announced placeholder match the spec byte for byte; both feeds validate and import into Apple Calendar and Google Calendar.
EOF
)"

issue "Team pages and landing page from the reference HTML" "$M1" "pages" "$(cat <<'EOF'
Generate `/{country}/{sport}/index.html` for every team in `src/config.ts` from `reference/team-page.html` (static, responsive): stripe band, hero with subscribe panel (webcal, Google Calendar link, paste URL), next-game card, upcoming games, how it works, other teams, footer with the last-run line. Generate `/index.html` listing all teams. Add the Google Calendar reminder note from the spec.

**Acceptance.** Pages render at 390 px and 1280 px without horizontal scroll; every control is a real `<button>` or `<a>`; feed URLs on the page equal the files in `dist/`; `webcal://` links use the host the page is served from.
EOF
)"

issue "Share image per team at build time" "$M1" "pages,brand" "$(cat <<'EOF'
Render `reference/share-card.html` to `/{country}/{sport}/share.png` (1200×630) at build — Playwright screenshot or Satori + resvg, whichever is simpler in Actions — with the team's stripe, the recoloured mark and the next game. Add `og:image`, `og:title`, `og:description`, `twitter:card`.

**Acceptance.** Pasting a team URL into a chat app shows the card; image under 300 KB.
EOF
)"

issue "Custom-domain readiness" "$M1" "ops" "$(cat <<'EOF'
Read the canonical host from an env var / config (default `topless.github.io/scarf`); write `dist/CNAME` only when set; emit `<link rel="canonical">` and absolute URLs from that host; document the 301 plan (GitHub Pages → canonical; secondary domain forwarded at the registrar; never print the secondary).

**Acceptance.** Builds with and without the variable produce correct absolute URLs; feed paths identical on both hosts.
EOF
)"

issue "\"Tickets on sale\" calendar event" "$M2" "alerts,feeds" "$(cat <<'EOF'
Relates to #2.

Add an optional `onSale` date (and `ticketUrl`) per game in `src/manual.ts`. Emit an all-day event on that date with its own UID (`<game uid>-tickets@scarf`), summary `Tickets on sale · Home v Away`, 09:00 local alarm, description per `docs/calendar-event-spec.md`. Drop it once the game is past.

**Acceptance.** A fixture with an on-sale date produces exactly one extra event; removing the date removes it in place; copy matches the spec.
EOF
)"

issue "Optional \"new game announced\" alerts feed variant" "$M2" "alerts,feeds" "$(cat <<'EOF'
Relates to #2.

Persist the set of known UIDs between builds (small JSON next to the config, committed by the Actions run). When a new UID appears, emit an all-day "New game · …" event on that day — only in a separate `/{country}/{sport}-alerts.ics` containing the default feed plus alerts. Team page offers it as "also tell me when a new game is announced".

**Acceptance.** First build after a new fixture yields one alert event in the `-alerts` feed and none in the default feed; the JSON state is updated by the run.
EOF
)"

issue "Verify placeholder → timed transition in Apple and Google" "$M2" "feeds,data" "$(cat <<'EOF'
Test the open question from `docs/research-2026-10-02.md`: an all-day placeholder with a stable UID replaced by a timed event. Record behaviour in Apple Calendar (iOS/macOS), Google Calendar (web, Android) and Outlook; adjust SEQUENCE/DTSTAMP handling if any client duplicates.

**Acceptance.** A short note in `docs/` with screenshots; a test covering SEQUENCE increments.
EOF
)"

issue "Add Spain and Denmark (football and basketball)" "$M3" "data" "$(cat <<'EOF'
Add config entries (UEFA team ids; FIBA event + team codes per competition), TV and ticket sources per the research note, team stripe colours (`#AA151B/#F1BF00`, `#C60C30/#FFFFFF`).

**Acceptance.** Four new feeds and pages build; still one request per source per run (batch where the source allows, otherwise spread per-team requests across the day and document it).
EOF
)"

issue "Women's and U21 sides for existing federations" "$M3" "data" "$(cat <<'EOF'
Same shape, new ids; paths `/{country}/{sport}-women.ics`, `/{country}/{sport}-u21.ics`. Team page lists them under the same flag.

**Acceptance.** Feeds build; landing groups them under the country.
EOF
)"

issue "Team picker and combined personal feed (spike first)" "$M3" "pages,feeds" "$(cat <<'EOF'
Spike two approaches and pick one: (a) pre-built combinations — combinatorial, rule out beyond ~3 teams; (b) a tiny worker (Cloudflare Workers / Deno Deploy) that merges selected static feeds at request time: `/my.ics?t=greece-football,greece-basketball`, no accounts, the choice lives in the URL. Then build the picker page in the brand (chips with stripes) that outputs that URL and the three subscribe buttons.

**Acceptance.** Spike note with the decision; picker page; combined feed validates and keeps each event's UID; summary gains the ` · sport` suffix per spec.
EOF
)"

issue "Keep the daily workflow alive and alert on failure" "$M4" "ops" "$(cat <<'EOF'
GitHub disables scheduled workflows after 60 days without pushes: add a keepalive (the build commits a last-run stamp or uses a keepalive action), `workflow_dispatch`, and failure notifications. Document in README.

**Acceptance.** A dry run shows the keepalive commit; a forced failure notifies.
EOF
)"

issue "Where-to-watch by country" "$M4" "data" "$(cat <<'EOF'
A hand-maintained table of broadcasters per game per country (GR, CH, DE, UK, US to start) for fans abroad; shown in the event description as `TV: Alpha, Novasports (GR) · Sport1 (DE)` only where known.

**Acceptance.** Description line builds from the table; unknown countries are omitted, never guessed.
EOF
)"

issue "Results written back into past events" "$M4" "feeds,later" "$(cat <<'EOF'
After a game, update the event (summary `Greece 2–1 Serbia` or a "Final: 2–1" description line) from the same source, keeping the UID. Spike what UEFA/FIBA expose without extra requests.
EOF
)"

issue "Local clubs — discovery spike" "$M4" "later,data" "$(cat <<'EOF'
Pick one Greek pro football club and one basketball club; find a permissible fixture source (federation/league pages), map it to the same event shape, estimate maintenance. Decide whether clubs are federation-fed or club-submitted.

**Acceptance.** A one-page note with sources, terms, effort and a go/no-go.
EOF
)"

echo "done — $(gh issue list --repo "$REPO" --state open --limit 50 | wc -l | tr -d ' ') open issues"
