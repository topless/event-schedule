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
export const landingSharePath = 'share.png' // the landing page's, at the site root
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
]
