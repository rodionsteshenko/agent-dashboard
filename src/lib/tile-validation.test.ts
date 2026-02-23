import { describe, it, expect } from 'vitest';
import { validateTile, getRequiredFields, getAllRequiredFields } from './tile-validation';

describe('validateTile', () => {
  describe('unknown types', () => {
    it('allows unknown tile types', () => {
      const result = validateTile('unknown-type', { anything: 'goes' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('flexible types', () => {
    it('skips validation for custom type', () => {
      const result = validateTile('custom', {});
      expect(result.valid).toBe(true);
    });

    it('skips validation for raw type', () => {
      const result = validateTile('raw', {});
      expect(result.valid).toBe(true);
    });
  });

  describe('note type', () => {
    it('validates valid note', () => {
      const result = validateTile('note', { title: 'Hello', body: 'World' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects note missing title', () => {
      const result = validateTile('note', { body: 'World' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field 'title' for type 'note'");
    });

    it('rejects note missing body', () => {
      const result = validateTile('note', { title: 'Hello' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field 'body' for type 'note'");
    });

    it('rejects note with empty string title', () => {
      const result = validateTile('note', { title: '', body: 'World' });
      expect(result.valid).toBe(false);
    });

    it('rejects note with null title', () => {
      const result = validateTile('note', { title: null, body: 'World' });
      expect(result.valid).toBe(false);
    });
  });

  describe('song type', () => {
    const validSong = {
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      year: 2024,
      spotifyUrl: 'https://open.spotify.com/track/123',
      analysis: 'Great song',
    };

    it('validates valid song', () => {
      const result = validateTile('song', validSong);
      expect(result.valid).toBe(true);
    });

    it('rejects song with invalid year (too low)', () => {
      const result = validateTile('song', { ...validSong, year: 1800 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid year'))).toBe(true);
    });

    it('rejects song with invalid year (too high)', () => {
      const result = validateTile('song', { ...validSong, year: 2200 });
      expect(result.valid).toBe(false);
    });

    it('rejects song with non-numeric year', () => {
      const result = validateTile('song', { ...validSong, year: 'abc' });
      expect(result.valid).toBe(false);
    });
  });

  describe('digest type', () => {
    it('rejects digest with non-array items', () => {
      const result = validateTile('digest', {
        title: 'Digest',
        source: 'src',
        summary: 'sum',
        items: 'not-an-array',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'items' must be an array for digest type");
    });

    it('accepts digest with array items', () => {
      const result = validateTile('digest', {
        title: 'Digest',
        source: 'src',
        summary: 'sum',
        items: [{ text: 'item1' }],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('brief type', () => {
    it('rejects brief with invalid audio path', () => {
      const result = validateTile('brief', {
        title: 'Brief',
        summary: 'sum',
        body: 'body',
        audio: 'invalid-path',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('audio'))).toBe(true);
    });

    it('accepts brief with /audio/ path', () => {
      const result = validateTile('brief', {
        title: 'Brief',
        summary: 'sum',
        body: 'body',
        audio: '/audio/brief.mp3',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts brief with http URL audio', () => {
      const result = validateTile('brief', {
        title: 'Brief',
        summary: 'sum',
        body: 'body',
        audio: 'https://example.com/audio.mp3',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('article type', () => {
    it('validates valid article', () => {
      const result = validateTile('article', {
        title: 'Article',
        url: 'https://example.com',
        source: 'web',
        summary: 'A summary',
      });
      expect(result.valid).toBe(true);
    });

    it('reports all missing fields', () => {
      const result = validateTile('article', {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(4); // title, url, source, summary
    });
  });

  describe('quote type', () => {
    it('validates valid quote', () => {
      const result = validateTile('quote', { text: 'To be or not to be', author: 'Shakespeare' });
      expect(result.valid).toBe(true);
    });
  });

  describe('todo type', () => {
    it('only requires title', () => {
      const result = validateTile('todo', { title: 'Do something' });
      expect(result.valid).toBe(true);
    });
  });
});

describe('getRequiredFields', () => {
  it('returns required fields for known type', () => {
    expect(getRequiredFields('note')).toEqual(['title', 'body']);
  });

  it('returns empty array for unknown type', () => {
    expect(getRequiredFields('nonexistent')).toEqual([]);
  });
});

describe('getAllRequiredFields', () => {
  it('returns all types', () => {
    const all = getAllRequiredFields();
    expect(Object.keys(all)).toContain('note');
    expect(Object.keys(all)).toContain('song');
    expect(Object.keys(all)).toContain('article');
  });

  it('returns a copy (not the original)', () => {
    const all = getAllRequiredFields();
    all['note'] = ['hacked'];
    const fresh = getAllRequiredFields();
    expect(fresh['note']).toEqual(['title', 'body']);
  });
});
