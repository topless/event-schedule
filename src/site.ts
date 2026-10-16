// The public address of the site, resolved in one place so the default lives once.
// Until the custom domain exists it is the GitHub Pages address (see README § Domains).

export const DEFAULT_SITE_URL = 'https://topless.github.io/scarf'

type Env = Record<string, string | undefined>

// The canonical domain as a bare host ("scarf.fan"), set once as a repository variable when the
// domain exists. Empty until then: GitHub Actions passes an unset variable as an empty string.
// Anything but a host fails the build: a scheme or a path would print broken URLs and a broken CNAME.
export function canonicalHost(env: Env = process.env): string | undefined {
  const host = env.CANONICAL_HOST?.trim()
  if (!host) return undefined
  if (!/^[a-z0-9.-]+$/i.test(host)) {
    throw new Error(`CANONICAL_HOST must be a bare host such as scarf.fan, not "${host}"`)
  }
  return host
}

// Precedence: CANONICAL_HOST → https://{host}; else SITE_URL (GitHub Pages passes its own address);
// else the default. Never ends in a slash, so paths can be appended as "/greece/football".
export function resolveSiteUrl(env: Env = process.env): string {
  const host = canonicalHost(env)
  const url = host ? `https://${host}` : env.SITE_URL?.trim() || DEFAULT_SITE_URL
  return url.replace(/\/+$/, '')
}
