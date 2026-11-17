"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Keyboard,
  Link2,
  LogOut,
  MonitorPlay,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Upload,
  X,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { isShortcut } from "@/lib/video";
import { releaseFeatures } from "@/lib/release-features";
import { hasPlaybackControls, videoEmbed } from "@/lib/host-resolver";
import { Brand } from "./brand";
import { AddLinkDialog } from "./add-link-dialog";
import { VideoPlayer } from "./video-player";
import { VideoQueue } from "./video-queue";
import { useVideoStore } from "./video-store-provider";

type Account = { kind: "guest" } | { kind: "authenticated"; email: string };

export function Workspace({ account }: { account: Account }) {
  const {
    videos,
    playback,
    notice,
    addFiles,
    playShortcut,
    togglePlayback,
    skip,
  } = useVideoStore((state) => state);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkDialogRef = useRef<HTMLDialogElement>(null);
  const helpDialogRef = useRef<HTMLDialogElement>(null);
  const dragDepth = useRef(0);
  const [droppingFiles, setDroppingFiles] = useState(false);
  const current =
    playback.kind === "empty"
      ? undefined
      : videos.find((video) => video.id === playback.videoId);
  const currentIndex = current
    ? videos.findIndex((video) => video.id === current.id)
    : -1;
  const playing = playback.kind === "playing";
  const currentEmbed = current ? videoEmbed(current) : null;
  const canControlPlayback = currentEmbed
    ? hasPlaybackControls(currentEmbed)
    : false;
  const upload = () => fileRef.current?.click();

  const onKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      linkDialogRef.current?.open ||
      helpDialogRef.current?.open
    )
      return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))
    )
      return;
    if (isShortcut(event.key)) {
      if (playShortcut(event.key)) event.preventDefault();
      return;
    }
    if (target instanceof HTMLElement && target.closest("video")) return;
    if (
      event.code === "Space" &&
      !(target instanceof HTMLElement && target.closest("button, a"))
    ) {
      if (current && canControlPlayback) {
        event.preventDefault();
        togglePlayback();
      }
    } else if (event.key === "ArrowRight" && currentIndex < videos.length - 1) {
      event.preventDefault();
      skip(1);
    } else if (event.key === "ArrowLeft" && currentIndex > 0) {
      event.preventDefault();
      skip(-1);
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyboard(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="app-shell"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current++;
        setDroppingFiles(true);
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDroppingFiles(false);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDroppingFiles(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <a className="skip-link" href="#main">
        Skip to studio
      </a>
      <header className="topbar">
        <Link href="/" className="brand-link" aria-label="Sceney home">
          <Brand />
        </Link>
        <div className="header-actions">
          <button
            className="button ghost"
            onClick={() => helpDialogRef.current?.showModal()}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={17} />
            <span>Shortcuts</span>
          </button>
          {releaseFeatures.accounts && <span className="header-divider" />}
          {releaseFeatures.accounts &&
            (account.kind === "guest" ? (
              <Link href="/login" className="button secondary">
                Sign in
              </Link>
            ) : (
              <div className="header-account">
                <span className="avatar" title={account.email}>
                  {account.email.charAt(0).toUpperCase()}
                </span>
                <span className="account-email">{account.email}</span>
                <form action={signOut}>
                  <button className="button secondary">
                    <LogOut size={15} /> Sign out
                  </button>
                </form>
              </div>
            ))}
        </div>
      </header>
      <main id="main" className="workspace">
        <div className="page-heading">
          <div className="studio-title">
            <h1>Studio</h1>
            <span className="video-total">
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </span>
          </div>
          <div className="studio-actions">
            {releaseFeatures.websiteVideos && (
              <button
                className="button secondary"
                onClick={() => linkDialogRef.current?.showModal()}
              >
                <Link2 size={16} />
                <span>Add link</span>
              </button>
            )}
            <button className="button primary" onClick={upload}>
              <Upload size={16} /> Upload videos
            </button>
          </div>
        </div>

        <div className="studio-grid">
          <section className="player-card" aria-label="Video player">
            <div className="panel-heading">
              <span>
                <MonitorPlay size={16} /> Player
              </span>
              <span className="panel-meta">
                {current
                  ? String(currentIndex + 1).padStart(2, "0") +
                    " / " +
                    String(videos.length).padStart(2, "0")
                  : "NO VIDEO SELECTED"}
              </span>
            </div>
            <div className="player-stage">
              {current && playback.kind !== "empty" ? (
                <VideoPlayer
                  key={current.id + ":" + playback.revision}
                  video={current}
                  playback={playback}
                />
              ) : (
                <div className="player-empty">
                  <div className="empty-orbit">
                    <span className="empty-upload">
                      <Upload size={29} strokeWidth={1.5} />
                    </span>
                  </div>
                  <h2>Drop videos here</h2>
                  <p>No account needed.</p>
                  <button className="button primary" onClick={upload}>
                    <Upload size={16} /> Choose files
                  </button>
                  <span className="format-note">MP4 · WebM · MOV</span>
                </div>
              )}
            </div>
            <div className="player-toolbar">
              <div className="now-playing">
                <span
                  className={"playback-dot" + (playing ? " is-playing" : "")}
                />
                <div className="min-w-0">
                  <strong className="block" title={current?.title}>
                    {current?.title ?? "No video selected"}
                  </strong>
                  {current && !canControlPlayback && (
                    <span className="mt-1 block text-[10px] text-[#bdb0c9]">
                      Embedded controls ·{" "}
                      <a
                        className="text-[#b9a5f5] hover:underline"
                        href={current.src}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open{" "}
                        {currentEmbed?.kind === "tweet" ? "on X" : "original"}{" "}
                        ↗
                      </a>
                    </span>
                  )}
                </div>
              </div>
              <div className="transport">
                <button
                  className="icon-button"
                  aria-label="Previous video"
                  title="Previous video"
                  disabled={currentIndex <= 0}
                  onClick={() => skip(-1)}
                >
                  <SkipBack size={18} />
                </button>
                <button
                  className="play-button"
                  aria-label={playing ? "Pause video" : "Play video"}
                  disabled={!canControlPlayback}
                  title={
                    current && !canControlPlayback
                      ? "Use the embedded player's controls"
                      : undefined
                  }
                  onClick={togglePlayback}
                >
                  {playing ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                </button>
                <button
                  className="icon-button"
                  aria-label="Next video"
                  title="Next video"
                  disabled={!current || currentIndex === videos.length - 1}
                  onClick={() => skip(1)}
                >
                  <SkipForward size={18} />
                </button>
              </div>
            </div>
          </section>
          <VideoQueue onUpload={upload} />
        </div>
        <footer className="workspace-footer">
          <div className="keyboard-hints">
            <Keyboard size={15} />
            <span>
              <kbd>1</kbd> – <kbd>9</kbd> Switch video
            </span>
            <span>
              <kbd>Space</kbd> Play / pause
            </span>
          </div>
          <span className="session-caption">
            On this device · Clears on refresh
          </span>
        </footer>
        <p className="status-message" role="status">
          {notice}
        </p>
      </main>
      <input
        ref={fileRef}
        id="video-files"
        type="file"
        accept="video/*,.mp4,.webm,.mov,.m4v,.ogv"
        multiple
        hidden
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {droppingFiles && (
        <div className="file-drop-overlay">
          <Upload size={38} />
          <strong>Drop to add videos</strong>
        </div>
      )}
      {releaseFeatures.websiteVideos && (
        <AddLinkDialog dialogRef={linkDialogRef} />
      )}
      <dialog
        ref={helpDialogRef}
        className="dialog"
        aria-labelledby="shortcuts-title"
      >
        <div className="dialog-heading">
          <Keyboard size={22} />
          <button
            className="icon-button"
            aria-label="Close shortcuts"
            onClick={() => helpDialogRef.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <dl className="shortcuts-list">
          <div>
            <dt>Switch video</dt>
            <dd>
              <kbd>1</kbd>
              <span>–</span>
              <kbd>9</kbd>
            </dd>
          </div>
          <div>
            <dt>Play / pause</dt>
            <dd>
              <kbd>Space</kbd>
            </dd>
          </div>
          <div>
            <dt>Previous / next</dt>
            <dd>
              <kbd>←</kbd>
              <kbd>→</kbd>
            </dd>
          </div>
          <div>
            <dt>Close dialog</dt>
            <dd>
              <kbd>Esc</kbd>
            </dd>
          </div>
        </dl>
        <p className="dialog-footnote">
          Change keys in the queue. Reordering keeps each video's key. Shortcuts
          pause while typing or using a dialog.
        </p>
      </dialog>
    </div>
  );
}
