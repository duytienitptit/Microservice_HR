import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { userRepository } from '../repositories/authRepository';
import { AppError } from '../utils/AppError';

const getCorrelationId = (req: Request): string =>
  req.headers['x-correlation-id'] as string ?? 'unknown';

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email, password, and fullName are required.');
    }

    if (password.length < 8) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters.');
    }

    const validRole = role === 'HR' ? 'HR' : 'CANDIDATE';
    const user = await authService.register(
      email,
      password,
      fullName,
      validRole,
      getCorrelationId(req)
    );

    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email and password are required.');
    }

    const result = await authService.login(email, password, getCorrelationId(req));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'refreshToken is required.');
    }

    const result = await authService.refresh(refreshToken, getCorrelationId(req));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated.');
    }
    const user = await userRepository.findById(req.user.sub);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: req.user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'VALIDATION_ERROR', 'refreshToken is required.');
    }

    await authService.logout(refreshToken, getCorrelationId(req));

    res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
  } catch (err) {
    next(err);
  }
};
