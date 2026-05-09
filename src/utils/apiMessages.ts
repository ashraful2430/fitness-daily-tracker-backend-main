const pick = (messages: readonly string[], key: string) => {
  const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return messages[hash % messages.length];
};

const successMessages = {
  created: [
    "Done. Tiny win, big main-character energy.",
    "Saved. Future you just got a cleaner dashboard.",
    "Locked in. The system approves this productive behavior.",
  ],
  updated: [
    "Updated. We love a tidy little correction.",
    "Patched up. Much less suspicious now.",
    "Freshened up. Data had a quick shower.",
  ],
  deleted: [
    "Deleted. It has left the chat politely.",
    "Gone. No dramatic exit music needed.",
    "Removed. Clean slate, suspiciously satisfying.",
  ],
  fetched: [
    "Fetched. Receipts are on the table.",
    "Here you go. Data arrived with decent posture.",
    "Loaded. The numbers have reported for duty.",
  ],
} as const;

const errorMessages: Record<string, string> = {
  unauthorized: "Login first. The vault is not doing open mic night.",
  forbidden: "Nice try, but that data is not on your guest list.",
  invalidAmount: "Amount needs to be a positive number. Math said behave.",
  invalidDate: "That date is not valid. Calendar said nope.",
  missingId: "Missing id. I cannot delete a mystery object.",
  notFound: "Could not find it. Either it vanished or never existed.",
  categoryMissing: "Category is required. Even chaos needs a label.",
  categoryNotFound: "That category does not exist. Invent it first, spend later.",
  sourceMissing: "Source is required. Money does not spawn from vibes.",
  insufficientBalance: "Insufficient balance. Ambition is high, wallet is whispering.",
  server: "Something broke backstage. Try again in a moment.",
} as const;

export function successMessage(
  action: keyof typeof successMessages,
  key: string = action,
) {
  return pick(successMessages[action], key);
}

export function errorMessage(key: keyof typeof errorMessages) {
  return errorMessages[key];
}

export function friendlyError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("insufficient")) {
    return errorMessage("insufficientBalance");
  }
  if (normalized.includes("not found")) {
    return errorMessage("notFound");
  }
  if (normalized.includes("date")) {
    return errorMessage("invalidDate");
  }
  if (normalized.includes("amount")) {
    return message;
  }

  return message || errorMessage("server");
}
