/**
 * Tracked competitor companies.
 *
 * domainPattern — a substring matched (case-insensitively) against the
 * result's domain in SERP Scout. Update these once you know the actual domains.
 *
 * url — the competitor's root URL, used as a shortcut in the Competitor
 * Analysis page and Page Analyser. Leave as an empty string until confirmed.
 */

export interface TrackedCompetitor {
  name: string;
  domainPattern: string;
  url: string;
}

export const TRACKED_COMPETITORS: TrackedCompetitor[] = [
  {
    name: "Hadley",
    domainPattern: "hadleygroup.com",
    url: "hadleygroup.com",
  },
  {
    name: "Reclaimed Brick Company",
    domainPattern: "reclaimedbrickcompany.co.uk",
    url: "reclaimedbrickcompany.co.uk",
  },
  {
    name: "Jim Wise",
    domainPattern: "jimwisereclamation.co.uk",
    url: "jimwisereclamation.co.uk",
  },
  {
    name: "Gardiners",
    domainPattern: "gardinersreclaims.co.uk",
    url: "gardinersreclaims.co.uk",
  },
  {
    name: "The Reclaimed Company",
    domainPattern: "thereclaimedcompany.co.uk",
    url: "thereclaimedcompany.co.uk",
  },
];

/**
 * Returns the TrackedCompetitor entry that matches a given domain, or null.
 */
export function getTrackedCompetitor(domain: string): TrackedCompetitor | null {
  const lower = domain.toLowerCase();
  return TRACKED_COMPETITORS.find((c) => lower.includes(c.domainPattern.toLowerCase())) ?? null;
}
