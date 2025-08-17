-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "ad_status" TEXT,
ADD COLUMN     "cta_url" TEXT,
ADD COLUMN     "date_range" TEXT,
ADD COLUMN     "end_date" TEXT,
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "start_date" TEXT;

-- CreateIndex
CREATE INDEX "assets_ad_status_idx" ON "assets"("ad_status");
