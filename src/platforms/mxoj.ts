/**
 * [MXOJ](https://oier.team) platform.
 *
 * It seems to be a fork of {@link Hydro}, so it reuses some of its logic.
 * @module
 */

import type { PlatformOptions } from '../platform.ts';
import type { Problem as HydroProblem, ProblemType as HydroProblemType } from './hydro.ts';
// eslint-disable-next-line unused-imports/no-unused-imports
import type Hydro from './hydro.ts';
import { FetchError } from 'ofetch';
import { NotFoundError, Platform, UnexpectedResponseError } from '../platform.ts';
import { UnOJError } from '../utils.ts';
import { parseHydroProblem } from './hydro.ts';

export type ProblemType = HydroProblemType;
export type Problem = HydroProblem;

const ProblemTypeOverridingTags: Partial<Record<string, ProblemType>> = {
  客观题: 'objective',
  提交答案题: 'submission',
  交互题: 'interactive',
};

export const DEFAULT_BASE_URL = 'http://oier.team';

/** MXOJ platform. */
export default class MXOJ extends Platform {
  constructor(options?: PlatformOptions) {
    super(options, DEFAULT_BASE_URL);
  }

  /** Fetches a problem from MXOJ using internal API. */
  override async getProblem(id: string): Promise<Problem> {
    const path = `/api/p/${id}`;
    let pdoc: any;
    try {
      // MXOJ API response structure is slightly different, pdoc is nested
      const response = await this.ofetch(path, { responseType: 'json' });
      pdoc = response.pdoc;
    } catch (e) {
      if (e instanceof FetchError && e.statusCode === 404)
        throw new NotFoundError('problem');
      throw new UnOJError(`Failed to fetch problem ${id}`, { cause: e });
    }

    if (!pdoc)
      throw new UnexpectedResponseError(pdoc);

    const problem = parseHydroProblem(pdoc);
    problem.link = new URL(`/problems/${id}`, this.baseURL).href;
    for (const tag of problem.tags) {
      if (tag in ProblemTypeOverridingTags) {
        problem.type = ProblemTypeOverridingTags[tag]!;
        break;
      }
    }

    return problem;
  }
}
