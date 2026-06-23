const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  return USERNAME_PATTERN.test(username);
}

export function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@ephemo.local`;
}
