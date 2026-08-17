const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { rankImagesForPost } = require('../services/matching');

async function runEval() {
  const labels = JSON.parse(fs.readFileSync(path.join(__dirname, '../eval/labels.json'), 'utf-8'));

  let correct = 0;
  const details = [];

  for (const label of labels) {
    const result = await rankImagesForPost(label.postId);

    let isCorrect;
    if (label.expectedSubjectKeyword === null) {
      // ground truth: no image should confidently match
      isCorrect = result.noConfidentMatch === true;
    } else {
      // ground truth: top match's subject should contain the expected keyword
      isCorrect = !result.noConfidentMatch &&
        result.topMatch.subject.toLowerCase().includes(label.expectedSubjectKeyword);
    }

    if (isCorrect) correct += 1;

    details.push({
      postId: label.postId,
      expected: label.expectedSubjectKeyword || 'no confident match',
      actual: result.noConfidentMatch ? 'no confident match' : result.topMatch.subject,
      correct: isCorrect,
    });
  }

  const precision = correct / labels.length;

  console.log('\n--- Top-1 Precision Eval ---');
  details.forEach((d) => {
    console.log(`Post ${d.postId}: expected="${d.expected}" actual="${d.actual}" -> ${d.correct ? 'PASS' : 'FAIL'}`);
  });
  console.log(`\nTop-1 Precision: ${correct}/${labels.length} = ${(precision * 100).toFixed(1)}%\n`);

  process.exit(precision === 1 ? 0 : 1); // non-zero exit if not perfect, useful for capstone.yaml's test: command
}

runEval();