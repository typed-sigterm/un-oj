import { NotFoundError } from '@un-oj/core';
import SPOJ from '@un-oj/core/platforms/spoj';
import { UnOJError } from '@un-oj/core/utils';
import { describe, expect, it } from 'bun:test';
import { assertProblem } from './utils.ts';

// SPOJ is fronted by a Cloudflare managed challenge that 403s non-browser
// clients (curl / ofetch), so the live-HTTP + snapshot pattern used by the
// other platform tests is not viable here. Instead we drive the adapter with a
// fake underlying `fetch` (via `ofetchCreateOptions.fetch`) that returns a
// canned HTML fixture modeled on a real SPOJ problem page.

// Minimal, faithful reconstruction of `https://www.spoj.com/problems/TEST/`.
const TEST_HTML = `<!DOCTYPE html>
<html lang="en-US">
<head><title>SPOJ.com - Problem TEST</title></head>
<body>
<ol class="breadcrumb">
<li><a href="/problems">Problems</a></li>
<li><a href="/problems/classical">classical</a></li>
<li class="active">Life, the Universe, and Everything</li>
</ol>
<div id="problem-body" class="col-md-12">
<h2 id="problem-name" class="text-center">TEST - Life, the Universe, and Everything</h2>
<p class="text-center">
<a href="/problems/tag/basic">#basic</a>
<a href="/problems/tag/tutorial">#tutorial</a>
<a href="/problems/tag/ad-hoc-1">#ad-hoc-1</a>
</p>
<p>Your program is to use the brute-force approach in order to <em>find the Answer to Life, the Universe, and Everything</em>. More precisely... rewrite small numbers from input to output. Stop processing input after reading in the number 42. All numbers at input are integers of one or two digits.</p>
<h3>Example</h3>
<pre>Input:
1
2
88
42
99

Output:
1
2
88</pre>
<br/>
<h3>Information</h3>
<table class="table table-condensed">
<tr><th>Added by:</th><td><a href="/users/mima">mima</a></td></tr>
<tr><th>Date:</th><td>2004-05-01</td></tr>
<tr><th>Time limit:</th><td>1s</td></tr>
<tr><th>Source limit:</th><td>50000B</td></tr>
<tr><th>Memory limit:</th><td>1536MB</td></tr>
<tr><th>Cluster:</th><td><a href="/clusters/">Cube (Intel G860)</a></td></tr>
<tr><th>Languages:</th><td>All</td></tr>
<tr><th>Resource:</th><td>Douglas Adams, The Hitchhiker's Guide to the Galaxy</td></tr>
</table>
</div>
</body>
</html>`;

/** Builds a SPOJ instance with a custom underlying `fetch`. */
function makeSpojWithFetch(fetchImpl: typeof fetch): SPOJ {
  return new SPOJ({ ofetchCreateOptions: { fetch: fetchImpl } });
}

/** Builds a SPOJ instance whose underlying `fetch` serves `html` (or a 404 for `notFoundId`). */
function makeSpoj(html: string, notFoundId?: string): SPOJ {
  return makeSpojWithFetch(((...args: Parameters<typeof fetch>): Promise<Response> => {
    const url = String(args[0]);
    if (notFoundId && url.includes(`/problems/${notFoundId}/`))
      return Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' }));
    return Promise.resolve(new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }));
  }) as typeof fetch);
}

describe('SPOJ platform', () => {
  it('should fetch a stable problem (TEST)', async () => {
    const spoj = makeSpoj(TEST_HTML);
    assertProblem(await spoj.getProblem('TEST'));
  });

  it('should throw NotFoundError w/ non-existent problem', async () => {
    const spoj = makeSpoj(TEST_HTML, 'NONEXISTENT');
    await expect(spoj.getProblem('NONEXISTENT')).rejects.toThrow(NotFoundError);
  });

  // Cloudflare managed-challenge pages return 200 with JS-challenge HTML that
  // has no `#problem-body`; the adapter should surface this as NotFoundError.
  it('should throw NotFoundError when #problem-body is missing (e.g. Cloudflare challenge)', async () => {
    const spoj = makeSpoj('<!DOCTYPE html><html><body><h1>Just a moment...</h1></body></html>');
    await expect(spoj.getProblem('TEST')).rejects.toThrow(NotFoundError);
  });

  it('should throw UnOJError on non-404 fetch failure (e.g. HTTP 500)', async () => {
    const spoj = makeSpojWithFetch(((..._args: Parameters<typeof fetch>): Promise<Response> =>
      Promise.resolve(new Response('', { status: 500, statusText: 'Internal Server Error' }))) as typeof fetch);
    await expect(spoj.getProblem('TEST')).rejects.toThrow(UnOJError);
    await expect(spoj.getProblem('TEST')).rejects.not.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when title is missing', async () => {
    const spoj = makeSpoj('<div id="problem-body"><p>statement without a heading</p></div>');
    await expect(spoj.getProblem('TEST')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when description is missing', async () => {
    // #problem-body has a title but nothing else; after the title is stripped,
    // the description is empty.
    const spoj = makeSpoj('<div id="problem-body"><h2>TEST - Title</h2></div>');
    await expect(spoj.getProblem('TEST')).rejects.toThrow(NotFoundError);
  });
});
