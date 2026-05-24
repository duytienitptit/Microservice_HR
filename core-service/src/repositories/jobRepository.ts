import prisma from './prismaClient';
import { Prisma, JobStatus } from '@prisma/client';

export const jobRepository = {
  async create(data: Prisma.JobUncheckedCreateInput) {
    return prisma.job.create({ data });
  },

  async findAll(
    filters: { status?: JobStatus; hrId?: string },
    pagination: { skip: number; take: number }
  ) {
    const where: Prisma.JobWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.hrId) {
      where.hrId = filters.hrId;
    }

    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, total };
  },

  async findById(id: string) {
    return prisma.job.findUnique({ where: { id } });
  },

  async update(id: string, data: Prisma.JobUpdateInput) {
    return prisma.job.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.job.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
    });
  },
};
