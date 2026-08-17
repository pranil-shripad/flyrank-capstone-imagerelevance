const SIMILARITY_THRESHOLD = 0.75;
const NO_FAMILY_SIMILARITY_THRESHOLD = 0.80;
const CONFIDENCE_THRESHOLD = 0.6;

const SUBJECT_FAMILIES = {
  fox: ['fox'],
  wolf: ['wolf'],
  dog: ['dog', 'puppy', 'puppies', 'husky', 'canine'],
  bear: ['bear'],
  deer: ['deer', 'stag', 'buck', 'doe', 'reindeer', 'kudu', 'blackbuck', 'antelope'],
};

function classifyFamily(text) {
  const lower = text.toLowerCase();
  for (const [family, keywords] of Object.entries(SUBJECT_FAMILIES)) {
    if (keywords.some((k) => lower.includes(k))) return family;
  }
  return null;
}

function evaluateMatch({ post, image, similarity }) {
  if (image.confidence < CONFIDENCE_THRESHOLD) {
    return {
      result: 'rejected',
      reason: `Image classification confidence too low (${image.confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD})`,
    };
  }

  if (similarity < SIMILARITY_THRESHOLD) {
    return {
      result: 'rejected',
      reason: `Similarity below threshold (${similarity.toFixed(3)} < ${SIMILARITY_THRESHOLD})`,
    };
  }

  const postFamily = classifyFamily(post.title) || classifyFamily(post.body);
  const imageFamily = classifyFamily(image.subject);

  if (!postFamily) {
    // Post subject unclear — category cross-check unavailable, so demand a higher similarity bar
    if (similarity < NO_FAMILY_SIMILARITY_THRESHOLD) {
      return {
        result: 'rejected',
        reason: `No confident match: post subject unclear and similarity insufficient (${similarity.toFixed(3)} < ${NO_FAMILY_SIMILARITY_THRESHOLD})`,
      };
    }
  } else if (imageFamily && postFamily !== imageFamily) {
    return {
      result: 'rejected',
      reason: `Category mismatch: post is about ${postFamily}, image shows ${imageFamily} (subject: "${image.subject}")`,
    };
  }

  return {
    result: 'accepted',
    reason: `Similarity ${similarity.toFixed(3)} ≥ threshold, confidence ${image.confidence.toFixed(2)}, subject family aligns with post`,
  };
}

module.exports = { evaluateMatch, SIMILARITY_THRESHOLD, NO_FAMILY_SIMILARITY_THRESHOLD, CONFIDENCE_THRESHOLD, classifyFamily };