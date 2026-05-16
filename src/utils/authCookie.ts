import { CookieOptions, Response } from "express";

export const AUTH_COOKIE_NAME = "token";

function parseBoolean(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function shouldUseSecureCookie() {
  const explicitSecure = parseBoolean(process.env.COOKIE_SECURE);
  if (explicitSecure !== undefined) {
    return explicitSecure;
  }

  const frontendUrl = process.env.FRONTEND_URL || "";
  if (frontendUrl.startsWith("http://")) {
    return false;
  }

  return frontendUrl.startsWith("https://");
}

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
}
