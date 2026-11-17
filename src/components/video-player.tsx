"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import type { Video } from "@/lib/video";
import type { Playback } from "@/stores/video-store";
import { videoEmbed } from "@/lib/host-resolver";
import { useVideoStore } from "./video-store-provider";
import { YouTubePlayer } from "./youtube-player";
import { releaseFeatures } from "@/lib/release-features";

export type PlayerProps = {
  video: Video;
  playback: Exclude<Playback, { kind: "empty" }>;
};

export function VideoPlayer(props: PlayerProps) {
  if (!releaseFeatures.websiteVideos && props.video.source !== "file") {
    return <p role="alert">Website imports are unavailable.</p>;
  }
  const embed = videoEmbed(props.video);
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {embed.kind === "file" ? (
        <NativePlayer {...props} />
      ) : embed.kind === "youtube" ? (
        <YouTubePlayer {...props} id={embed.id} start={embed.start} />
      ) : embed.kind === "tweet" || embed.kind === "vimeo" ? (
        <iframe
          src={
            embed.kind === "tweet"
              ? `https://platform.twitter.com/embed/Tweet.html?id=${embed.id}&theme=dark&maxWidth=1920&dnt=true`
              : `https://player.vimeo.com/video/${embed.id}`
          }
          title={props.video.title}
          className="block h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <p role="alert" className="p-6">
          This link cannot be embedded.
        </p>
      )}
    </div>
  );
}

function NativePlayer({ video, playback }: PlayerProps) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const report = useVideoStore((state) => state.onMediaEvent);
  const error = useVideoStore((state) => state.playbackError);
  const { videoId, revision, kind } = playback;
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (kind === "paused") {
      player.pause();
      return;
    }
    let cancelled = false;
    void player.play().catch((reason: unknown) => {
      if (
        cancelled ||
        (reason instanceof DOMException && reason.name === "AbortError")
      )
        return;
      report({
        videoId,
        revision,
        kind: "error",
        message:
          reason instanceof DOMException && reason.name === "NotAllowedError"
            ? "Press play to allow playback in this browser."
            : "Unable to play this video. Try an MP4 or WebM file.",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [kind, videoId, revision, report]);
  return (
    <>
      <video
        ref={playerRef}
        src={video.src}
        controls
        playsInline
        preload="metadata"
        aria-label={video.title}
        className="h-full w-full object-contain"
        onPlay={() => report({ videoId, revision, kind: "playing" })}
        onPause={() => report({ videoId, revision, kind: "paused" })}
        onEnded={() => report({ videoId, revision, kind: "ended" })}
        onError={() =>
          report({
            videoId,
            revision,
            kind: "error",
            message:
              "This video could not load. Try an MP4 or WebM file supported by your browser.",
          })
        }
      />
      {error && (
        <p className="player-error" role="alert">
          <AlertCircle size={17} />
          {error}
        </p>
      )}
    </>
  );
}
