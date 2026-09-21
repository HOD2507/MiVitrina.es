-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "stripeCheckoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripeCheckoutSessionId_key" ON "transactions"("stripeCheckoutSessionId");
