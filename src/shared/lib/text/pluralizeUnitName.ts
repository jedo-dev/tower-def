/**
 * Head nouns whose plural the suffix rules get wrong. Keys are matched
 * case-sensitively against the capitalised word as authored in content.
 */
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  Militia: 'Militia',
  Tauren: 'Tauren',
  Shaman: 'Shamans',
  Footman: 'Footmen',
  Rifleman: 'Riflemen',
};

const OF_PHRASE_SEPARATOR = ' of ';
const SIBILANT_ENDING = /(s|sh|ch|x|z)$/;
const CONSONANT_Y_ENDING = /[^aeiou]y$/;

function pluralizeWord(word: string): string {
  const irregular = IRREGULAR_PLURALS[word];

  if (irregular !== undefined) {
    return irregular;
  }

  if (SIBILANT_ENDING.test(word)) {
    return `${word}es`;
  }

  if (CONSONANT_Y_ENDING.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }

  return `${word}s`;
}

function pluralizeLastWord(phrase: string): string {
  const lastSpaceIndex = phrase.lastIndexOf(' ');
  const modifiers = phrase.slice(0, lastSpaceIndex + 1);
  const headNoun = phrase.slice(lastSpaceIndex + 1);
  return `${modifiers}${pluralizeWord(headNoun)}`;
}

/**
 * Plural of an authored creature or tower name, for player-facing copy such as
 * "all Bone Archer Towers". The head noun is the last word, or the word before
 * an "of" phrase ("Druid of the Claw" -> "Druids of the Claw").
 */
export function pluralizeUnitName(name: string): string {
  const ofPhraseIndex = name.indexOf(OF_PHRASE_SEPARATOR);

  if (ofPhraseIndex === -1) {
    return pluralizeLastWord(name);
  }

  const head = name.slice(0, ofPhraseIndex);
  const ofPhrase = name.slice(ofPhraseIndex);
  return `${pluralizeLastWord(head)}${ofPhrase}`;
}
