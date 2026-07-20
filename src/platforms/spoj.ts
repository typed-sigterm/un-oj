/**
 * [SPOJ](https://www.spoj.com) (Sphere Online Judge) platform.
 * @module
 */

import type { PlatformOptions } from '../platform.ts';
import type { Problem as BaseProblem, ProblemIOSample } from '../problem.ts';
import { load } from 'cheerio';
import { FetchError } from 'ofetch';
import { NotFoundError, Platform } from '../platform.ts';
import { UnOJError } from '../utils.ts';

/**
 * SPOJ-specific problem type.
 *
 * - Description is the HTML of the problem body (statement + example). Samples
 *   are also kept inline in the description because SPOJ embeds them in the
 *   statement; they are additionally parsed into {@link Problem.samples}.
 * - `timeLimit` is in milliseconds, parsed from the info table (e.g. `1s`).
 * - `memoryLimit` is in bytes, parsed from the info table (e.g. `1536MB`).
 * - `tags` are the `#tag` links on the page (without the leading `#`).
 * - `difficulty` is `undefined`: SPOJ only exposes percentage-based concept /
 *   implementation difficulty, not a stable rating.
 * - `type` is always `'traditional'`: SPOJ does not mark interactive /
 *   communication problems in the static HTML.
 */
export type Problem = BaseProblem<
  string,
  number | undefined,
  undefined,
  string[],
  'traditional'
>;

export const DEFAULT_BASE_URL = 'https://www.spoj.com';

/** SPOJ (Sphere Online Judge) platform. */
export default class SPOJ extends Platform {
  constructor(options?: PlatformOptions) {
    super(options, DEFAULT_BASE_URL);
  }

  /**
   * Fetches a problem from SPOJ by scraping the problem page at
   * `/problems/<id>/`. SPOJ has no JSON API, so the page HTML is parsed.
   *
   * @param id The problem code, e.g. `'TEST'`.
   */
  override async getProblem(id: string): Promise<Problem> {
    const path = `/problems/${id}/`;
    const url = new URL(path, this.baseURL).href;

    let html: string;
    try {
      html = await this.ofetch(path, { responseType: 'text' });
    } catch (e) {
      if (e instanceof FetchError && e.statusCode === 404)
        throw new NotFoundError('problem');
      throw new UnOJError(`Failed to fetch problem ${id}`, { cause: e });
    }

    const $ = load(html);
    const body = $('#problem-body');
    if (!body.length)
      throw new NotFoundError('problem');

    // Title is "<ID> - <title>" in the first <h2> of the problem body.
    const rawTitle = body.find('h2').first().text().trim();
    if (!rawTitle)
      throw new NotFoundError('problem');
    const title = rawTitle.includes(' - ')
      ? rawTitle.slice(rawTitle.indexOf(' - ') + 3)
      : rawTitle;

    // Tags are the "#tag" links inside the problem body.
    const tags: string[] = body
      .find('a[href*="/problems/tag/"]')
      .map((_, el) => $(el).text().trim().replace(/^#/, ''))
      .get();

    // Time / memory limits live in the info table rows:
    // `<th>Time limit:</th><td>1s</td>` / `<th>Memory limit:</th><td>1536MB</td>`.
    const info: Record<string, string> = {};
    body.find('table tr').each((_, tr) => {
      const $tr = $(tr);
      const label = $tr.find('th').text().trim().replace(/:$/, '');
      const value = $tr.find('td').text().trim();
      if (label)
        info[label] = value;
    });
    const timeLimit = parseTimeLimit(info['Time limit']);
    const memoryLimit = parseMemoryLimit(info['Memory limit']);

    // Samples: each <pre> typically contains "Input:\n...\n\nOutput:\n...".
    const samples = parseSamples(
      body.find('pre').map((_, el) => $(el).text()).get(),
    );

    // Description: the problem body HTML minus the title, tags, info table and
    // the "Information" heading. Samples remain inline (see type JSDoc above).
    // The info table is targeted via the preceding `<h3>Information</h3>` so
    // that any tables in the statement itself are preserved.
    body.find('h2').first().remove();
    body.find('a[href*="/problems/tag/"]').closest('p').remove();
    const infoHeading = body.find('h3').filter((_, el) => $(el).text().trim() === 'Information');
    infoHeading.next('table').remove();
    infoHeading.remove();
    const description = body.html()?.trim();
    if (!description)
      throw new NotFoundError('statement');

    return {
      id,
      type: 'traditional',
      title,
      link: url,
      description,
      samples,
      timeLimit,
      memoryLimit,
      tags,
      difficulty: undefined,
    };
  }
}

const MS_PER_SECOND = 1000;
const MEMORY_UNITS: Record<string, number> = {
  B: 1,
  K: 1024,
  KB: 1024,
  M: 1024 * 1024,
  MB: 1024 * 1024,
  G: 1024 * 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};

/**
 * Parses a SPOJ time limit string like `1s` or `1.5s` into milliseconds.
 *
 * @param s The time limit string from the info table.
 * @returns The time in milliseconds, or undefined if failed.
 */
function parseTimeLimit(s?: string): number | undefined {
  if (!s)
    return undefined;
  const m = s.match(/([\d.]+)\s*s/i);
  if (!m)
    return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n))
    return undefined;
  return Math.round(n * MS_PER_SECOND);
}

/**
 * Parses a SPOJ memory limit string like `1536MB` or `256M` into bytes.
 *
 * @param s The memory limit string from the info table.
 * @returns The memory in bytes, or undefined if failed.
 */
function parseMemoryLimit(s?: string): number | undefined {
  if (!s)
    return undefined;
  const m = s.match(/([\d.]+)\s*([A-Z]+)/i);
  if (!m || !m[2])
    return undefined;
  const unit = MEMORY_UNITS[m[2].toUpperCase()];
  if (unit === undefined)
    return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n))
    return undefined;
  return Math.round(n * unit);
}

/**
 * Parses sample input/output pairs from `<pre>` block texts.
 *
 * A `<pre>` is treated as a sample when it contains `Input:` / `Output:`
 * labels; pres without those labels (e.g. code in the statement) are skipped.
 *
 * @param pres The text contents of each `<pre>` in the problem body.
 * @returns The parsed sample input/output pairs.
 */
function parseSamples(pres: string[]): ProblemIOSample[] {
  const samples: ProblemIOSample[] = [];
  for (const pre of pres) {
    const inputIdx = pre.search(/Input:/i);
    const outputIdx = pre.search(/Output:/i);
    if (inputIdx === -1 && outputIdx === -1)
      continue;
    let input = '';
    let output = '';
    if (inputIdx !== -1 && outputIdx !== -1 && inputIdx < outputIdx) {
      input = pre.slice(inputIdx + 6, outputIdx);
      output = pre.slice(outputIdx + 7);
    } else if (inputIdx !== -1) {
      input = pre.slice(inputIdx + 6);
    } else {
      output = pre.slice(outputIdx + 7);
    }
    samples.push({ input: input.trim(), output: output.trim() });
  }
  return samples;
}
