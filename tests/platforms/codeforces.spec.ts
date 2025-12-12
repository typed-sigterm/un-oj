import { NotFoundError } from '@un-oj/core';
import Codeforces from '@un-oj/core/platforms/codeforces';
import { UnOJError } from '@un-oj/core/utils';
import { describe, expect, it } from 'bun:test';
import { assertProblem } from './utils.ts';

const TIMEOUT = 10 * 1000;

describe('Codeforces platform', () => {
  const cf = new Codeforces();

  it('should fetch old problem', async () => {
    assertProblem(await cf.getProblem('1A'));
  }, TIMEOUT);

  it('should fetch new problem', async () => {
    assertProblem(await cf.getProblem('2050E'));
  }, TIMEOUT);

  it('should fetch interactive problem', async () => {
    assertProblem(await cf.getProblem('1486C2'), { type: 'interactive' });
  }, TIMEOUT);

  it('should fetch gym problem', async () => {
    assertProblem(await cf.getProblem('105863A'));
  }, TIMEOUT);

  it.todo('should throw w/ not-ready problem', async () => {
    expect(cf.getProblem('105851A')).rejects.toThrow(new UnOJError('Statement not ready'));
  }, TIMEOUT);

  it('should throw NotFoundError w/ non-existent problem', async () => {
    expect(cf.getProblem('114514A')).rejects.toThrow(NotFoundError);
  }, TIMEOUT);
});

describe('Codeforces platform (contest)', () => {
  const cf = new Codeforces();

  it('should throw NotFoundError w/ invalid contest ID', async () => {
    expect(cf.getContest('invalid')).rejects.toThrow(NotFoundError);
  }, TIMEOUT);
});

describe('Codeforces platform (contest list)', () => {
  const cf = new Codeforces();

  it('should list contests with offset and limit', async () => {
    const contests = await cf.listContests(0, 10);
    expect(contests).toBeDefined();
    expect(Array.isArray(contests)).toBe(true);
    expect(contests.length).toBeGreaterThan(0);
    expect(contests.length).toBeLessThanOrEqual(10);
    expect(contests[0]).toHaveProperty('id');
    expect(contests[0]).toHaveProperty('title');
    expect(contests[0]).toHaveProperty('format');
  }, TIMEOUT);

  it('should fetch a stable contest', async () => {
    // Test with contest ID 1 which is a historical contest
    expect(await cf.getContest('1')).toMatchSnapshot();
  }, TIMEOUT);
});
