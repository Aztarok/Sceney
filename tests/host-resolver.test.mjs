import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveEmbed, videoEmbed } from "../src/lib/host-resolver.ts";
import { createVideoStore } from "../src/stores/video-store.ts";

test("YouTube watch, short, Shorts, live and privacy embed URLs resolve to a video", () => {
  for (const url of [
    "https://youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtu.be/M7lc1UVf-VE?si=share",
    "https://m.youtube.com/shorts/M7lc1UVf-VE",
    "https://youtube.com/live/M7lc1UVf-VE",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
  ]) {
    assert.deepEqual(resolveEmbed(url), {
      kind: "youtube",
      id: "M7lc1UVf-VE",
      start: 0,
    });
  }
  assert.equal(resolveEmbed("https://youtu.be/M7lc1UVf-VE?t=1m30s").start, 90);
});

test("X and Twitter status links keep the full string ID", () => {
  for (const url of [
    "https://x.com/user/status/1263145271946551300?s=20",
    "https://twitter.com/user/status/1263145271946551300/video/1",
    "https://mobile.twitter.com/i/web/status/1263145271946551300",
  ]) {
    assert.deepEqual(resolveEmbed(url), {
      kind: "tweet",
      id: "1263145271946551300",
    });
  }
});

test("non-video pages, malformed IDs, credential URLs and unsafe schemes are rejected", () => {
  for (const url of [
    "https://x.com/user",
    "https://youtube.com/watch?v=invalid",
    "https://youtube.com/playlist?list=test",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://example.com/page",
    "javascript:alert(1)",
    "file:///test.mp4",
    "https://user:secret@example.com/test.mp4",
  ]) {
    assert.equal(resolveEmbed(url).kind, "unsupported");
    assert.equal(
      createVideoStore().getState().addLink({ title: "Bad", url }),
      false,
    );
  }
});

test("local blob uploads bypass URL inference; signed file URLs and Vimeo still work", () => {
  assert.deepEqual(
    videoEmbed({
      id: "local",
      title: "Video",
      source: "file",
      bytes: 2,
      src: "blob:http://localhost/uuid",
      shortcut: null,
    }),
    { kind: "file", src: "blob:http://localhost/uuid" },
  );
  assert.equal(
    resolveEmbed("https://cdn.example.com/test.MP4?token=public").kind,
    "file",
  );
  assert.deepEqual(resolveEmbed("https://vimeo.com/123456"), {
    kind: "vimeo",
    id: "123456",
  });
});

test("website imports are disabled, including supported providers and direct files", () => {
  const store = createVideoStore();
  for (const url of [
    "https://youtube.com/watch?v=M7lc1UVf-VE",
    "https://x.com/user/status/1263145271946551300",
    "https://vimeo.com/123456",
    "https://example.com/video.mp4",
  ]) {
    assert.equal(store.getState().addLink({ title: "Video", url }), false);
  }
  assert.deepEqual(store.getState().videos, []);
  assert.deepEqual(store.getState().playback, { kind: "empty" });
});
