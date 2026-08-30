(function (global) {
  "use strict";

  const STORAGE_PREFIX = "therapy-skill-kit:handoff:";
  const DEFAULT_TTL_MS = 10 * 60 * 1000;
  const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

  function randomToken(cryptoObject = global.crypto) {
    if (!cryptoObject?.getRandomValues) throw new Error("Secure browser randomness is unavailable");
    const bytes = new Uint8Array(16);
    cryptoObject.getRandomValues(bytes);
    return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function storePayload(payload, options = {}) {
    const storage = options.storage || global.localStorage;
    const now = options.now ? options.now() : Date.now();
    const token = randomToken(options.cryptoObject);
    const envelope = { version: 1, created_at: now, expires_at: now + (options.ttlMs || DEFAULT_TTL_MS), payload };
    storage.setItem(STORAGE_PREFIX + token, JSON.stringify(envelope));
    return token;
  }

  function consumePayload(token, options = {}) {
    if (!TOKEN_PATTERN.test(String(token || ""))) return null;
    const storage = options.storage || global.localStorage;
    const key = STORAGE_PREFIX + token;
    const raw = storage.getItem(key);
    if (!raw) return null;
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (_error) {
      storage.removeItem(key);
      return null;
    }
    const now = options.now ? options.now() : Date.now();
    if (!envelope || envelope.version !== 1 || !envelope.payload || !Number.isFinite(envelope.expires_at) || envelope.expires_at < now) {
      storage.removeItem(key);
      return null;
    }
    storage.removeItem(key);
    return envelope.payload;
  }

  function goalBuilderUrl(token) {
    if (!TOKEN_PATTERN.test(String(token || ""))) throw new Error("Invalid handoff token");
    return `/tool-finder/goal-builder/?handoff=${encodeURIComponent(token)}`;
  }

  const api = { STORAGE_PREFIX, DEFAULT_TTL_MS, TOKEN_PATTERN, randomToken, storePayload, consumePayload, goalBuilderUrl };
  global.TherapySkillHandoff = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
