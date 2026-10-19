-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Store',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "mock" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT NOT NULL DEFAULT '',
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "appSecret" TEXT NOT NULL DEFAULT '',
    "verifyToken" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "optIn" BOOLEAN NOT NULL DEFAULT true,
    "optedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL DEFAULT '',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" TEXT NOT NULL DEFAULT 'received',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "lastWaMessageId" TEXT NOT NULL DEFAULT '',
    "nextActionAt" TIMESTAMP(3),
    "reminded" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Confirmation" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "providerMessageId" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "Confirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "header" TEXT NOT NULL DEFAULT 'Order Confirmation Required',
    "body" TEXT NOT NULL DEFAULT '',
    "sectionTitle" TEXT NOT NULL DEFAULT 'Order Confirmation',
    "buttonText" TEXT NOT NULL DEFAULT 'Select',

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageOption" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "orderTag" TEXT NOT NULL DEFAULT '',
    "responseMessage" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT 'custom',

    CONSTRAINT "MessageOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "phone" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "options" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "brandId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "messageId" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_brandId_phone_key" ON "Customer"("brandId", "phone");

-- CreateIndex
CREATE INDEX "Order_brandId_status_idx" ON "Order"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_brandId_key" ON "MessageTemplate"("brandId");

-- CreateIndex
CREATE INDEX "MessageLog_orderId_idx" ON "MessageLog"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_customerId_key" ON "CampaignRecipient"("campaignId", "customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Confirmation" ADD CONSTRAINT "Confirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageOption" ADD CONSTRAINT "MessageOption_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
