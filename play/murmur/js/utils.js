export function describeCheckFailure(reason) {
  switch (reason) {
    case "too-short":
      return "Words need at least four letters.";
    case "invalid-word":
      return "Use plain English letters only.";
    case "invalid-puzzle":
      return "This puzzle is invalid. Start a new one.";
    case "invalid-letters":
      return "That word uses letters outside the puzzle.";
    case "not-in-dictionary":
      return "That word is not in the dictionary.";
    default:
      return "That word is not valid.";
  }
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
