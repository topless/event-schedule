import type { Details } from './game.ts'

// Lowercase wordmark, "Scarf" only at the start of a sentence. See docs/brand.md.
export const siteName = 'scarf'

export interface Team {
  // URL slugs. The path scheme is frozen because subscriptions point at it (see HANDOVER.md):
  // the feed is /{country}/{sport}.ics and the team page /{country}/{sport}/.
  country: string
  sport: string
  name: string // "Greece football": how the page and the calendar name call the team
  side: string // how the feed description calls the team, in full
  // Stripe colours from the flag or kit; the first one is the calendar colour (docs/brand.md).
  colours: [string, string] | [string, string, string]
  flag?: string // file in assets/, shown next to the team on its page
  source: { kind: 'uefa'; teamId: number } | { kind: 'fiba'; event: string; teamCode: string }
  // TV and tickets are in no data source. The broadcaster is stable per rights cycle, so it is
  // kept here per team; see docs/research-2026-10-02.md.
  defaults: Pick<Details, 'tv' | 'tickets'>
}

export const feedPath = (team: Team): string => `${team.country}/${team.sport}.ics`
export const sharePath = (team: Team): string => `${team.country}/${team.sport}/share.png`
export const shareSize = { width: 1200, height: 630 } // the share image, the size chat apps expect

export const teams: Team[] = [
  {
    country: 'greece',
    sport: 'football',
    name: 'Greece football',
    side: "Greece men's national football team",
    colours: ['#0D5EAF', '#FFFFFF'],
    flag: 'flag-gr.svg',
    source: { kind: 'uefa', teamId: 49 },
    defaults: {
      // Confirmed for the Nations League 2026-27. Euro 2028 qualifiers are likely but
      // unconfirmed: re-check in early 2027.
      tv: 'Alpha, Novasports (Greek TV)',
      tickets: 'https://www.pame-ethniki.gr/gnfc/showProductList.html',
    },
  },
  {
    country: 'greece',
    sport: 'basketball',
    name: 'Greece basketball',
    side: "Greece men's national basketball team",
    colours: ['#0D5EAF', '#FFFFFF'],
    flag: 'flag-gr.svg',
    // One FIBA event per competition: a new competition needs a new event here.
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'GRE' },
    defaults: {
      tv: 'ERT (Greek TV)',
    },
  },
  {
    country: 'spain',
    sport: 'football',
    name: 'Spain football',
    side: "Spain men's national football team",
    colours: ['#AA151B', '#F1BF00'],
    flag: 'flag-es.svg',
    source: { kind: 'uefa', teamId: 122 },
    defaults: {
      // RTVE shows the Nations League 2026-27 on La 1 and RTVE Play (checked 2026-10-17):
      // https://www.rtve.es/play/videos/uefa-nations-league/nations-league-croacia-espana-hora/17253700/
      tv: 'La 1 (Spanish TV)',
      // The federation's own ticket shop, which lists every national-team game on sale.
      tickets: 'https://tickets.rfef.es/',
    },
  },
  {
    country: 'spain',
    sport: 'basketball',
    name: 'Spain basketball',
    side: "Spain men's national basketball team",
    colours: ['#AA151B', '#F1BF00'],
    flag: 'flag-es.svg',
    // The same competition page as Greece, so the build fetches it once for both. The team code
    // is the one the page uses (test/fixtures/fiba-games.html).
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'ESP' },
    defaults: {
      // The federation's previews of the 2027 qualifiers name Teledeporte and Vamos (checked 2026-10-17):
      // https://www.feb.es/seleccionmasculina/2026/8/30/baloncesto/enorme-desafio-atenas-frente-grecia-lunes-1800h-teledeporte-vamos/106145.aspx
      tv: 'Teledeporte, Vamos (Spanish TV)',
      // The federation's ticket page for the men's team: one link per home game as it goes on sale.
      tickets: 'https://www.feb.es/entradasseam.aspx',
    },
  },
  {
    country: 'denmark',
    sport: 'football',
    name: 'Denmark football',
    side: "Denmark men's national football team",
    colours: ['#C60C30', '#FFFFFF'],
    flag: 'flag-dk.svg',
    source: { kind: 'uefa', teamId: 35 },
    defaults: {
      // TV 2 carries the Nations League 2026-27 (checked 2026-10-17 on its own match page,
      // https://sport.tv2.dk/fodbold/uefa-nations-league-a/herrer/kamp/2026-11-14-portugal-mod-danmark);
      // DR's preview of Denmark v Portugal also sends viewers to TV 2:
      // https://www.dr.dk/sporten/fodbold/landsholdet/portugals-spil-kan-blive-sluppet-fri-mod-danmark-vurderer-kommentator
      tv: 'TV 2 (Danish TV)',
      // DBU's fan site: sale dates and a link per game. Home games sell in three waves, members first.
      tickets: 'https://www.fordanmark.dk/billetter/herrelandsholdet/billetsalg/',
    },
  },
  {
    country: 'denmark',
    sport: 'basketball',
    name: 'Denmark basketball',
    side: "Denmark men's national basketball team",
    colours: ['#C60C30', '#FFFFFF'],
    flag: 'flag-dk.svg',
    // Denmark went out in the first round of the 2027 World Cup qualifiers and plays the
    // EuroBasket 2029 pre-qualifiers next (docs/research-2026-10-02.md).
    source: { kind: 'fiba', event: 'fiba-eurobasket-2029-pre-qualifiers', teamCode: 'DEN' },
    defaults: {
      // No TV line yet: the federation's deal with SPORT LIVE (2025-11-04) covers the qualifiers
      // for the 2027 tournaments, not these pre-qualifiers. Re-check when DBBF announces the
      // November 2026 window:
      // https://basket.dk/landskampene-er-sikret-sport-live-sender-danmarks-em-og-vm-kvalifikationskampe-i-basketball/
      // Home games sell through Ticketmaster, linked from https://basket.dk/herrelandsholdet/
      tickets: 'https://www.ticketmaster.dk/artist/danmarks-basketball-forbund-billetter/1311363',
    },
  },
]
