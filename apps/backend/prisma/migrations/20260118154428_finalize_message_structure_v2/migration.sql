/*
  Warnings:

  - You are about to drop the `Technician` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Technician";

-- CreateTable
CREATE TABLE "technicians" (
    "id" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "autotaskTicketId" BIGINT NOT NULL,
    "contactAutotaskId" BIGINT,
    "companyAutotaskId" BIGINT,
    "ticketNumber" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createDate" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL,
    "priority" INTEGER,
    "assignedResourceId" INTEGER,
    "assignedResourceName" TEXT,
    "lastActivityDate" TIMESTAMP(3),
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" SERIAL NOT NULL,
    "autotaskMessageId" INTEGER NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "autotaskTicketId" INTEGER NOT NULL,
    "apiResourceId" INTEGER,
    "authorAutotaskContactId" INTEGER,
    "localUserId" INTEGER,
    "authorName" TEXT,
    "userType" TEXT NOT NULL,
    "localTechnicianId" INTEGER,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technicians_id_key" ON "technicians"("id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_autotaskTicketId_key" ON "tickets"("autotaskTicketId");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_autotaskTicketId_idx" ON "tickets"("autotaskTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_messages_autotaskMessageId_sourceType_key" ON "ticket_messages"("autotaskMessageId", "sourceType");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedResourceId_fkey" FOREIGN KEY ("assignedResourceId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_localTechnicianId_fkey" FOREIGN KEY ("localTechnicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
