-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "waMode" TEXT NOT NULL DEFAULT 'mock';

-- CreateTable
CREATE TABLE "WaSession" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaSession_key_key" ON "WaSession"("key");
