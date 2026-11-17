export type Shortcut = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export const SHORTCUTS: readonly Shortcut[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];

export function isShortcut(value: string): value is Shortcut {
  return SHORTCUTS.some((shortcut) => shortcut === value);
}

export type Video = {
  id: string;
  title: string;
  src: string;
  shortcut: Shortcut | null;
} & ({ source: "file"; bytes: number } | { source: "link" });

export function moveVideo(videos: Video[], id: string, destination: number) {
  const source = videos.findIndex((video) => video.id === id);
  if (
    source < 0 ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= videos.length ||
    source === destination
  )
    return videos;
  const reordered = [...videos];
  const [video] = reordered.splice(source, 1);
  if (video) reordered.splice(destination, 0, video);
  return reordered;
}

export function parseVideoUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
