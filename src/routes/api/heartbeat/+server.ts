import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({ ok: true, timestamp: new Date().toISOString() });
};

export const POST: RequestHandler = async ({ request }) => {
  let payload: { message?: string } = {};

  try {
    payload = await request.json();
  } catch (error) {
    // Ignore JSON parse failures — a heartbeat ping shouldn't fail because of body shape
  }

  return json({
    ok: true,
    received: payload.message ?? null,
    timestamp: new Date().toISOString()
  });
};
