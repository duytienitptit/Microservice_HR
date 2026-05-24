// Set environment variables FIRST before any imports
import { userRepository, refreshTokenRepository } from '../../src/repositories/authRepository';
import { AppError } from '../../src/utils/AppError';

// Mock repositories so no real DB is needed
jest.mock('../../src/repositories/authRepository');
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Dynamic import after mocks are hoisted
import bcrypt from 'bcryptjs';
// Need to import authService after mocks
let authService: typeof import('../../src/services/authService')['authService'];

beforeAll(async () => {
  const mod = await import('../../src/services/authService');
  authService = mod.authService;
});

const MOCK_USER = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  fullName: 'Test User',
  role: 'CANDIDATE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authService.register', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a new user and returns safe user data', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (userRepository.create as jest.Mock).mockResolvedValue(MOCK_USER);

    const result = await authService.register(
      'test@example.com', 'password123', 'Test User', 'CANDIDATE', 'corr-1'
    );

    expect(result.email).toBe('test@example.com');
    expect(result).not.toHaveProperty('passwordHash');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
  });

  it('throws 409 if email already exists', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);

    await expect(
      authService.register('test@example.com', 'password123', 'Test User', 'CANDIDATE', 'corr-1')
    ).rejects.toThrow(AppError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});

describe('authService.login', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns tokens on valid credentials', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (refreshTokenRepository.create as jest.Mock).mockResolvedValue({});

    const result = await authService.login('test@example.com', 'password123', 'corr-1');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws 401 on wrong password', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login('test@example.com', 'wrongpassword', 'corr-1')
    ).rejects.toThrow(AppError);
  });

  it('throws 401 when user does not exist', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login('nobody@example.com', 'password123', 'corr-1')
    ).rejects.toThrow(AppError);
  });
});

describe('authService.refresh', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns new token pair on valid refresh token', async () => {
    const futureDate = new Date(Date.now() + 100_000);
    (refreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({
      token: 'valid-refresh',
      expiresAt: futureDate,
      user: MOCK_USER,
    });
    (refreshTokenRepository.deleteByToken as jest.Mock).mockResolvedValue({});
    (refreshTokenRepository.create as jest.Mock).mockResolvedValue({});

    const result = await authService.refresh('valid-refresh', 'corr-1');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(refreshTokenRepository.deleteByToken).toHaveBeenCalledWith('valid-refresh');
  });

  it('throws 401 for non-existent refresh token', async () => {
    (refreshTokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.refresh('invalid-token', 'corr-1')
    ).rejects.toThrow(AppError);
  });

  it('throws 401 for expired refresh token', async () => {
    const pastDate = new Date(Date.now() - 100_000);
    (refreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({
      token: 'expired-refresh',
      expiresAt: pastDate,
      user: MOCK_USER,
    });
    (refreshTokenRepository.deleteByToken as jest.Mock).mockResolvedValue({});

    await expect(
      authService.refresh('expired-refresh', 'corr-1')
    ).rejects.toThrow(AppError);
  });
});

describe('authService.lockout', () => {
  afterEach(() => jest.clearAllMocks());

  it('locks the account after 5 failed attempts', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(MOCK_USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong password

    const email = 'lockout-test@example.com';

    // 4 failed attempts should throw INVALID_CREDENTIALS
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login(email, 'wrongpass', 'corr-lockout')
      ).rejects.toThrow('Email or password is incorrect. Attempts left:');
    }

    // 5th failed attempt should trigger lockout (423 status)
    try {
      await authService.login(email, 'wrongpass', 'corr-lockout');
      fail('Should have thrown lockout error');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(423);
      expect(err.code).toBe('ACCOUNT_LOCKED');
    }

    // Subsequent attempts (even with correct password) should fail with ACCOUNT_LOCKED
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await expect(
      authService.login(email, 'correctpass', 'corr-lockout')
    ).rejects.toThrow('Too many failed login attempts');
  });
});

describe('authService.logout', () => {
  afterEach(() => jest.clearAllMocks());

  it('revokes refresh token on logout', async () => {
    (refreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({
      token: 'logout-refresh-token',
      userId: 'user-uuid-1',
    });
    (refreshTokenRepository.deleteByToken as jest.Mock).mockResolvedValue({});

    await authService.logout('logout-refresh-token', 'corr-logout');

    expect(refreshTokenRepository.deleteByToken).toHaveBeenCalledWith('logout-refresh-token');
  });

  it('throws 401 if refresh token is not found during logout', async () => {
    (refreshTokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.logout('unknown-refresh-token', 'corr-logout')
    ).rejects.toThrow(AppError);
  });
});
