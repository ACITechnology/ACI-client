-- AlterTable
ALTER TABLE "users" ADD COLUMN     "companyId" INTEGER;

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "autotaskId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "contracts" JSONB,
    "mainContractName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_autotaskId_key" ON "companies"("autotaskId");

-- CreateIndex
CREATE INDEX "companies_nameNormalized_idx" ON "companies"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "companies_nameNormalized_key" ON "companies"("nameNormalized");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
