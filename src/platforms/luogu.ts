/**
 * [Luogu](https://www.luogu.com.cn) platform.
 * @module
 */

import type { Contest as BaseContest } from '../contest.ts';
import type { PlatformOptions } from '../platform.ts';
import type { Problem as BaseProblem, ProblemDescriptionObject, TagInfo } from '../problem.ts';
import { FetchError } from 'ofetch';
import { NotFoundError, Platform } from '../platform.ts';
import { mergeHeaders, UnOJError } from '../utils.ts';

export type ProblemType = 'traditional' | 'interactive' | 'communication' | 'submission';
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Maps {@link Difficulty} to a string label in Chinese. */
export const DifficultyLabel: Record<Difficulty, string> = {
  0: '暂无评定',
  1: '入门',
  2: '普及-',
  3: '普及/提高-',
  4: '普及+/提高',
  5: '提高+/省选-',
  6: '省选/提高-',
  7: 'NOI/NOI+/CTSC',
};

/**
 * Luogu-specific problem type.
 *
 * Description is Markdown.
 */
export type Problem = BaseProblem<
  ProblemDescriptionObject,
  number[],
  Difficulty,
  TagInfo[],
  ProblemType
>;

export type ProblemIdPrefix = 'B' | 'P' | 'T' | 'U';
export type ContestFormat = 1 | 2 | 3 | 4 | 5;
export const ContestFormatLabel: Record<ContestFormat, string> = {
  1: 'IOI',
  2: 'OI',
  3: 'ICPC',
  4: '乐多',
  5: 'Codeforces',
};

export interface ContestProblem {
  score: number
  problem: {
    pid: string
    title: string
    difficulty: Difficulty
    fullScore: number
    type: ProblemIdPrefix
  }
}

export type Contest = BaseContest<ContestProblem, ContestFormat>;

export const DEFAULT_BASE_URL = 'https://www.luogu.com.cn';

/**
 * Luogu platform.
 *
 * I18n is supported.
 */
export default class Luogu extends Platform<string> {
  constructor(options?: PlatformOptions<string>) {
    super({
      ...options,
      ofetchDefaults: {
        ...options?.ofetchDefaults,
        headers: mergeHeaders(
          options?.ofetchDefaults?.headers,
          [['x-lentille-request', 'content-only'], ['x-luogu-type', 'content-only']],
        ),
      },
    }, DEFAULT_BASE_URL);
  }

  /** Fetches a problem from Luogu using internal API. */
  override async getProblem(id: string): Promise<Problem> {
    const path = `/problem/${id}`;
    let data: any;
    try {
      ({ data } = await this.ofetch(path, { responseType: 'json' }));
    } catch (e) {
      if (e instanceof FetchError && e.statusCode === 404)
        throw new NotFoundError('problem');
      throw new UnOJError(`Failed to fetch problem ${id}`, { cause: e });
    }

    const content: {
      name: string
      background: string
      description: string
      formatI: string
      formatO: string
      hint: string
      locale: string
    } = this.locale
      ? (data.translations[this.locale] || data.problem.content)
      : data.problem.content;
    const tags: number[] = data.problem.tags;

    return {
      id,
      type: tags.includes(103)
        ? 'interactive'
        : tags.includes(104)
          ? 'submission'
          : tags.includes(351)
            ? 'communication'
            : 'traditional',
      title: content.name,
      link: new URL(path, this.baseURL).href,

      description: {
        background: content.background || '',
        details: content.description || '',
        input: content.formatI || '',
        output: content.formatO || '',
        hint: content.hint || '',
      },

      samples: (data.problem.samples as Array<[string, string]>).map(([a, b]) => ({
        input: a,
        output: b,
      })),

      timeLimit: data.problem.limits.time,
      memoryLimit: (data.problem.limits.memory as number[]).map(v => v * 1024),
      difficulty: data.problem.difficulty as Difficulty,
      tags: tags.map(t => ({ id: t })),
    };
  }

  override async getContest(id: string): Promise<Contest> {
    const path = `/contest/${id}`;
    let contest: any, contestProblems: ContestProblem[] | null;
    try {
      const data = await this.ofetch(path, { responseType: 'json' });
      if (data.code !== 200)
        throw new NotFoundError('contest');
      ({ contest, contestProblems } = data.currentData);
    } catch (e) {
      if (e instanceof UnOJError)
        throw e;
      if (e instanceof FetchError && e.statusCode === 404)
        throw new NotFoundError('contest');
      throw new UnOJError(`Failed to fetch contest ${id}`, { cause: e });
    }

    return {
      id,
      title: contest.name,
      description: contest.description,
      startTime: contest.startTime && new Date(contest.startTime * 1000),
      endTime: contest.endTime && new Date(contest.endTime * 1000),
      problems: contestProblems ?? [],
      format: contest.ruleType,
    };
  }

  override async listContests(page: number = 1): Promise<Contest[]> {
    const path = '/contest/list';
    let contests: any[];
    try {
      const data = await this.ofetch(path, {
        responseType: 'json',
        query: { page },
      });
      if (data.code !== 200)
        throw new UnOJError('Failed to fetch contest list');
      contests = data.currentData.contests.result;
    } catch (e) {
      if (e instanceof UnOJError)
        throw e;
      throw new UnOJError('Failed to fetch contest list', { cause: e });
    }

    return contests.map((contest: any) => ({
      id: String(contest.id),
      title: contest.name,
      description: '',
      startTime: contest.startTime && new Date(contest.startTime * 1000),
      endTime: contest.endTime && new Date(contest.endTime * 1000),
      problems: [],
      format: contest.ruleType,
    }));
  }
}
