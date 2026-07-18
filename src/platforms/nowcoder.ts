/**
 * [NowCoder](https://ac.nowcoder.com) platform (ACM problem set).
 * @module
 */

import type { PlatformOptions } from '../platform.ts';
import type { Problem as BaseProblem, ProblemDescriptionObject, ProblemIOSample } from '../problem.ts';
import { load } from 'cheerio';
import { NotFoundError, Platform } from '../platform.ts';

/**
 * NowCoder-specific problem type.
 *
 * Description is a {@link ProblemDescriptionObject} because NowCoder separates
 * the statement into 题目描述 / 输入描述 / 输出描述 sections in the HTML.
 *
 * - `timeLimit` is the C/C++/Rust/Pascal limit in ms (the first/strictest value
 *   shown on the page; NowCoder shows language-dependent limits like
 *   "C/C++/Rust/Pascal 1 秒，其他语言 2 秒" — we take the first).
 * - `memoryLimit` is the C/C++/Rust/Pascal limit in bytes (same rule).
 * - `tags` is `undefined`: NowCoder loads tags dynamically via JS, they are not
 *   in the server-rendered HTML.
 * - `difficulty` is `undefined`: not exposed on the problem page.
 * - `type` is always `'traditional'`: NowCoder does not mark interactive /
 *   communication problems in the static HTML.
 */
export type Problem = BaseProblem<
  ProblemDescriptionObject,
  number | undefined,
  undefined,
  undefined,
  'traditional'
>;

export const DEFAULT_BASE_URL = 'https://ac.nowcoder.com';

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

/** NowCoder platform (ACM problem set on https://ac.nowcoder.com). */
export default class NowCoder extends Platform {
  constructor(options?: PlatformOptions) {
    super(options, DEFAULT_BASE_URL);
  }

  /**
   * Fetches a problem from NowCoder by parsing the ACM problem HTML page.
   *
   * @param id The numeric problem ID (e.g. `'16742'`).
   */
  override async getProblem(id: string): Promise<Problem> {
    const path = `/acm/problem/${id}`;
    const $ = load(await this.ofetch(path, { responseType: 'text' }));

    const title = $('.question-title').text().trim();
    if (!title)
      throw new NotFoundError('problem');

    // 题号 / 时间限制 / 空间限制 / IO 格式 都在 .subject-item-wrap 的纯文本里
    const meta = $('.question-intr .subject-item-wrap').text();
    const timeLimit = parseTimeLimit(meta);
    const memoryLimit = parseMemoryLimit(meta);

    const details = $('.subject-question').html() ?? '';
    // <h2>输入描述:</h2> 紧跟 <pre>；用相邻兄弟选择器 + :contains 容忍全角/半角冒号
    const input = $('.subject-describe h2:contains("输入描述") + pre').html() ?? '';
    const output = $('.subject-describe h2:contains("输出描述") + pre').html() ?? '';

    const samples: ProblemIOSample[] = [];
    $('.question-oi').each((_, el) => {
      const $sample = $(el);
      // textarea 持有未编码的原始文本（复制按钮用），比解析 <pre> 更干净
      const sampleInput = $sample.find('textarea[data-clipboard-text-id^="input"]').text();
      const sampleOutput = $sample.find('textarea[data-clipboard-text-id^="output"]').text();
      if (sampleInput || sampleOutput)
        samples.push({ input: sampleInput, output: sampleOutput });
    });

    return {
      id,
      type: 'traditional',
      title,
      link: new URL(path, this.baseURL).href,
      description: {
        background: '',
        details,
        input,
        output,
        hint: '',
      },
      samples,
      timeLimit,
      memoryLimit,
      tags: undefined,
      difficulty: undefined,
    };
  }
}

/**
 * 从 `.subject-item-wrap` 文本中解析 C/C++/Rust/Pascal 的时间限制（第一个值）。
 *
 * 形如 `时间限制：C/C++/Rust/Pascal 1 秒，其他语言 2 秒` → 1000 (ms)。
 */
function parseTimeLimit(s: string): number | undefined {
  const m = s.match(/时间限制：[^\d，,]*(\d+)\s*秒/);
  if (!m)
    return undefined;
  return Number(m[1]) * MS_PER_SECOND;
}

/**
 * 从 `.subject-item-wrap` 文本中解析 C/C++/Rust/Pascal 的空间限制（第一个值）。
 *
 * 形如 `空间限制：C/C++/Rust/Pascal 128 M，其他语言 256 M` → 134217728 (bytes)。
 */
function parseMemoryLimit(s: string): number | undefined {
  const m = s.match(/空间限制：[^\d，,]*(\d+)\s*([A-Z]+)/i);
  if (!m || !m[2])
    return undefined;
  const unit = MEMORY_UNITS[m[2].toUpperCase()];
  if (unit === undefined)
    return undefined;
  return Number(m[1]) * unit;
}
