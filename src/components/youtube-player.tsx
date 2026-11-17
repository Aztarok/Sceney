"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { loadYouTubeAPI } from "@/lib/youtube-api";
import type { PlayerProps } from "./video-player";
import { useVideoStore } from "./video-store-provider";

export function YouTubePlayer({
  video,
  playback,
  id,
  start,
}: PlayerProps & { id: string; start: number }) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<InstanceType<
    Awaited<ReturnType<typeof loadYouTubeAPI>>["Player"]
  > | null>(null);
  const ready = useRef(false);
  const report = useVideoStore((state) => state.onMediaEvent);
  const error = useVideoStore((state) => state.playbackError);
  const { videoId, revision, kind } = playback;
  const syncPlayback = useEffectEvent(() => {
    if (!ready.current) return;
    if (kind === "playing") player.current?.playVideo();
    else player.current?.pauseVideo();
  });

  useEffect(() => {
    let cancelled = false;
    const host = container.current;
    if (!host) return;
    const fail = (message: string) => {
      if (!cancelled) report({ videoId, revision, kind: "error", message });
    };
    void loadYouTubeAPI()
      .then((api) => {
        if (cancelled) return;
        // YouTube owns this child; React owns the surrounding container.
        const mount = document.createElement("div");
        host.appendChild(mount);
        player.current = new api.Player(mount, {
          width: "100%",
          height: "100%",
          videoId: id,
          playerVars: {
            playsinline: 1,
            origin: window.location.origin,
            start,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              event.target.getIframe().title = video.title;
              ready.current = true;
              syncPlayback();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              if (
                state === api.PlayerState.PLAYING ||
                state === api.PlayerState.PAUSED ||
                state === api.PlayerState.ENDED
              ) {
                report({
                  videoId,
                  revision,
                  kind:
                    state === api.PlayerState.PLAYING
                      ? "playing"
                      : state === api.PlayerState.PAUSED
                        ? "paused"
                        : "ended",
                });
              }
            },
            onError: () =>
              fail(
                "YouTube could not play this video. It may be private, unavailable, or have embedding disabled.",
              ),
            onAutoplayBlocked: () =>
              fail("Press play inside the YouTube player to allow playback."),
          },
        });
      })
      .catch((reason: unknown) =>
        fail(
          reason instanceof Error ? reason.message : "YouTube could not load.",
        ),
      );
    return () => {
      cancelled = true;
      ready.current = false;
      player.current?.destroy();
      player.current = null;
      host.replaceChildren();
    };
  }, [id, start, video.title, videoId, revision, report]);

  useEffect(() => {
    syncPlayback();
  }, [kind]);

  return (
    <>
      <div
        ref={container}
        className="h-full w-full [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
      />
      {error && (
        <p className="player-error" role="alert">
          <AlertCircle size={17} />
          <span>
            {error}{" "}
            <a
              href={video.src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#b9a5f5] underline"
            >
              Open on YouTube <ExternalLink size={12} />
            </a>
          </span>
        </p>
      )}
    </>
  );
}
