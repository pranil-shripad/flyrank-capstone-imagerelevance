// scripts/seedImages.js
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

const CORPUS_DIR = path.join(__dirname, '../corpus');

async function seed() {
  const files = fs.readdirSync(CORPUS_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const filename of files) {
    await pool.query(
      `INSERT INTO images (filename, filepath, status) VALUES ($1, $2, 'pending')`,
      [filename, path.join('corpus', filename)]
    );
  }
  console.log(`Seeded ${files.length} images`);
  process.exit(0);
}

seed();