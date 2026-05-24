import prisma from './prismaClient';
import { Prisma, ApplicationStatus } from '@prisma/client';

export const applicationRepository = {
  async create(data: Prisma.ApplicationUncheckedCreateInput) {
    return prisma.application.create({ data });
  },

  async findAll(
    filters: { jobId?: string; hrId?: string; status?: string },
    pagination: { skip: number; take: number }
  ) {
    const where: Prisma.ApplicationWhereInput = {};
    if (filters.jobId) {
      where.jobId = filters.jobId;
    }
    if (filters.hrId) {
      where.job = { hrId: filters.hrId };
    }
    if (filters.status) {
      where.status = filters.status as any;
    }

    const [applications, total] = await prisma.$transaction([
      prisma.application.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return { applications, total };
  },

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            hr: true,
          },
        },
      },
    });
  },

  async findByMagicLinkToken(token: string) {
    return prisma.application.findUnique({
      where: { magicLinkToken: token },
      include: {
        job: true,
      },
    });
  },

  async updateStatus(id: string, status: ApplicationStatus) {
    return prisma.application.update({
      where: { id },
      data: { status },
    });
  },

  async updateCandidateInfo(id: string, email?: string, name?: string) {
    const data: Prisma.ApplicationUpdateInput = {};
    if (email !== undefined) data.candidateEmail = email;
    if (name !== undefined) data.candidateName = name;
    return prisma.application.update({
      where: { id },
      data,
    });
  },

  async setMagicLinkToken(id: string, token: string) {
    return prisma.application.update({
      where: { id },
      data: {
        magicLinkToken: token,
      },
    });
  },

  async markLinkUsed(id: string) {
    return prisma.application.update({
      where: { id },
      data: { isLinkUsed: true },
    });
  },

  async updateCvFilePath(id: string, cvFilePath: string) {
    return prisma.application.update({
      where: { id },
      data: { cvFilePath },
    });
  },

  async findByCandidateAndJob(candidateEmail: string, jobId: string) {
    return prisma.application.findFirst({
      where: { candidateEmail, jobId },
      select: { id: true, status: true, candidateName: true, candidateEmail: true, createdAt: true },
    });
  },

  async delete(id: string) {
    return prisma.application.delete({ where: { id } });
  },
};
