import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "loyverse_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"show_on_web" boolean DEFAULT false,
  	"web_category_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "loyverse_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"category_id" varchar,
  	"category_name" varchar,
  	"min_price" numeric,
  	"variant_count" numeric,
  	"show_on_web" boolean DEFAULT false,
  	"product_id" integer,
  	"missing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "loyverse_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "loyverse_items_id" integer;
  ALTER TABLE "loyverse_categories" ADD CONSTRAINT "loyverse_categories_web_category_id_product_categories_id_fk" FOREIGN KEY ("web_category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loyverse_items" ADD CONSTRAINT "loyverse_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "loyverse_categories_category_id_idx" ON "loyverse_categories" USING btree ("category_id");
  CREATE INDEX "loyverse_categories_show_on_web_idx" ON "loyverse_categories" USING btree ("show_on_web");
  CREATE INDEX "loyverse_categories_web_category_idx" ON "loyverse_categories" USING btree ("web_category_id");
  CREATE INDEX "loyverse_categories_updated_at_idx" ON "loyverse_categories" USING btree ("updated_at");
  CREATE INDEX "loyverse_categories_created_at_idx" ON "loyverse_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "loyverse_items_item_id_idx" ON "loyverse_items" USING btree ("item_id");
  CREATE INDEX "loyverse_items_category_id_idx" ON "loyverse_items" USING btree ("category_id");
  CREATE INDEX "loyverse_items_category_name_idx" ON "loyverse_items" USING btree ("category_name");
  CREATE INDEX "loyverse_items_show_on_web_idx" ON "loyverse_items" USING btree ("show_on_web");
  CREATE INDEX "loyverse_items_product_idx" ON "loyverse_items" USING btree ("product_id");
  CREATE INDEX "loyverse_items_updated_at_idx" ON "loyverse_items" USING btree ("updated_at");
  CREATE INDEX "loyverse_items_created_at_idx" ON "loyverse_items" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loyverse_categories_fk" FOREIGN KEY ("loyverse_categories_id") REFERENCES "public"."loyverse_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loyverse_items_fk" FOREIGN KEY ("loyverse_items_id") REFERENCES "public"."loyverse_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_loyverse_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("loyverse_categories_id");
  CREATE INDEX "payload_locked_documents_rels_loyverse_items_id_idx" ON "payload_locked_documents_rels" USING btree ("loyverse_items_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "loyverse_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "loyverse_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "loyverse_categories" CASCADE;
  DROP TABLE "loyverse_items" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_loyverse_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_loyverse_items_fk";
  
  DROP INDEX "payload_locked_documents_rels_loyverse_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_loyverse_items_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "loyverse_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "loyverse_items_id";`)
}
