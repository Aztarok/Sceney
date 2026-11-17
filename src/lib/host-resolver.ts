import type { Video } from "./video.ts";

export type Embed =
  | { kind: "file"; src: string }
  | { kind: "youtube"; id: string; start: number }
  | { kind: "tweet"; id: string }
  | { kind: "vimeo"; id: string }
  | { kind: "iframe"; src: string; aspect?: number } // generic embed
  | { kind: "unsupported" };

function startSeconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Math.min(Number(value), 86400);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return match
    ? Math.min(
        Number(match[1] ?? 0) * 3600 +
          Number(match[2] ?? 0) * 60 +
          Number(match[3] ?? 0),
        86400,
      )
    : 0;
}

export function resolveEmbed(rawUrl: string): Embed {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "unsupported" };
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return { kind: "unsupported" };
  const host = url.hostname.replace(/^(www\.|m\.|mobile\.)/, "");
  if (host === "x.com" || host === "twitter.com") {
    const id = url.pathname.match(
      /^\/(?:[^/]+\/status|i\/web\/status)\/(\d+)(?:\/|$)/,
    )?.[1];
    return id ? { kind: "tweet", id } : { kind: "unsupported" };
  }
  if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
    const id =
      host === "youtu.be"
        ? url.pathname.split("/")[1]
        : url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.match(
              /^\/(?:shorts|embed|live)\/([\w-]+)(?:\/|$)/,
            )?.[1];
    return id && /^[\w-]{11}$/.test(id)
      ? {
          kind: "youtube",
          id,
          start: startSeconds(
            url.searchParams.get("start") ?? url.searchParams.get("t"),
          ),
        }
      : { kind: "unsupported" };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
    return id ? { kind: "vimeo", id } : { kind: "unsupported" };
  }
  return /\.(mp4|webm|og[gv]|mov|m4v)$/i.test(url.pathname)
    ? { kind: "file", src: url.href }
    : { kind: "unsupported" };
}

export function videoEmbed(video: Video): Embed {
  // Uploaded files use blob URLs, which have no filename extension.
  return video.source === "file"
    ? { kind: "file", src: video.src }
    : resolveEmbed(video.src);
}

export function hasPlaybackControls(embed: Embed) {
  return embed.kind === "file" || embed.kind === "youtube";
}

export function embedLabel(embed: Embed): string {
  switch (embed.kind) {
    case "file":
      return "Video link";
    case "youtube":
      return "YouTube";
    case "tweet":
      return "X post";
    case "vimeo":
      return "Vimeo";
    case "iframe":
      return "Iframe";
    case "unsupported":
      return "Unsupported link";
    default: {
      const exhaustive: never = embed;
      return exhaustive;
    }
  }
}
