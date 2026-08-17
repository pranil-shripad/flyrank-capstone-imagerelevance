const pool = require('../db/pool');
const { rankImagesForPost } = require('./matching');

// These tests run against your real seeded data — Phase 1-3 must already be complete
describe('rankImagesForPost — matching accuracy (integration)', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('fox post top match is a fox', async () => {
    const result = await rankImagesForPost(1);
    expect(result.noConfidentMatch).toBe(false);
    expect(result.topMatch.subject.toLowerCase()).toContain('fox');
  });

  test('wolf post top match is a wolf', async () => {
    const result = await rankImagesForPost(2);
    expect(result.noConfidentMatch).toBe(false);
    expect(result.topMatch.subject.toLowerCase()).toContain('wolf');
  });

  test('no wolf image is ever accepted for the fox post', async () => {
    const result = await rankImagesForPost(1);
    const acceptedWolves = result.allCandidates.filter(
      (c) => c.guardResult === 'accepted' && c.subject.toLowerCase().includes('wolf')
    );
    expect(acceptedWolves).toHaveLength(0);
  });

  test('unrelated post (space exploration) returns no confident match', async () => {
    const result = await rankImagesForPost(6);
    expect(result.noConfidentMatch).toBe(true);
  });
});