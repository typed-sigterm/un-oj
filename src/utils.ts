import type { HeadersInit } from 'bun';
import pkg from '../package.json' with { type: 'json' };

export const version: string = pkg.version;

/** Get the first key of an object. */
export function getFirstKey<T extends Record<never, never>>(obj: T): keyof T {
  return Object.keys(obj)[0] as keyof T;
}

/**
 * Parses a human-readable time string.
 * @param s The string to parse.
 * @returns The time in milliseconds, or undefined if failed.
 */
export function parseTime(s?: string): number | undefined {
  if (!s)
    return;
  const val = Number.parseInt(s);
  if (Number.isNaN(val))
    return;
  switch (s) {
    case `${val} second`:
    case `${val} seconds`:
    case `${val} sec`:
    case `${val} secs`:
      return val * 1000;
  }
}

const MEMORY_UNITS: Record<string, number> = {
  megabyte: 1024 * 1024,
  megabytes: 1024 * 1024,
  MB: 1024 * 1024,
  MiB: 1024 * 1024,
};

/**
 * Parses a human-readable memory size string.
 *
 * @param s The string to parse.
 * @returns The memory size in bytes, or undefined if failed.
 */
export function parseMemory(s?: string): number | undefined {
  const [, val, unit] = s?.match(/^(\d+) ([a-z]+)$/i) ?? [];
  if (!val || !unit)
    return;
  return Number(val) * (MEMORY_UNITS[unit] ?? Number.NaN);
}

/**
 * Adds key-value pairs to the provided headers object if they aren't present.
 *
 * @param init The original headers object.
 * @param add The key-value pairs to add.
 * @returns A **new** headers object.
 */
export function mergeHeaders(init: HeadersInit | undefined, add: Array<[string, string]>): Headers {
  const ret = new Headers(
    init instanceof Headers
      ? init
      : Array.isArray(init)
        ? Object.fromEntries(init)
        : init,
  );
  for (const item of add)
    ret.append(item[0], item[1]);
  return ret!;
}

/** General error class for UnOJ. */
export class UnOJError extends Error {}
