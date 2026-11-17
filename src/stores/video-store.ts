import { createStore } from "zustand/vanilla";
import { releaseFeatures } from "../lib/release-features.ts";
import {
  embedLabel,
  hasPlaybackControls,
  resolveEmbed,
  videoEmbed,
} from "../lib/host-resolver.ts";
import {
  SHORTCUTS,
  moveVideo,
  parseVideoUrl,
  type Shortcut,
  type Video,
} from "../lib/video.ts";

export type Playback =
  | { kind: "empty" }
  | { kind: "paused" | "playing"; videoId: string; revision: number };

type MediaEvent = { videoId: string; revision: number } & (
  | { kind: "playing" | "paused" | "ended" }
  | { kind: "error"; message: string }
);

export type VideoStore = {
  videos: Video[];
  playback: Playback;
  autoAdvance: boolean;
  playbackError: string | null;
  notice: string;
  addFiles: (files: File[]) => void;
  addLink: (input: { title: string; url: string }) => boolean;
  select: (id: string) => void;
  playShortcut: (key: Shortcut) => boolean;
  togglePlayback: () => void;
  pause: () => void;
  skip: (direction: -1 | 1) => void;
  reorder: (id: string, destination: number) => void;
  remove: (id: string) => void;
  setShortcut: (id: string, shortcut: Shortcut | null) => void;
  setAutoAdvance: (enabled: boolean) => void;
  onMediaEvent: (event: MediaEvent) => void;
  clear: () => void;
};

// One instance per mounted app. Never share uploaded files between server requests.
export function createVideoStore() {
  let revision = 0;
  const load = (videoId: string, kind: "paused" | "playing"): Playback => ({
    videoId,
    kind,
    revision: ++revision,
  });
  const release = (video: Video) => {
    if (video.source === "file") URL.revokeObjectURL(video.src);
  };

  return createStore<VideoStore>()((set, get) => {
    function append(added: Video[], notice: string) {
      const state = get();
      const usedKeys = new Set(state.videos.map((video) => video.shortcut));
      const assigned = added.map((video) => {
        const shortcut = SHORTCUTS.find((key) => !usedKeys.has(key)) ?? null;
        usedKeys.add(shortcut);
        return { ...video, shortcut };
      });
      const first = assigned[0];
      set({
        videos: [...state.videos, ...assigned],
        playback:
          state.playback.kind === "empty" && first
            ? load(first.id, "paused")
            : state.playback,
        notice,
      });
    }

    return {
      videos: [],
      playback: { kind: "empty" },
      autoAdvance: true,
      playbackError: null,
      notice: "",
      addFiles(files) {
        if (!files.length) return;
        const valid = files.filter(
          (file) =>
            file.size > 0 &&
            (file.type.startsWith("video/") ||
              /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)),
        );
        const added: Video[] = valid.map((file) => ({
          id: crypto.randomUUID(),
          title: file.name,
          src: URL.createObjectURL(file),
          source: "file",
          bytes: file.size,
          shortcut: null,
        }));
        const skipped = files.length - added.length;
        append(
          added,
          added.length
            ? `Added ${added.length} video${added.length === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} unsupported or empty file${skipped === 1 ? "" : "s"}.` : ""}`
            : "Choose a non-empty video file, such as MP4 or WebM.",
        );
      },
      addLink({ title, url }) {
        if (!releaseFeatures.websiteVideos) return false;
        const src = parseVideoUrl(url);
        if (!src) return false;
        const embed = resolveEmbed(src);
        if (embed.kind === "unsupported") return false;
        const video: Video = {
          id: crypto.randomUUID(),
          title: title.trim().slice(0, 120) || embedLabel(embed),
          src,
          source: "link",
          shortcut: null,
        };
        append([video], `Added ${video.title}.`);
        return true;
      },
      select(id) {
        const video = get().videos.find((item) => item.id === id);
        if (!video) return;
        const controlled = hasPlaybackControls(videoEmbed(video));
        set({
          playback: load(id, controlled ? "playing" : "paused"),
          playbackError: null,
          notice: `${controlled ? "Playing" : "Selected"} ${video.title}.`,
        });
      },
      playShortcut(key) {
        const video = get().videos.find((item) => item.shortcut === key);
        if (!video) return false;
        get().select(video.id);
        return true;
      },
      togglePlayback() {
        const { playback } = get();
        if (playback.kind === "empty") return;
        const video = get().videos.find((item) => item.id === playback.videoId);
        if (!video || !hasPlaybackControls(videoEmbed(video))) return;
        set({
          playback: {
            ...playback,
            kind: playback.kind === "playing" ? "paused" : "playing",
          },
          playbackError: null,
        });
      },
      pause() {
        const { playback } = get();
        if (playback.kind === "playing")
          set({ playback: { ...playback, kind: "paused" } });
      },
      skip(direction) {
        const state = get();
        const playback = state.playback;
        if (playback.kind === "empty") return;
        const index = state.videos.findIndex(
          (video) => video.id === playback.videoId,
        );
        const next = state.videos[index + direction];
        if (next) state.select(next.id);
      },
      reorder(id, destination) {
        const videos = moveVideo(get().videos, id, destination);
        if (videos === get().videos) return;
        set({ videos, notice: `Moved video to position ${destination + 1}.` });
      },
      remove(id) {
        const state = get();
        const index = state.videos.findIndex((video) => video.id === id);
        const removed = state.videos[index];
        if (!removed) return;
        const videos = state.videos.filter((video) => video.id !== id);
        let playback = state.playback;
        if (playback.kind !== "empty" && playback.videoId === id) {
          const next = videos[index] ?? videos[index - 1];
          playback = next
            ? load(
                next.id,
                hasPlaybackControls(videoEmbed(next))
                  ? playback.kind
                  : "paused",
              )
            : { kind: "empty" };
        }
        set({
          videos,
          playback,
          playbackError:
            state.playback !== playback ? null : state.playbackError,
          notice: `Removed ${removed.title}.`,
        });
        release(removed);
      },
      setShortcut(id, shortcut) {
        const state = get();
        if (!state.videos.some((video) => video.id === id)) return;
        if (
          shortcut !== null &&
          state.videos.some(
            (video) => video.id !== id && video.shortcut === shortcut,
          )
        )
          return;
        set({
          videos: state.videos.map((video) =>
            video.id === id ? { ...video, shortcut } : video,
          ),
        });
      },
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      onMediaEvent(event) {
        const state = get();
        const playback = state.playback;
        // Events from a replaced player must not pause or advance the new one.
        if (
          playback.kind === "empty" ||
          playback.videoId !== event.videoId ||
          playback.revision !== event.revision
        )
          return;
        switch (event.kind) {
          case "playing":
            set({
              playback: { ...playback, kind: "playing" },
              playbackError: null,
            });
            break;
          case "paused":
            if (playback.kind !== event.kind)
              set({ playback: { ...playback, kind: event.kind } });
            break;
          case "error":
            set({
              playback: { ...playback, kind: "paused" },
              playbackError: event.message,
            });
            break;
          case "ended": {
            const index = state.videos.findIndex(
              (video) => video.id === playback.videoId,
            );
            const next = state.autoAdvance
              ? state.videos[index + 1]
              : undefined;
            if (next) state.select(next.id);
            else set({ playback: { ...playback, kind: "paused" } });
            break;
          }
          default: {
            const exhaustive: never = event;
            return exhaustive;
          }
        }
      },
      clear() {
        const videos = get().videos;
        set({
          videos: [],
          playback: { kind: "empty" },
          playbackError: null,
          notice: "",
        });
        videos.forEach(release);
      },
    };
  });
}
