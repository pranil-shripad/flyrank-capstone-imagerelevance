const pool = require('../db/pool');

const POSTS = [
  {
    title: 'The Secret Life of Red Foxes',
    body: 'Red foxes, or Vulpes vulpes, are among the most adaptable wild canids. Found across forests, grasslands, and even suburban edges, these agile hunters use keen hearing to locate prey beneath snow. Their reddish-orange coat and bushy tail make them one of the most recognizable animals in the northern hemisphere.',
  },
  {
    title: 'Understanding Wolf Pack Behavior',
    body: 'Gray wolves live and hunt in tightly organized packs, usually led by a breeding pair. Communication through howls helps coordinate movement across large territories. Wolves play a critical role as apex predators in maintaining healthy ecosystems.',
  },
  {
    title: 'Why Dogs Became Our Best Friends',
    body: 'Domestic dogs descended from ancient wolf populations tens of thousands of years ago. Through selective breeding, humans shaped dogs into companions suited for herding, guarding, and companionship. Modern dog breeds vary enormously in size, temperament, and purpose.',
  },
  {
    title: 'The Grizzly and Brown Bear Guide',
    body: 'Brown bears, including the grizzly subspecies, are powerful omnivores found across North America and Eurasia. They forage for berries, dig for roots, and are skilled at catching salmon during seasonal runs. Despite their size, brown bears are surprisingly fast.',
  },
  {
    title: 'Deer Migration Patterns in Autumn',
    body: 'As temperatures drop, deer populations shift toward lower elevations in search of food. Red deer stags compete during the autumn rut, while herds move in response to changing forage availability. Migration routes are often passed down across generations.',
  },
  {
    title: 'A History of Space Exploration',
    body: 'From the first satellite launches to modern reusable rockets, space exploration has transformed how humanity understands the universe. Robotic probes have visited every planet in our solar system, while crewed missions continue to push the boundaries of what is possible beyond Earth.',
  },
];

async function seed() {
  for (const post of POSTS) {
    await pool.query(
      `INSERT INTO posts (title, body) VALUES ($1, $2)`,
      [post.title, post.body]
    );
  }
  console.log(`Seeded ${POSTS.length} posts`);
  process.exit(0);
}

seed();