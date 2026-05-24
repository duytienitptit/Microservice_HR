import prisma from './prismaClient';
import { Prisma } from '@prisma/client';

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),
};

export const refreshTokenRepository = {
  create: (data: Prisma.RefreshTokenCreateInput) =>
    prisma.refreshToken.create({ data }),

  findByToken: (token: string) =>
    prisma.refreshToken.findUnique({ where: { token }, include: { user: true } }),

  deleteByToken: (token: string) =>
    prisma.refreshToken.delete({ where: { token } }),

  deleteAllByUserId: (userId: string) =>
    prisma.refreshToken.deleteMany({ where: { userId } }),
};
