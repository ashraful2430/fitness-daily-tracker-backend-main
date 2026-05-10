import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

const COOKIE_NAME = "token";

const authMessages = {
  registerMissingFields:
    "Name, email, and password are required. The signup form is not a guessing game.",
  registerEmailTaken:
    "That email is already taken. Someone got here first, dramatically.",
  registerSuccess:
    "Account created. Welcome aboard, productive chaos coordinator.",
  registerFailed:
    "Registration tripped over its own shoelaces. Try again in a moment.",
  loginMissingFields:
    "Email and password are required. Even the vault needs both halves of the spell.",
  invalidCredentials:
    "Invalid email or password. The door looked at that combo and said absolutely not.",
  loginSuccess:
    "Login successful. The dashboard missed your questionable decisions.",
  loginFailed:
    "Login failed backstage. The server is fixing its posture.",
  userNotFound:
    "User not found. Either the account vanished or it never made its grand entrance.",
  meFailed:
    "Could not fetch your profile. The mirror is being difficult.",
  logoutSuccess:
    "Logged out. Go touch grass, or at least pretend convincingly.",
} as const;

function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite: "none" | "lax" = isProduction ? "none" : "lax";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, getAuthCookieOptions());
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getDayDifference(from: Date, to: Date) {
  const fromDay = startOfDay(from).getTime();
  const toDay = startOfDay(to).getTime();

  return Math.round((toDay - fromDay) / (1000 * 60 * 60 * 24));
}

async function updateLoginStreak(user: IUser) {
  const now = new Date();

  if (!user.lastLoginDate) {
    user.loginStreak = 1;
    user.longestLoginStreak = 1;
    user.lastLoginDate = now;
    await user.save();
    return user;
  }

  const dayDifference = getDayDifference(user.lastLoginDate, now);

  if (dayDifference === 0) {
    if (!user.loginStreak || user.loginStreak < 1) {
      user.loginStreak = 1;
      user.longestLoginStreak = Math.max(user.longestLoginStreak || 0, 1);
      await user.save();
    }

    return user;
  }

  if (dayDifference === 1) {
    user.loginStreak = (user.loginStreak || 0) + 1;
  } else {
    user.loginStreak = 1;
  }

  user.longestLoginStreak = Math.max(
    user.longestLoginStreak || 0,
    user.loginStreak,
  );

  user.lastLoginDate = now;

  await user.save();
  return user;
}

function sanitizeUser(user: IUser) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginStreak: user.loginStreak || 0,
    longestLoginStreak: user.longestLoginStreak || 0,
    lastLoginDate: user.lastLoginDate || null,
  };
}

export async function register(req: AuthRequest, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: authMessages.registerMissingFields,
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: authMessages.registerEmailTaken,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      lastLoginDate: new Date(),
      loginStreak: 1,
      longestLoginStreak: 1,
    });

    const token = createToken(user._id.toString());
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: authMessages.registerSuccess,
      data: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: authMessages.registerFailed,
    });
  }
}

export async function login(req: AuthRequest, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: authMessages.loginMissingFields,
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: authMessages.invalidCredentials,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: authMessages.invalidCredentials,
      });
    }

    const updatedUser = await updateLoginStreak(user);
    const token = createToken(updatedUser._id.toString());

    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: authMessages.loginSuccess,
      data: sanitizeUser(updatedUser),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: authMessages.loginFailed,
    });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: authMessages.userNotFound,
      });
    }

    return res.json({
      success: true,
      data: sanitizeUser(user as IUser),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: authMessages.meFailed,
    });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  clearAuthCookie(res);

  return res.json({
    success: true,
    message: authMessages.logoutSuccess,
    data: null,
  });
}
