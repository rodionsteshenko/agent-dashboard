import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTilesByType, type FilterMode } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const mode = (url.searchParams.get('mode') || 'new') as FilterMode;
  const limit = Number(url.searchParams.get('limit') ?? '0');
  const tagFilters = url.searchParams.getAll('tag');

  let articles = getTilesByType('article', mode);

  if (tagFilters.length > 0) {
    articles = articles.filter((tile) =>
      tagFilters.every((tag) => tile.tags.includes(tag))
    );
  }

  if (limit > 0) {
    articles = articles.slice(0, limit);
  }

  return json(articles);
};
