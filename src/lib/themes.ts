// Themes — recurring threads across the room archive (E-10 / YED-178). Seeded only from
// rooms.json `topics` / `series` values carried by two or more rooms; nothing is invented
// beyond those fields. Parsed and cross-checked at import, so a malformed export — or drift
// from rooms.json — fails the build instead of rendering something wrong.
//
// Follow-up (not in scope until S-03 merges): src/data/topic-layers.json adds the "By layer"
// view (E-10 item 3).
import { z } from "zod";
import THEMES_JSON from "@/data/themes.json";
import { getRoom, getRooms } from "@/lib/rooms";

export const ThemeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  roomSlugs: z.array(z.string()).min(2),
  postUrls: z.array(z.string().url()),
});

export type Theme = z.infer<typeof ThemeSchema>;

const FILE = z.array(ThemeSchema).parse(THEMES_JSON);

function assertIntegrity(themes: Theme[]): Theme[] {
  const seen = new Set<string>();
  for (const theme of themes) {
    if (seen.has(theme.id)) throw new Error(`themes.json: duplicate theme id "${theme.id}"`);
    seen.add(theme.id);

    for (const slug of theme.roomSlugs) {
      if (!getRoom(slug)) {
        throw new Error(`themes.json: "${theme.id}" references unknown room slug "${slug}"`);
      }
    }

    // A post may only be cited by a theme it was actually published from.
    const carried = new Set(
      theme.roomSlugs.flatMap((slug) => getRoom(slug)!.posts.map((p) => p.url)),
    );
    for (const url of theme.postUrls) {
      if (!carried.has(url)) {
        throw new Error(`themes.json: "${theme.id}" cites a post url its rooms do not carry`);
      }
    }
  }
  return themes;
}

const THEMES = assertIntegrity(FILE);

export function getThemes(): Theme[] {
  return THEMES;
}

/** Total rooms in the archive — for the "derived from N rooms" line. */
export function themeSourceRoomCount(): number {
  return getRooms().length;
}
