-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_resource_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "brands" (
    "fb_page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "cloudinary_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("fb_page_id")
);

-- CreateIndex
CREATE INDEX "brands_fb_page_id_idx" ON "brands"("fb_page_id");

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_fb_page_id_org_id_key" ON "brands"("fb_page_id", "org_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_fb_page_id_fkey" FOREIGN KEY ("fb_page_id") REFERENCES "brands"("fb_page_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
