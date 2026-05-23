export function describeCheckFailure(reason) {
  switch (reason) {
    case "too-short":
      return "Too short";
    case "invalid-word":
      return "Letters only";
    case "invalid-puzzle":
      return "Invalid puzzle";
    case "invalid-letters":
      return "Wrong letters";
    case "not-in-dictionary":
      return "Not in the list";
    default:
      return "Not valid";
  }
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
