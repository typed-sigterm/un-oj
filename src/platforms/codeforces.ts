/**
 * [Codeforces](https://codeforces.com) platform.
 * @module
 */

import type { Contest as BaseContest } from '../contest.ts';
import type { PlatformOptions } from '../platform.ts';
import type { Problem as BaseProblem, ProblemIOSample } from '../problem.ts';
import { load } from 'cheerio';
import { NotFoundError, Platform, UnexpectedResponseError } from '../platform.ts';
import { parseMemory, parseTime, UnOJError } from '../utils.ts';

export type ProblemType = 'traditional' | 'interactive' | 'communication' | 'submission';

/**
 * Codeforces-specific problem type.
 *
 * Description is HTML.
 */
export type Problem = BaseProblem<
  string,
  number | undefined,
  number | undefined,
  string[],
  ProblemType
>;

export type ContestType = 'CF' | 'ICPC' | 'IOI';
export type ContestPhase = 'BEFORE' | 'CODING' | 'PENDING_SYSTEM_TEST' | 'SYSTEM_TEST' | 'FINISHED';

export interface ContestProblem {
  contestId: number
  index: string
  name: string
  type: string
  rating?: number
  tags: string[]
}

export type Contest = BaseContest<ContestProblem, ContestType>;

export const DEFAULT_BASE_URL = 'https://codeforces.com';

/** Codeforces platform. */
export default class Codeforces extends Platform {
  constructor(options?: PlatformOptions) {
    super(options, DEFAULT_BASE_URL);
  }

  /**
   * Fetches a problem from Codeforces, extracting information from HTML.
   *
   * Automatically switches to gym mode if {@link id} > `100000`.
   */
  override async getProblem(id: string): Promise<Problem> {
    const contest = Number.parseInt(id);
    const num = id.replace(String(contest), '');
    const path = contest > 100000
      ? `/gym/${contest}/problem/${num}`
      : `/problemset/problem/${contest}/${num}`;

    const $ = load(await this.ofetch(path, { responseType: 'text' }));
    const body = $('.problem-statement'), sidebar = $('#sidebar');

    const description = body
      .find('.header ~ *')
      .not('.sample-test')
      .html();
    if (!description)
      throw new NotFoundError('problem');

    const examples: ProblemIOSample[] = [];
    for (const el of body.find('.sample-test').children()) {
      const raw = $(el.lastChild!).html() ?? '';
      if (el.attribs.class === 'output')
        examples.at(-1)!.output = raw.replaceAll('<br>', '\n');
      else
        examples.push({ input: raw.replaceAll('<br>', '\n'), output: '' });
    }

    return {
      id,
      type: description.includes('This is an interactive problem.')
        ? 'interactive'
        : 'traditional',
      title: body.find('.header .title').text().replace(`${num}. `, ''),
      link: new URL(path, this.baseURL).href,
      description,

      samples: examples,
      timeLimit: parseTime(body.find('.time-limit').contents().last().text()),
      memoryLimit: parseMemory(body.find('.memory-limit').contents().last().text()),

      difficulty: Number(sidebar.find('.tag-box[title="Difficulty"]').text().trim().slice(1)) || undefined,
      tags: sidebar.find('.tag-box').not('[title="Difficulty"]').contents().map(
        (_, el) => $(el).text().trim(),
      ).get(),
    };
  }

  override async getContest(id: string): Promise<Contest> {
    const contestId = Number.parseInt(id);
    if (Number.isNaN(contestId))
      throw new NotFoundError('contest');

    let response: any;
    try {
      response = await this.ofetch('/api/contest.standings', {
        responseType: 'json',
        query: { contestId, count: 1 },
      });
    } catch (e) {
      throw new UnOJError(`Failed to fetch contest ${id}`, { cause: e });
    }

    if (response.status !== 'OK')
      throw new UnexpectedResponseError(response);

    const { contest, problems } = response.result;
    if (!contest)
      throw new NotFoundError('contest');

    return {
      id,
      title: contest.name,
      description: '',
      format: contest.type,
      startTime: contest.startTimeSeconds && new Date(contest.startTimeSeconds * 1000),
      endTime: contest.startTimeSeconds && contest.durationSeconds
        ? new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000)
        : undefined,
      problems: problems || [],
    };
  }

  override async listContests(): Promise<Contest[]> {
    let response: any;
    try {
      response = await this.ofetch('/api/contest.list', {
        responseType: 'json',
      });
    } catch (e) {
      throw new UnOJError('Failed to fetch contest list', { cause: e });
    }

    if (response.status !== 'OK')
      throw new UnexpectedResponseError(response);

    const contests = response.result;
    if (!Array.isArray(contests))
      throw new UnexpectedResponseError(response);

    return contests.map((contest: any) => ({
      id: String(contest.id),
      title: contest.name,
      description: '',
      format: contest.type,
      startTime: contest.startTimeSeconds && new Date(contest.startTimeSeconds * 1000),
      endTime: contest.startTimeSeconds && contest.durationSeconds
        ? new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000)
        : undefined,
      problems: [],
    }));
  }
}
