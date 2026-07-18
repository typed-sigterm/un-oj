<h1 align="center">
  <img src="./assets/logo.svg" alt="UnOJ" width="100" height="100">
</h1>

<p align="center">
  <a href="https://jsr.io/@un-oj/core"><img src="https://jsr.io/badges/@un-oj/core" alt="JSR"></a>
  <a href="https://npmjs.com/package/un-oj"><img src="https://img.shields.io/npm/v/un-oj?color=444&logo=npm&label="></a>
  <img src="https://img.shields.io/github/license/un-oj/core">
  <a href="https://github.com/un-oj/core"><img src="https://img.shields.io/github/stars/un-oj/core"></a>
</p>

Unified information collector of online competitive programming platforms.

## Usage

Install `un-oj` from NPM, or `@un-oj/core` from JSR.

<!-- eslint-disable -->
```ts
import Codeforces from '@un-oj/core/platforms/codeforces'; // If installed from JSR
// import Codeforces from 'un-oj/platforms/codeforces'; // If installed from NPM

const cf = new Codeforces();
console.log(await cf.getProblem('1A'));
```
<!-- eslint-enable -->

Currently supported platforms:

- [AtCoder](https://jsr.io/@un-oj/core/doc/platforms/atcoder) (`/platforms/atcoder`)
- [Codeforces](https://jsr.io/@un-oj/core/doc/platforms/codeforces) (`/platforms/codeforces`)
- [Hydro](https://jsr.io/@un-oj/core/doc/platforms/hydro) (`/platforms/hydro`)
- [LeetCode](https://jsr.io/@un-oj/core/doc/platforms/leetcode) (`/platforms/leetcode`)
- [Lyrio](https://jsr.io/@un-oj/core/doc/platforms/lyrio) (LibreOJ) (`/platforms/lyrio`)
- [Luogu](https://jsr.io/@un-oj/core/doc/platforms/luogu) (`/platforms/luogu`)
- [MXOJ](https://jsr.io/@un-oj/core/doc/platforms/mxoj) (`/platforms/mxoj`)
- [NowCoder](https://jsr.io/@un-oj/core/doc/platforms/nowcoder) (`/platforms/nowcoder`)

Documents are available on [JSR](https://jsr.io/@un-oj/core/doc).

## Compataility

UnOJ uses internal APIs, or parses HTML from some OJ, which may be changed at
any time. If you encountered any problems, feel free to open an issue.

## Acknowledgements

- [洛谷 API 文档](https://0f-0b.github.io/luogu-api-docs/)
