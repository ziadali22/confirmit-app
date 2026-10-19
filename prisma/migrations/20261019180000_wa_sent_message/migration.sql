-- CreateTable
CREATE TABLE "WaSentMessage" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaSentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaSentMessage_createdAt_idx" ON "WaSentMessage"("createdAt");
