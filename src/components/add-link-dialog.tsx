"use client";

import { useState, type RefObject } from "react";
import { Link2, Plus, X } from "lucide-react";
import { useVideoStore } from "./video-store-provider";

export function AddLinkDialog({
  dialogRef,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
}) {
  const addLink = useVideoStore((state) => state.addLink);
  const [error, setError] = useState("");
  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="add-title"
      onClose={() => setError("")}
    >
      <div className="dialog-heading">
        <Link2 size={22} />
        <button
          className="icon-button"
          aria-label="Close add link"
          onClick={() => dialogRef.current?.close()}
        >
          <X size={19} />
        </button>
      </div>
      <h2 id="add-title">Add a video link</h2>
      <form
        className="add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const url = data.get("url");
          const title = data.get("title");
          if (
            typeof url !== "string" ||
            typeof title !== "string" ||
            !addLink({ title, url })
          ) {
            setError(
              "Use a YouTube video, X post, Vimeo video, or direct MP4/WebM link.",
            );
            return;
          }
          form.reset();
          dialogRef.current?.close();
        }}
      >
        <label htmlFor="video-url">Video URL</label>
        <input
          id="video-url"
          name="url"
          type="url"
          placeholder="Paste a YouTube, X, or video URL"
          required
          autoFocus
        />
        <label htmlFor="video-title">
          Title <span className="muted">optional</span>
        </label>
        <input
          id="video-title"
          name="title"
          placeholder="Video title"
          maxLength={120}
        />
        <p className="field-help">YouTube · X / Twitter · Vimeo · MP4 / WebM</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" type="submit">
          <Plus size={16} /> Add video
        </button>
      </form>
    </dialog>
  );
}
