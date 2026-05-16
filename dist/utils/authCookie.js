"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
exports.getAuthCookieOptions = getAuthCookieOptions;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
exports.AUTH_COOKIE_NAME = "token";
function parseBoolean(value) {
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
function getAuthCookieOptions() {
    return {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };
}
function setAuthCookie(res, token) {
    res.cookie(exports.AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}
function clearAuthCookie(res) {
    const { maxAge: _maxAge, ...clearOptions } = getAuthCookieOptions();
    res.clearCookie(exports.AUTH_COOKIE_NAME, clearOptions);
}
