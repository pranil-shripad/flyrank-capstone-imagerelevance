const { evaluateMatch, classifyFamily } = require('./guard');

describe('classifyFamily', () => {
  test('matches literal subject words', () => {
    expect(classifyFamily('red fox')).toBe('fox');
    expect(classifyFamily('gray wolf')).toBe('wolf');
  });

  test('matches non-literal dog family terms', () => {
    expect(classifyFamily('puppy')).toBe('dog');
    expect(classifyFamily('Siberian Husky')).toBe('dog');
    expect(classifyFamily('puppies')).toBe('dog');
  });

  test('matches non-literal deer family terms', () => {
    expect(classifyFamily('female kudu')).toBe('deer');
    expect(classifyFamily('pair of blackbucks')).toBe('deer');
    expect(classifyFamily('reindeer')).toBe('deer');
  });

  test('returns null for unrecognized subjects', () => {
    expect(classifyFamily('a rocket ship')).toBeNull();
  });
});

describe('evaluateMatch — the mismatch guard', () => {
  const foxPost = { title: 'The Secret Life of Red Foxes', body: 'Red foxes are adaptable wild canids.' };

  test('rejects low-confidence classifications regardless of similarity', () => {
    const result = evaluateMatch({
      post: foxPost,
      image: { subject: 'red fox', confidence: 0.4 },
      similarity: 0.9,
    });
    expect(result.result).toBe('rejected');
    expect(result.reason).toMatch(/confidence too low/);
  });

  test('rejects similarity below threshold', () => {
    const result = evaluateMatch({
      post: foxPost,
      image: { subject: 'red fox', confidence: 0.98 },
      similarity: 0.3,
    });
    expect(result.result).toBe('rejected');
    expect(result.reason).toMatch(/below threshold/);
  });

  test('THE CORE CASE: rejects a wolf image for a fox post', () => {
    const result = evaluateMatch({
      post: foxPost,
      image: { subject: 'wolf', confidence: 0.98 },
      similarity: 0.81, // realistically high, as observed in production data
    });
    expect(result.result).toBe('rejected');
    expect(result.reason).toMatch(/Category mismatch/);
    expect(result.reason).toMatch(/wolf/);
  });

  test('rejects non-literal dog-family mismatches (regression test for the substring bug)', () => {
    const result = evaluateMatch({
      post: foxPost,
      image: { subject: 'Siberian Husky', confidence: 0.98 },
      similarity: 0.78,
    });
    expect(result.result).toBe('rejected');
    expect(result.reason).toMatch(/Category mismatch/);
  });

  test('accepts a genuine high-confidence, high-similarity, matching-category image', () => {
    const result = evaluateMatch({
      post: foxPost,
      image: { subject: 'red fox', confidence: 0.98 },
      similarity: 0.85,
    });
    expect(result.result).toBe('accepted');
  });

  test('applies the stricter no-family threshold when post subject is unclear', () => {
    const spacePost = { title: 'A History of Space Exploration', body: 'Rockets and satellites.' };

    const belowThreshold = evaluateMatch({
      post: spacePost,
      image: { subject: 'red fox', confidence: 0.98 },
      similarity: 0.75, // clears the normal 0.75 bar, but not the 0.80 no-family bar
    });
    expect(belowThreshold.result).toBe('rejected');

    const aboveThreshold = evaluateMatch({
      post: spacePost,
      image: { subject: 'red fox', confidence: 0.98 },
      similarity: 0.85,
    });
    expect(aboveThreshold.result).toBe('accepted');
  });
});