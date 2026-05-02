const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const QUIZ_POOL = [
  { word: "manzana",  lang: "Spanish",  ipa: "manˈsa.na",  correct: "apple",          wrong: ["water", "house", "tree"] },
  { word: "casa",     lang: "Spanish",  ipa: "ˈka.sa",     correct: "house",          wrong: ["car", "dog", "sun"] },
  { word: "agua",     lang: "Spanish",  ipa: "ˈa.ɣwa",     correct: "water",          wrong: ["bread", "milk", "fire"] },
  { word: "verde",    lang: "Spanish",  ipa: "ˈbeɾ.ðe",    correct: "green",          wrong: ["red", "blue", "yellow"] },
  { word: "perro",    lang: "Spanish",  ipa: "ˈpe.ro",     correct: "dog",            wrong: ["cat", "bird", "fish"] },
  { word: "flor",     lang: "Spanish",  ipa: "floɾ",       correct: "flower",         wrong: ["leaf", "stone", "river"] },
  { word: "estrella", lang: "Spanish",  ipa: "esˈtɾe.ʎa",  correct: "star",           wrong: ["moon", "cloud", "sky"] },
  { word: "soleil",   lang: "French",   ipa: "sɔ.lɛj",     correct: "sun",            wrong: ["moon", "cloud", "rain"] },
  { word: "pomme",    lang: "French",   ipa: "pɔm",         correct: "apple",          wrong: ["pear", "bread", "cake"] },
  { word: "lune",     lang: "French",   ipa: "lyn",         correct: "moon",           wrong: ["sun", "star", "earth"] },
  { word: "fleur",    lang: "French",   ipa: "flœʁ",       correct: "flower",         wrong: ["tree", "leaf", "grass"] },
  { word: "oiseau",   lang: "French",   ipa: "wa.zo",       correct: "bird",           wrong: ["fish", "cat", "horse"] },
  { word: "本",        lang: "Japanese", ipa: "hon",         correct: "book",           wrong: ["pen", "tree", "house"] },
  { word: "猫",        lang: "Japanese", ipa: "neko",        correct: "cat",            wrong: ["dog", "fish", "bird"] },
  { word: "木",        lang: "Japanese", ipa: "ki",          correct: "tree",           wrong: ["leaf", "rock", "river"] },
  { word: "さくら",    lang: "Japanese", ipa: "sakura",      correct: "cherry blossom", wrong: ["rose", "tulip", "lily"] },
  { word: "ゆめ",      lang: "Japanese", ipa: "yume",        correct: "dream",          wrong: ["sleep", "night", "wish"] },
  { word: "Buch",     lang: "German",   ipa: "buːx",        correct: "book",           wrong: ["pen", "page", "chair"] },
  { word: "Haus",     lang: "German",   ipa: "haʊs",       correct: "house",          wrong: ["car", "dog", "sun"] },
  { word: "Hund",     lang: "German",   ipa: "hʊnt",       correct: "dog",            wrong: ["cat", "horse", "wolf"] },
  { word: "ciao",     lang: "Italian",  ipa: "ˈtʃa.o",      correct: "hi / bye",       wrong: ["thank you", "please", "sorry"] },
  { word: "sole",     lang: "Italian",  ipa: "ˈso.le",      correct: "sun",            wrong: ["moon", "star", "sky"] },
  { word: "pane",     lang: "Italian",  ipa: "ˈpa.ne",      correct: "bread",          wrong: ["water", "cheese", "wine"] },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchLessonQueue(count = 5) {
  await delay(200);
  const picked = shuffle(QUIZ_POOL).slice(0, count);
  return picked.map((q) => {
    const choices = shuffle([q.correct, ...q.wrong]);
    return {
      id: `q-${q.word}-${Date.now()}`,
      word: q.word,
      lang: q.lang,
      ipa: q.ipa,
      choices,
      correctIndex: choices.indexOf(q.correct),
    };
  });
}

export async function submitAnswer({ wordId, correct }) {
  await delay(150);
  return {
    wordId,
    correct,
    coinsEarned: correct ? 8 : 0,
    message: correct ? "Nice work, plant is growing!" : "Keep going — roots take time.",
  };
}
