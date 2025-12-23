/*
  Warnings:

  - You are about to drop the column `autotaskId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "autotaskId",
ADD COLUMN     "autotaskCompanyId" INTEGER,
ADD COLUMN     "autotaskContactId" INTEGER;
