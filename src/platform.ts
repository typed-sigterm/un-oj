import type { $Fetch, CreateFetchOptions, FetchOptions } from 'ofetch';
import type { Contest } from './contest.ts';
import type { Problem } from './problem.ts';
import { ofetch } from 'ofetch';
import { mergeHeaders, UnOJError, version } from './utils.ts';

/** General platform constructor options. */
export interface PlatformOptions<Locale extends string | never = never> {
  /**
   * [`ofetch`](https://npmjs.com/package/ofetch) instance to use.
   *
   * Overrides {@link ofetchDefaults} {@link ofetchCreateOptions} {@link baseURL}.
   */
  ofetch?: $Fetch
  ofetchDefaults?: FetchOptions
  ofetchCreateOptions?: CreateFetchOptions
  baseURL?: string
  /** I18n locale if the platform supports i18n. */
  locale?: Locale
}

/**
 * The base class for all platforms.
 * Checkout the properties and methods to see what's available.
 *
 * ## Conventions
 *
 * - When a method is not implemented, it should throw an {@link UnsupportedError}.
 * - When a resource is not found, it should throw a {@link NotFoundError}.
 * - When the response is unexpected, it should throw an {@link UnexpectedResponseError}.
 */
export abstract class Platform<Locale extends string | never = never> {
  readonly ofetch: $Fetch;
  readonly baseURL: string;

  /**
   * I18n locale if supported.
   *
   * Only platforms/methods that explicitly support i18n will use this, and the
   * format requirements are up to the platform.
   */
  locale?: Locale;

  constructor(
    options: PlatformOptions<Locale> | undefined,
    defaultBaseURL: string,
    defaultLocale?: Locale,
  ) {
    const { headers } = options?.ofetchDefaults ?? {};
    this.baseURL = options?.baseURL ?? defaultBaseURL;

    this.ofetch = options?.ofetch ?? ofetch.create({
      ...options?.ofetchDefaults,
      baseURL: this.baseURL,
      headers: mergeHeaders(headers, [['user-agent', `UnOJ/${version}`]]),
    }, options?.ofetchCreateOptions);

    this.locale = options?.locale ?? defaultLocale;
  }

  /**
   * Fetch a problem from the platform.
   * @param _id The problem ID.
   * @returns The problem object.
   */
  getProblem(_id: string): Promise<Problem> {
    return Promise.reject(new UnsupportedError());
  }

  /**
   * Fetch a contest from the platform.
   * @param _id The contest ID.
   * @returns The contest object.
   */
  getContest(_id: string): Promise<Contest> {
    return Promise.reject(new UnsupportedError());
  }
}

/** An error that indicates a platform does not support a certain operation. */
export class UnsupportedError extends UnOJError {
  constructor() {
    super('Unsupported operation');
  }
}

/** An error that indicates a platform does not have a certain resource. */
export class NotFoundError extends UnOJError {
  constructor(public thing: string) {
    super(`Cannot find ${thing}`);
  }
}

export class UnexpectedResponseError extends UnOJError {
  constructor(public data?: unknown) {
    super('Unexpected response, see the "Compabtibility" section of README.md of @un-oj/core (or un-oj) package.');
  }
}
