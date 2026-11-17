import assert from "node:assert/strict";
import { test } from "node:test";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

test("Supabase settings cannot enable accounts in the upload-only release", () => {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ];
  const original = keys.map((key) => process.env[key]);
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unused.example.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "test-publishable-placeholder";
    assert.equal(getSupabaseConfig(), null);
  } finally {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
