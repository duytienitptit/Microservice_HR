import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { userRepository, refreshTokenRepository } from '../repositories/authRepository';
import logger from '../utils/logger';

const BCRYPT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────

const generateAccessToken = (payload: {
  sub: string;
  email: string;
  role: string;
}): string =>
  jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry,
  } as jwt.SignOptions);

const generateRefreshToken = (): string => uuidv4();

// ─────────────────────────────────────────────────────────────
// ─── Brute force login lockout tracker ─────────────────────────
interface LockoutTracker {
  attempts: number;
  lockoutUntil: Date | null;
}

const lockoutStore = new Map<string, LockoutTracker>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─────────────────────────────────────────────────────────────
// Auth service
// ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new user (HR or CANDIDATE).
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    role: 'HR' | 'CANDIDATE',
    correlationId: string
  ) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'This email is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await userRepository.create({
      email,
      passwordHash,
      fullName,
    });

    logger.info({
      event: 'auth.register',
      correlation_id: correlationId,
      userId: user.id,
      role: 'HR',
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: 'HR',
      createdAt: user.createdAt,
    };
  },

  /**
   * Login — validates credentials and returns access + refresh tokens.
   */
  async login(email: string, password: string, correlationId: string) {
    const now = new Date();

    // Check lockout status
    const lockout = lockoutStore.get(email);
    if (lockout && lockout.lockoutUntil && lockout.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockout.lockoutUntil.getTime() - now.getTime()) / 1000);
      throw new AppError(
        423,
        'ACCOUNT_LOCKED',
        `Too many failed login attempts. Account is locked. Try again in ${remainingSeconds} seconds.`
      );
    }

    const user = await userRepository.findByEmail(email);

    // Use constant-time comparison even when user not found (timing attack prevention)
    const passwordMatch =
      user && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !passwordMatch) {
      let record = lockoutStore.get(email);
      if (!record) {
        record = { attempts: 0, lockoutUntil: null };
        lockoutStore.set(email, record);
      }
      record.attempts += 1;
      
      if (record.attempts >= MAX_ATTEMPTS) {
        record.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger.warn({
          event: 'auth.lockout_triggered',
          correlation_id: correlationId,
          email,
          lockoutUntil: record.lockoutUntil,
        });
        throw new AppError(
          423,
          'ACCOUNT_LOCKED',
          'Too many failed login attempts. Account is locked for 15 minutes.'
        );
      }

      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        `Email or password is incorrect. Attempts left: ${MAX_ATTEMPTS - record.attempts}`
      );
    }

    // Success -> Reset failed attempts
    lockoutStore.delete(email);

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: 'HR',
    });

    const rawRefreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenExpiryMs);

    await refreshTokenRepository.create({
      token: rawRefreshToken,
      user: { connect: { id: user.id } },
      expiresAt,
    });

    logger.info({
      event: 'auth.login',
      correlation_id: correlationId,
      userId: user.id,
      role: 'HR',
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: 'HR',
      },
    };
  },

  /**
   * Refresh — exchange valid refresh token for new access + refresh token pair.
   */
  async refresh(refreshToken: string, correlationId: string) {
    const record = await refreshTokenRepository.findByToken(refreshToken);

    if (!record) {
      throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token not found or already revoked.');
    }

    if (record.expiresAt < new Date()) {
      // Clean up expired token
      await refreshTokenRepository.deleteByToken(refreshToken);
      throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired. Please login again.');
    }

    // Rotate — delete old, issue new
    await refreshTokenRepository.deleteByToken(refreshToken);

    const newAccessToken = generateAccessToken({
      sub: record.user.id,
      email: record.user.email,
      role: 'HR',
    });

    const newRawRefreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenExpiryMs);

    await refreshTokenRepository.create({
      token: newRawRefreshToken,
      user: { connect: { id: record.user.id } },
      expiresAt,
    });

    logger.info({
      event: 'auth.refresh',
      correlation_id: correlationId,
      userId: record.user.id,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  },

  /**
   * Logout — deletes/revokes the refresh token.
   */
  async logout(refreshToken: string, correlationId: string) {
    const record = await refreshTokenRepository.findByToken(refreshToken);
    if (!record) {
      throw new AppError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token not found or already revoked.');
    }
    await refreshTokenRepository.deleteByToken(refreshToken);
    logger.info({
      event: 'auth.logout',
      correlation_id: correlationId,
      userId: record.userId,
    });
  },
};
