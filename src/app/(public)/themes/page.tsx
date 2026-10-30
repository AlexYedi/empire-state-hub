import { getThemes, themeSourceRoomCount } from "@/lib/themes";
import { ThemesIndex } from "./themes-index";

export default function ThemesPage() {
  return <ThemesIndex themes={getThemes()} sourceRooms={themeSourceRoomCount()} />;
}
