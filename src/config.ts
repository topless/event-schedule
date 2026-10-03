import type { Details } from './game.ts'

// Working title; the real name is still to be chosen.
export const siteName = 'Event schedule'

export interface Team {
  slug: string // file name of the calendar feed
  name: string
  source: { kind: 'uefa'; teamId: number } | { kind: 'fiba'; event: string; teamCode: string }
  // TV and tickets are in no data source. The broadcaster is stable per rights cycle, so it is
  // kept here per team; see docs/research-2026-10-02.md.
  defaults: Pick<Details, 'tv' | 'tickets'>
}

export const teams: Team[] = [
  {
    slug: 'greece-football',
    name: 'Greece football',
    source: { kind: 'uefa', teamId: 49 },
    defaults: {
      // Confirmed for the Nations League 2026-27. Euro 2028 qualifiers are likely but
      // unconfirmed: re-check in early 2027.
      tv: 'Alpha, Novasports (Greece, expected)',
      tickets: 'https://www.pame-ethniki.gr/gnfc/showProductList.html',
    },
  },
  {
    slug: 'greece-basketball',
    name: 'Greece basketball',
    // One FIBA event per competition: a new competition needs a new event here.
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'GRE' },
    defaults: {
      tv: 'ERT (Greece, exact channel announced close to the game)',
    },
  },
]
