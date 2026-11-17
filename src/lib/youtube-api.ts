declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pending: Promise<typeof YT> | null = null;

export function loadYouTubeAPI(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => fail(), 15000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      pending = null;
      reject(
        new Error(
          "YouTube could not load. Check your connection or content blocker.",
        ),
      );
    };
    window.onYouTubeIframeAPIReady = () => {
      cleanup();
      if (window.YT?.Player) resolve(window.YT);
      else fail();
      previous?.();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return pending;
}
