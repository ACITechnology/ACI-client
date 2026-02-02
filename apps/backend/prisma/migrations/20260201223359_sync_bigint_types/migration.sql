-- AlterTable
ALTER TABLE "ticket_messages" ALTER COLUMN "autotaskMessageId" SET DATA TYPE BIGINT,
ALTER COLUMN "autotaskTicketId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "authorName" TEXT;
