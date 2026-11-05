import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_locales" ADD COLUMN "category" varchar;
  ALTER TABLE "_articles_v_locales" ADD COLUMN "version_category" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_locales" DROP COLUMN "category";
  ALTER TABLE "_articles_v_locales" DROP COLUMN "version_category";`)
}
