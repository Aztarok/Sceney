"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Film,
  GripVertical,
  ListVideo,
  Plus,
  Trash2,
} from "lucide-react";
import { SHORTCUTS, isShortcut } from "@/lib/video";
import { embedLabel, videoEmbed } from "@/lib/host-resolver";
import { useVideoStore } from "./video-store-provider";

export function VideoQueue({ onUpload }: { onUpload: () => void }) {
  const {
    videos,
    playback,
    autoAdvance,
    select,
    reorder,
    remove,
    setShortcut,
    setAutoAdvance,
  } = useVideoStore((state) => state);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return (
    <section className="queue-card" aria-labelledby="queue-title">
      <div className="panel-heading">
        <span>
          <ListVideo size={17} />
          <h2 id="queue-title">Queue</h2>
          <span className="count">{videos.length}</span>
        </span>
        <button
          className="icon-button"
          aria-label="Upload to queue"
          onClick={onUpload}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="queue-description">
        <span>Drag to reorder</span>
        <span>Key</span>
      </div>
      {videos.length ? (
        <ol className="queue-list">
          {videos.map((video, index) => {
            const active =
              playback.kind !== "empty" && playback.videoId === video.id;
            const embed = videoEmbed(video);
            return (
              <li
                key={video.id}
                className={
                  "queue-item" +
                  (active ? " selected" : "") +
                  (video.id === draggedId ? " dragging" : "")
                }
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", video.id);
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedId(video.id);
                }}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => {
                  if (draggedId) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(event) => {
                  if (!draggedId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  reorder(draggedId, index);
                  setDraggedId(null);
                }}
              >
                <GripVertical
                  size={15}
                  className="drag-handle"
                  aria-hidden="true"
                />
                <button
                  className="queue-select"
                  onClick={() => select(video.id)}
                  aria-label={"Play " + video.title}
                  aria-current={active ? "true" : undefined}
                  aria-keyshortcuts={video.shortcut ?? undefined}
                >
                  <span className="video-thumbnail">
                    <Film size={20} />
                    {embed.kind === "file" && (
                      <video
                        src={video.src}
                        preload="metadata"
                        muted
                        playsInline
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    )}
                    {active && playback.kind === "playing" && (
                      <span className="equalizer">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </span>
                  <span className="queue-video-info">
                    <strong title={video.title}>{video.title}</strong>
                    <span>
                      {String(index + 1).padStart(2, "0")}{" "}
                      <span className="meta-dot">·</span>{" "}
                      {video.source === "file"
                        ? (video.bytes / 1024 / 1024).toFixed(1) + " MB"
                        : embedLabel(embed)}
                    </span>
                  </span>
                </button>
                <select
                  className="shortcut-select"
                  aria-label={"Shortcut for " + video.title}
                  title="Keyboard shortcut"
                  value={video.shortcut ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") setShortcut(video.id, null);
                    else if (isShortcut(value)) setShortcut(video.id, value);
                  }}
                >
                  <option value="">–</option>
                  {SHORTCUTS.map((key) => (
                    <option
                      key={key}
                      value={key}
                      disabled={videos.some(
                        (item) => item.id !== video.id && item.shortcut === key,
                      )}
                    >
                      {key}
                    </option>
                  ))}
                </select>
                <div className="queue-actions">
                  <button
                    className="icon-button"
                    aria-label={"Move " + video.title + " up"}
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => reorder(video.id, index - 1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Move " + video.title + " down"}
                    title="Move down"
                    disabled={index === videos.length - 1}
                    onClick={() => reorder(video.id, index + 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="icon-button remove-button"
                    aria-label={"Remove " + video.title}
                    title="Remove video"
                    onClick={() => remove(video.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="queue-empty">
          <div className="queue-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>Your queue is empty</p>
          <button className="text-button" onClick={onUpload}>
            <Plus size={15} /> Add videos
          </button>
        </div>
      )}
      <label className="auto-advance">
        <span>Play next automatically</span>
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(event) => setAutoAdvance(event.target.checked)}
        />
        <span className="switch" aria-hidden="true">
          <Check size={12} />
        </span>
      </label>
    </section>
  );
}
