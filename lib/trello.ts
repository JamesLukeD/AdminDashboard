/**
 * Trello API wrapper — Cawarden SEO Task Board
 * Lists:  Quick Win 🎯 | CTR Fix ✏️ | Position Boost 🚀
 * Env:    TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID
 */

const BASE = "https://api.trello.com/1";

function auth(): string {
  return `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrelloList = { id: string; name: string };

export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  shortUrl: string;
  idList: string;
};

// These names must stay stable — they're used to match existing lists
export const LIST_NAMES: Record<string, string> = {
  "quick-win":        "Quick Win 🎯",
  "ctr-improvement":  "CTR Fix ✏️",
  "position-boost":   "Position Boost 🚀",
};

// ── Board helpers ─────────────────────────────────────────────────────────────

/** Fetch all open lists on a board */
export async function getBoardLists(boardId: string): Promise<TrelloList[]> {
  const res = await fetch(
    `${BASE}/boards/${boardId}/lists?${auth()}&filter=open`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) {
    throw new Error(`Trello getBoardLists ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Create a list on a board */
async function createList(boardId: string, name: string): Promise<TrelloList> {
  const res = await fetch(`${BASE}/lists?${auth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, idBoard: boardId, pos: "bottom" }),
  });
  if (!res.ok) {
    throw new Error(`Trello createList ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Ensure all three SEO lists exist on the board.
 * Returns a map of { opportunityType → listId }.
 */
export async function ensureLists(
  boardId: string,
): Promise<Record<string, string>> {
  const existing = await getBoardLists(boardId);
  const result: Record<string, string> = {};

  for (const [type, name] of Object.entries(LIST_NAMES)) {
    const found = existing.find((l) => l.name === name);
    if (found) {
      result[type] = found.id;
    } else {
      const created = await createList(boardId, name);
      result[type] = created.id;
    }
  }

  return result;
}

// ── Card helpers ──────────────────────────────────────────────────────────────

/**
 * Search a board for a card whose name exactly matches `query`.
 * Returns null if not found or on error (graceful — we fall back to create).
 */
export async function searchCard(
  boardId: string,
  query: string,
): Promise<TrelloCard | null> {
  try {
    const res = await fetch(
      `${BASE}/search?${auth()}&query=${encodeURIComponent(`"${query}"`)}&idBoards=${boardId}&modelTypes=cards&cards_limit=20`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const cards: TrelloCard[] = data.cards ?? [];
    return (
      cards.find((c) => c.name.trim().toLowerCase() === query.trim().toLowerCase()) ??
      null
    );
  } catch {
    return null;
  }
}

/** Create a new card at the top of a list */
export async function createCard(
  listId: string,
  name: string,
  desc: string,
): Promise<TrelloCard> {
  const res = await fetch(`${BASE}/cards?${auth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, desc, idList: listId, pos: "top" }),
  });
  if (!res.ok) {
    throw new Error(`Trello createCard ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Update an existing card (desc + move to correct list if type changed) */
export async function updateCard(
  cardId: string,
  data: { name?: string; desc?: string; idList?: string },
): Promise<TrelloCard> {
  const res = await fetch(`${BASE}/cards/${cardId}?${auth()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Trello updateCard ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
