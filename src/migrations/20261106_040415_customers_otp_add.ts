import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN "email_verified" boolean DEFAULT false;
  ALTER TABLE "customers" ADD COLUMN "otp_hash" varchar;
  ALTER TABLE "customers" ADD COLUMN "otp_expires_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "otp_sent_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "otp_attempts" numeric DEFAULT 0;
  -- Pelanggan yang sudah terverifikasi lewat tautan tetap terverifikasi.
  UPDATE "customers" SET "email_verified" = COALESCE("_verified", false);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP COLUMN "email_verified";
  ALTER TABLE "customers" DROP COLUMN "otp_hash";
  ALTER TABLE "customers" DROP COLUMN "otp_expires_at";
  ALTER TABLE "customers" DROP COLUMN "otp_sent_at";
  ALTER TABLE "customers" DROP COLUMN "otp_attempts";`)
}
