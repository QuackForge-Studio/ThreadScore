// threadscore-cron: Worker với cron trigger mỗi 5 phút, gọi scoring endpoint của Pages.
const PAGES_URL = 'https://threadscore-ev9.pages.dev/api/cron/scoring';

async function triggerScoring(env: Env): Promise<void> {
  try {
    const res = await fetch(PAGES_URL, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    console.log('scoring cron:', res.status, await res.text());
  } catch (e) {
    console.error('scoring cron failed:', e);
  }
}

interface Env {
  CRON_SECRET: string;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(triggerScoring(env));
  },

  // Cho phép trigger thủ công để test: GET /run
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === '/run') {
      ctx.waitUntil(triggerScoring(env));
      return new Response('scoring triggered');
    }
    return new Response('Not found', { status: 404 });
  },
};
