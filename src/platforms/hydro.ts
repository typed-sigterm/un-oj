/**
 * [HydroOJ](https://hydro.ac) platform.
 * @module
 */

import type { PlatformOptions } from '../platform.ts';
import type { Problem as BaseProblem, ProblemIOSample } from '../problem.ts';
import { FetchError } from 'ofetch';
import { NotFoundError, Platform, UnexpectedResponseError } from '../platform.ts';
import { getFirstKey, UnOJError } from '../utils.ts';

export type ProblemType = 'traditional' | 'interactive' | 'submission' | 'objective';

/**
 * HydroOJ-specific problem type.
 *
 * - Samples are **not** omitted in the description
 * - Description is [Hydro-flavored Markdown](https://docs.hydro.ac/docs/Hydro/user/problem)
 */
export type Problem = BaseProblem<
  string,
  number,
  number,
  string[],
  ProblemType
>;

const HydroProblemTypeMap: Partial<Record<string, ProblemType>> = {
  interactive: 'interactive',
  submit_answer: 'submission',
  objective: 'objective',
};

/**
 * Parses the problem document from Hydro-like platforms.
 * @param pdoc The `pdoc` field from the API response.
 * @param lang The language code, defaults to the first appeared language in the content.
 * @returns The parsed problem object, @{link Problem.link} is empty string.
 */
export function parseHydroProblem(pdoc: any, lang?: string): Problem {
  let content = JSON.parse(pdoc.content);
  content = lang == null ? content[getFirstKey(content)] : content[lang];

  const samples: ProblemIOSample[] = [];
  const r = (i: number, s: string): RegExp => new RegExp(`\`\`\`${s}${i}\\n([\\s\\S]+?)\`\`\``);
  for (let i = 1, match: any; match = r(i, 'input').exec(content); i++) {
    samples.push({
      input: match[1].trim(),
      output: r(i, 'output').exec(content)?.[1]?.trim() || '',
    });
  }

  return {
    id: pdoc.pid,
    type: HydroProblemTypeMap[pdoc.config.type] ?? 'traditional',
    title: pdoc.title,
    link: '',

    description: content,
    samples,
    timeLimit: pdoc.config?.timeLimit ?? pdoc.config?.timeMax,
    memoryLimit: (pdoc.config?.memoryLimit ?? pdoc.config?.memoryMax) * 1024 * 1024,
    difficulty: pdoc.difficulty,
    tags: pdoc.tag,
  };
}

export const DEFAULT_BASE_URL = 'https://hydro.ac';

/** HydroOJ platform. */
export default class Hydro extends Platform<string> {
  constructor(options?: PlatformOptions<string>) {
    super(options, DEFAULT_BASE_URL);
  }

  /**
   * Fetches a problem from HydroOJ using internal API.
   * @param domain The domain the problem belongs to, defaults to the system domain.
   */
  override async getProblem(id: string, domain?: string): Promise<Problem> {
    const path = domain ? `/d/${domain}/p/${id}` : `/p/${id}`;
    let data: any;

    try {
      data = await this.ofetch(path, {
        query: { pjax: 1 },
        headers: {
          accept: 'application/json',
        },
        responseType: 'json',
      });
    } catch (e) {
      if (e instanceof FetchError && e.statusCode === 404)
        throw new NotFoundError('problem');
      throw new UnOJError(`Failed to fetch problem ${id}`, { cause: e });
    }

    const pdoc = data?.raw?.pdoc;
    if (!pdoc)
      throw new UnexpectedResponseError(data);
    const link = new URL(domain ? `/d/${domain}/p/${id}` : `/p/${id}`, this.baseURL);
    if (this.locale)
      link.searchParams.append('lang', this.locale);

    return {
      ...parseHydroProblem(pdoc, this.locale),
      link: link.href,
    };
  }
}
