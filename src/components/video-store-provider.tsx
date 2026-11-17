"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { usePathname } from "next/navigation";
import { createVideoStore, type VideoStore } from "@/stores/video-store";

const VideoStoreContext = createContext<ReturnType<
  typeof createVideoStore
> | null>(null);

export function VideoStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createVideoStore);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/") store.getState().pause();
  }, [pathname, store]);
  useEffect(() => () => store.getState().clear(), [store]);
  return (
    <VideoStoreContext.Provider value={store}>
      {children}
    </VideoStoreContext.Provider>
  );
}

export function useVideoStore<T>(selector: (state: VideoStore) => T) {
  const store = useContext(VideoStoreContext);
  if (!store) throw new Error("VideoStoreProvider is required.");
  return useStore(store, selector);
}
