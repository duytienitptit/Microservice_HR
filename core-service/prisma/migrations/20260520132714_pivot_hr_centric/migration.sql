/*
  Warnings:

  - You are about to drop the column `candidate_id` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[magic_link_token]` on the table `applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candidate_email,job_id]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'CV_PARSE_FAILED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'INVITED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'ARCHIVED';

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_candidate_id_fkey";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "candidate_id",
ADD COLUMN     "candidate_email" TEXT,
ADD COLUMN     "candidate_name" TEXT,
ADD COLUMN     "is_link_used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "magic_link_token" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE UNIQUE INDEX "applications_magic_link_token_key" ON "applications"("magic_link_token");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidate_email_job_id_key" ON "applications"("candidate_email", "job_id");
