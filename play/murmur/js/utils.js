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

export function formatWord(word) {
  return word ? `${word[0].toUpperCase()}${word.slice(1)}` : "";
}

export function wordUsesEveryLetter(word, letters) {
  return [...new Set(letters)].every((letter) => word.includes(letter));
}

export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
