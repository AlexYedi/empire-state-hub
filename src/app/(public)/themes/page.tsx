import { getThemes, themeSourceRoomCount } from "@/lib/themes";
import { getLayers, layerCoverage } from "@/lib/topic-layers";
import { ThemesIndex } from "./themes-index";

export default function ThemesPage() {
  return (
    <ThemesIndex
      themes={getThemes()}
      sourceRooms={themeSourceRoomCount()}
      layers={getLayers()}
      coverage={layerCoverage()}
    />
  );
}
