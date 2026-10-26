/**
 * Keyword suggestions for autocomplete (PRD §3.1). Free-text allowed — this list
 * powers the picker UI + normalization aliases, it does NOT gate input.
 */
export const KEYWORD_SUGGESTIONS: string[] = [
  // social / drinks
  'drinks', 'wine', 'coffee', 'chill', 'board games', 'foodie', 'brunch',
  // sports
  'tennis', 'pickleball', 'badminton', 'hiking', 'running', 'trail running', 'gym', 'cycling', 'swimming', 'climbing',
  // industries
  'finance', 'tech', 'design', 'media', 'startup', 'marketing', 'law', 'medical',
  // creative
  'photography', 'music', 'film', 'art', 'books',
  // vibe
  'new in town', 'networking', 'language exchange', 'dog owners', 'early bird', 'night owl',
];

/** Normalize: trim, collapse spaces, lowercase. Aliases fold common variants. */
const ALIASES: Record<string, string> = {
  'boardgames': 'board games', 'boardgame': 'board games', 'bouldering': 'climbing',
  'hike': 'hiking', 'run': 'running', 'rnd': 'running', 'it': 'tech', 'fintech': 'finance',
  'cantonese': 'language exchange', 'mandarin': 'language exchange',
};

export function normalizeKeyword(raw: string): string {
  const base = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[base] ?? base;
}
