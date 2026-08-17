const { ImageTagSchema } = require('./vision');

describe('ImageTagSchema', () => {
  test('accepts valid tag output', () => {
    const result = ImageTagSchema.safeParse({
      subject: 'red fox',
      category: 'animal',
      attributes: ['orange fur', 'forest'],
      caption: 'A red fox in a forest',
      confidence: 0.94,
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing required fields', () => {
    const result = ImageTagSchema.safeParse({
      subject: 'red fox',
      category: 'animal',
      // missing attributes, caption, confidence
    });
    expect(result.success).toBe(false);
  });

  test('rejects confidence outside 0-1 range', () => {
    const result = ImageTagSchema.safeParse({
      subject: 'red fox',
      category: 'animal',
      attributes: ['orange fur'],
      caption: 'A fox',
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty attributes array', () => {
    const result = ImageTagSchema.safeParse({
      subject: 'red fox',
      category: 'animal',
      attributes: [],
      caption: 'A fox',
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });

  test('rejects non-string subject', () => {
    const result = ImageTagSchema.safeParse({
      subject: 123,
      category: 'animal',
      attributes: ['fur'],
      caption: 'A fox',
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });
});