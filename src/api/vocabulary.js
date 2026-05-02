import { authHeader } from "./auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Static word info for popup cards (ipa, gloss, seen, mastery)
export const WORD_INFO = {
  manzana:  { lang: "Spanish",  langColor: "#c1325a", ipa: "manˈsa.na",  gloss: "apple",            seen: 14, mastery: 4 },
  casa:     { lang: "Spanish",  langColor: "#c1325a", ipa: "ˈka.sa",     gloss: "house",            seen: 22, mastery: 5 },
  agua:     { lang: "Spanish",  langColor: "#c1325a", ipa: "ˈa.ɣwa",     gloss: "water",            seen: 18, mastery: 4 },
  hola:     { lang: "Spanish",  langColor: "#c1325a", ipa: "ˈo.la",      gloss: "hello",            seen: 27, mastery: 5 },
  verde:    { lang: "Spanish",  langColor: "#c1325a", ipa: "ˈbeɾ.ðe",    gloss: "green",            seen:  9, mastery: 3 },
  perro:    { lang: "Spanish",  langColor: "#c1325a", ipa: "ˈpe.ro",     gloss: "dog",              seen: 11, mastery: 3 },
  flor:     { lang: "Spanish",  langColor: "#c1325a", ipa: "floɾ",       gloss: "flower",           seen:  6, mastery: 2 },
  estrella: { lang: "Spanish",  langColor: "#c1325a", ipa: "esˈtɾe.ʎa",  gloss: "star",             seen:  4, mastery: 2 },
  "本":     { lang: "Japanese", langColor: "#b53a6a", ipa: "hon",        gloss: "book",             seen: 21, mastery: 5 },
  "りんご": { lang: "Japanese", langColor: "#b53a6a", ipa: "ringo",      gloss: "apple",            seen: 12, mastery: 4 },
  "猫":     { lang: "Japanese", langColor: "#b53a6a", ipa: "neko",       gloss: "cat",              seen: 25, mastery: 5 },
  "さくら": { lang: "Japanese", langColor: "#b53a6a", ipa: "sakura",     gloss: "cherry blossom",   seen:  9, mastery: 3 },
  "木":     { lang: "Japanese", langColor: "#b53a6a", ipa: "ki",         gloss: "tree",             seen: 14, mastery: 4 },
  "言葉":   { lang: "Japanese", langColor: "#b53a6a", ipa: "kotoba",     gloss: "word",             seen:  8, mastery: 3 },
  "幸せ":   { lang: "Japanese", langColor: "#b53a6a", ipa: "shiawase",   gloss: "happiness",        seen:  6, mastery: 2 },
  "すし":   { lang: "Japanese", langColor: "#b53a6a", ipa: "sushi",      gloss: "sushi",            seen: 16, mastery: 4 },
  "ゆめ":   { lang: "Japanese", langColor: "#b53a6a", ipa: "yume",       gloss: "dream",            seen:  5, mastery: 2 },
  Buch:     { lang: "German",   langColor: "#5a3e8e", ipa: "buːx",       gloss: "book",             seen: 13, mastery: 4 },
  Haus:     { lang: "German",   langColor: "#5a3e8e", ipa: "haʊs",       gloss: "house",            seen: 17, mastery: 4 },
  rot:      { lang: "German",   langColor: "#5a3e8e", ipa: "ʁoːt",       gloss: "red",              seen: 10, mastery: 3 },
  Hund:     { lang: "German",   langColor: "#5a3e8e", ipa: "hʊnt",       gloss: "dog",              seen:  8, mastery: 3 },
  danke:    { lang: "German",   langColor: "#5a3e8e", ipa: "ˈdaŋ.kə",    gloss: "thank you",        seen: 19, mastery: 5 },
  soleil:   { lang: "French",   langColor: "#d4812a", ipa: "sɔ.lɛj",     gloss: "sun",              seen: 18, mastery: 5 },
  pomme:    { lang: "French",   langColor: "#d4812a", ipa: "pɔm",        gloss: "apple",            seen: 15, mastery: 4 },
  lune:     { lang: "French",   langColor: "#d4812a", ipa: "lyn",        gloss: "moon",             seen: 12, mastery: 4 },
  merci:    { lang: "French",   langColor: "#d4812a", ipa: "mɛʁ.si",     gloss: "thank you",        seen: 24, mastery: 5 },
  bonjour:  { lang: "French",   langColor: "#d4812a", ipa: "bɔ̃.ʒuʁ",    gloss: "hello",            seen: 20, mastery: 5 },
  fleur:    { lang: "French",   langColor: "#d4812a", ipa: "flœʁ",       gloss: "flower",           seen:  7, mastery: 3 },
  oiseau:   { lang: "French",   langColor: "#d4812a", ipa: "wa.zo",      gloss: "bird",             seen:  4, mastery: 2 },
  ciao:     { lang: "Italian",  langColor: "#3e6534", ipa: "ˈtʃa.o",     gloss: "hi / bye",         seen: 22, mastery: 5 },
  sole:     { lang: "Italian",  langColor: "#3e6534", ipa: "ˈso.le",     gloss: "sun",              seen: 11, mastery: 4 },
  pane:     { lang: "Italian",  langColor: "#3e6534", ipa: "ˈpa.ne",     gloss: "bread",            seen:  9, mastery: 3 },
  bello:    { lang: "Italian",  langColor: "#3e6534", ipa: "ˈbɛl.lo",    gloss: "beautiful",        seen:  6, mastery: 3 },
  libro:    { lang: "Italian",  langColor: "#3e6534", ipa: "ˈli.bɾo",    gloss: "book",             seen:  8, mastery: 3 },
  vino:     { lang: "Italian",  langColor: "#3e6534", ipa: "ˈvi.no",     gloss: "wine",             seen:  5, mastery: 2 },
  mela:     { lang: "Italian",  langColor: "#3e6534", ipa: "ˈme.la",     gloss: "apple",            seen:  4, mastery: 2 },
};

export function normPlant(p) {
  return {
    id: p.id,
    word: p.word,
    lang: p.lang,
    langColor: p.lang_color,
    x: p.x,
    y: p.y,
    stage: p.stage,
    plotId: p.plot_id,
    scale: p.scale,
    ipa: p.ipa || null,
    gloss: p.gloss || null,
    partOfSpeech: p.part_of_speech || null,
    exampleSentence: p.example_sentence || null,
    reactions: p.reactions || [],
    giftedBy: p.gifted_by || null,
    giftedByName: p.gifted_by_name || null,
  };
}

export async function fetchVocabulary(userId) {
  const params = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${BASE}/garden${params}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch garden");
  const plants = await res.json();
  return plants.map(normPlant);
}

export async function plantWord({ word, x, y, scale = 1.85 }) {
  const res = await fetch(`${BASE}/garden`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ word, x, y, scale }),
  });
  if (!res.ok) throw new Error("Failed to plant word");
  return normPlant(await res.json());
}

export async function advanceWordStage(plantId) {
  const res = await fetch(`${BASE}/garden/${plantId}/advance`, {
    method: "PATCH",
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Failed to advance word stage");
  return normPlant(await res.json());
}

export async function fetchQuiz() {
  const res = await fetch(`${BASE}/words/quiz`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch quiz");
  return res.json();
}

export async function fetchWordQuiz(word, stage = 0) {
  const res = await fetch(`${BASE}/words/quiz/${encodeURIComponent(word)}?stage=${stage}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to fetch word quiz");
  return res.json();
}

export async function fetchWordInfo(word) {
  if (WORD_INFO[word]) return WORD_INFO[word];
  const res = await fetch(`${BASE}/words/${encodeURIComponent(word)}`, {
    headers: authHeader(),
  });
  if (!res.ok) return null;
  const w = await res.json();
  return {
    lang: w.lang,
    langColor: w.lang_color,
    ipa: w.ipa,
    gloss: w.gloss,
    seen: w.seen,
    mastery: w.mastery,
  };
}
