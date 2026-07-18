import { NotFoundError } from '@un-oj/core';
import NowCoder from '@un-oj/core/platforms/nowcoder';
import { describe, expect, it } from 'bun:test';
import { assertProblem } from './utils.ts';

const TIMEOUT = 10 * 1000;

describe('NowCoder platform', () => {
  const nc = new NowCoder();

  it('should fetch a stable problem (NOIP2002 字串变换)', async () => {
    assertProblem(await nc.getProblem('16742'));
  }, TIMEOUT);

  it('should fetch another stable problem', async () => {
    assertProblem(await nc.getProblem('16756'));
  }, TIMEOUT);

  it('should throw NotFoundError w/ non-existent problem', async () => {
    // NowCoder 对不存在的题目返回带错误提示的页面（无 .question-title），实现抛 NotFoundError
    await expect(nc.getProblem('999999999')).rejects.toThrow(NotFoundError);
  }, TIMEOUT);
});
