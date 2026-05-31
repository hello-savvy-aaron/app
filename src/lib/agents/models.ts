// Model choices offered to agents. Plain module (no "use server"/"server-only")
// so both the server action validator and the client editor can import it.

export const AGENT_MODELS = [
  { value: "claude-opus-4-8", label: "Opus 4.8 — most capable" },
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6 — balanced" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 — fast & cheap" },
] as const;

export const AGENT_MODEL_VALUES: readonly string[] = AGENT_MODELS.map(
  (m) => m.value,
);
