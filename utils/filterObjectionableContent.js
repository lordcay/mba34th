// utils/filterObjectionableContent.js
const badWords = [
  "fuck", "shit", "bitch", "asshole", "nigga", "nigger", "rape", "kill",
  "dick", "pussy", "cunt", "fag", "faggot", "slut", "whore", "bastard",
  "hate", "terrorist", "islamophobia", "homophobia", "bully", "suck",
  "damn", "idiot", "retard", "stupid"
];

export default function containsObjectionableContent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return badWords.some(word => lower.includes(word));
}
