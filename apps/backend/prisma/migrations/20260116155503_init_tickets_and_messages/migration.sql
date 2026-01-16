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
    "ticketId" INTEGER NOT NULL,
    "autotaskId" BIGINT NOT NULL,
    "sourceType" VARCHAR(20) NOT NULL,
    "messageType" VARCHAR(20) NOT NULL,
    "apiResourceId" BIGINT,
    "authorAutotaskContactId" BIGINT,
    "localUserId" INTEGER,
    "authorName" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_autotaskTicketId_key" ON "tickets"("autotaskTicketId");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_autotaskTicketId_idx" ON "tickets"("autotaskTicketId");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_idx" ON "ticket_messages"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_messages_localUserId_idx" ON "ticket_messages"("localUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_messages_autotaskId_sourceType_key" ON "ticket_messages"("autotaskId", "sourceType");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedResourceId_fkey" FOREIGN KEY ("assignedResourceId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_localUserId_fkey" FOREIGN KEY ("localUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
