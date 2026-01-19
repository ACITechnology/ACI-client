/*
  Warnings:

  - You are about to drop the column `localTechnicianId` on the `ticket_messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_localTechnicianId_fkey";

-- AlterTable
ALTER TABLE "ticket_messages" DROP COLUMN "localTechnicianId";

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_apiResourceId_fkey" FOREIGN KEY ("apiResourceId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
