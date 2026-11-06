import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP COLUMN "_verified";
  ALTER TABLE "customers" DROP COLUMN "_verificationtoken";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN "_verified" boolean;
  ALTER TABLE "customers" ADD COLUMN "_verificationtoken" varchar;`)
}
