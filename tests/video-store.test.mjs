import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createVideoStore } from "../src/stores/video-store.ts";
import { parseVideoUrl } from "../src/lib/video.ts";

const createdStores = [];
afterEach(() => {
  createdStores.splice(0).forEach((store) => store.getState().clear());
});

function queue(count = 3) {
  const store = createVideoStore();
  createdStores.push(store);
  for (let index = 0; index < count; index++) {
    store
      .getState()
      .addFiles([
        new File(["video bytes"], `Video ${index + 1}.mp4`, {
          type: "video/mp4",
        }),
      ]);
  }
  return store;
}

function media(store, kind, previous = store.getState().playback) {
  assert.notEqual(previous.kind, "empty");
  store
    .getState()
    .onMediaEvent({
      kind,
      videoId: previous.videoId,
      revision: previous.revision,
    });
}

test("each app gets isolated state; first added clip is selected and paused", () => {
  const first = queue();
  assert.equal(createVideoStore().getState().videos.length, 0);
  assert.equal(first.getState().playback.kind, "paused");
  assert.equal(
    first.getState().playback.videoId,
    first.getState().videos[0].id,
  );
});

test("plays clips in their current order and stops at the last clip", () => {
  const store = queue();
  const [first, second, third] = store.getState().videos;
  store.getState().select(first.id);
  media(store, "ended");
  assert.equal(store.getState().playback.videoId, second.id);
  assert.equal(store.getState().playback.kind, "playing");
  media(store, "ended");
  assert.equal(store.getState().playback.videoId, third.id);
  media(store, "ended");
  assert.equal(store.getState().playback.videoId, third.id);
  assert.equal(store.getState().playback.kind, "paused");
});

test("reordering keeps the current clip and its shortcut, and changes what plays next", () => {
  const store = queue();
  const [first, second, third] = store.getState().videos;
  store.getState().select(first.id);
  const playback = store.getState().playback;
  store.getState().reorder(third.id, 1);
  assert.equal(store.getState().playback, playback);
  assert.deepEqual(
    store.getState().videos.map((video) => video.id),
    [first.id, third.id, second.id],
  );
  media(store, "ended");
  assert.equal(store.getState().playback.videoId, third.id);
  store.getState().playShortcut("2");
  assert.equal(store.getState().playback.videoId, second.id);
});

test("rapid switching and replay reject media events from replaced players", () => {
  const store = queue();
  store.getState().playShortcut("1");
  const old = store.getState().playback;
  store.getState().playShortcut("2");
  store.getState().playShortcut("1");
  const current = store.getState().playback;
  assert.ok(current.revision > old.revision);
  media(store, "paused", old);
  media(store, "ended", old);
  store
    .getState()
    .onMediaEvent({
      kind: "error",
      videoId: old.videoId,
      revision: old.revision,
      message: "stale error",
    });
  assert.equal(store.getState().playback, current);
  assert.equal(store.getState().playbackError, null);
});

test("manual mode stops at the current clip; pause preserves the queue", () => {
  const store = queue();
  store.getState().setAutoAdvance(false);
  store.getState().playShortcut("1");
  const id = store.getState().playback.videoId;
  media(store, "ended");
  assert.equal(store.getState().playback.videoId, id);
  assert.equal(store.getState().playback.kind, "paused");
  store.getState().togglePlayback();
  assert.equal(store.getState().playback.kind, "playing");
  store.getState().pause();
  assert.equal(store.getState().videos.length, 3);
  assert.equal(store.getState().playback.videoId, id);
});

test("removing the current clip continues from its successor and empties safely", () => {
  const store = queue(2);
  const [first, second] = store.getState().videos;
  store.getState().select(first.id);
  store.getState().remove(first.id);
  assert.equal(store.getState().playback.videoId, second.id);
  assert.equal(store.getState().playback.kind, "playing");
  store.getState().remove(second.id);
  store.getState().togglePlayback();
  store.getState().skip(1);
  assert.deepEqual(store.getState().playback, { kind: "empty" });
  assert.equal(store.getState().playShortcut("1"), false);
});

test("shortcut keys are unique and can be reassigned or released", () => {
  const store = queue(10);
  const [first, second] = store.getState().videos;
  assert.equal(store.getState().videos[9].shortcut, null);
  store.getState().setShortcut(second.id, "1");
  assert.equal(store.getState().videos[1].shortcut, "2");
  store.getState().setShortcut(first.id, null);
  store.getState().setShortcut(second.id, "1");
  store.getState().playShortcut("1");
  assert.equal(store.getState().playback.videoId, second.id);
  store
    .getState()
    .addFiles([
      new File(["video bytes"], "Another.mp4", { type: "video/mp4" }),
    ]);
  assert.equal(store.getState().videos.at(-1).shortcut, "2");
});

test("uploads use real object URLs and release them on removal and clear", async () => {
  const store = createVideoStore();
  store
    .getState()
    .addFiles([
      new File(["video bytes"], "one.mp4", { type: "video/mp4" }),
      new File(["more bytes"], "two.webm", { type: "video/webm" }),
    ]);
  const [first, second] = store.getState().videos;
  assert.equal(first.source, "file");
  assert.equal(first.bytes, 11);
  assert.equal(await (await fetch(first.src)).text(), "video bytes");
  store.getState().remove(first.id);
  await assert.rejects(fetch(first.src));
  assert.equal(await (await fetch(second.src)).text(), "more bytes");
  store.getState().clear();
  await assert.rejects(fetch(second.src));
  assert.equal(store.getState().videos.length, 0);
});

test("unsupported/empty files and unsafe URLs do not enter the queue", () => {
  const store = createVideoStore();
  store
    .getState()
    .addFiles([
      new File(["text"], "notes.txt", { type: "text/plain" }),
      new File([], "empty.mp4", { type: "video/mp4" }),
    ]);
  for (const url of [
    "javascript:alert(1)",
    "file:///video.mp4",
    "data:video/mp4;base64,AAAA",
    "https://user:password@example.com/v.mp4",
    "invalid",
  ]) {
    assert.equal(store.getState().addLink({ title: "Invalid", url }), false);
  }
  assert.equal(store.getState().videos.length, 0);
  assert.equal(
    parseVideoUrl(" https://example.com/video.mp4 "),
    "https://example.com/video.mp4",
  );
});

test("invalid reorder requests leave the queue untouched", () => {
  const store = queue();
  const videos = store.getState().videos;
  for (const position of [-1, 3, 0.5, NaN])
    store.getState().reorder(videos[0].id, position);
  store.getState().reorder("missing", 0);
  assert.equal(store.getState().videos, videos);
});
