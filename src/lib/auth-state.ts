export type AuthState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };
