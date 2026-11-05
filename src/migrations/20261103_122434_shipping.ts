import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_variant_weights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"weight_grams" numeric
  );
  
  CREATE TABLE "_products_v_version_variant_weights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"weight_grams" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "customers_addresses" ALTER COLUMN "province" DROP NOT NULL;
  ALTER TABLE "customers_addresses" ALTER COLUMN "district" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "address_province" DROP NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "address_district" DROP NOT NULL;
  ALTER TABLE "products" ADD COLUMN "customs_description" varchar;
  ALTER TABLE "products" ADD COLUMN "customs_hs_code" varchar;
  ALTER TABLE "products" ADD COLUMN "customs_country_of_origin" varchar DEFAULT 'ID';
  ALTER TABLE "_products_v" ADD COLUMN "version_customs_description" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_customs_hs_code" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_customs_country_of_origin" varchar DEFAULT 'ID';
  ALTER TABLE "integrations" ADD COLUMN "shipping_origin_name" varchar;
  ALTER TABLE "integrations" ADD COLUMN "shipping_origin_phone" varchar;
  ALTER TABLE "integrations" ADD COLUMN "shipping_origin_address" varchar;
  ALTER TABLE "integrations" ADD COLUMN "shipping_origin_postal_code" varchar;
  ALTER TABLE "integrations" ADD COLUMN "shipping_origin_area_id" varchar;
  ALTER TABLE "integrations" ADD COLUMN "shipping_couriers" varchar DEFAULT 'jne,sicepat,anteraja';
  ALTER TABLE "integrations" ADD COLUMN "shipping_packaging_grams" numeric DEFAULT 100;
  ALTER TABLE "integrations" ADD COLUMN "shipping_default_item_grams" numeric DEFAULT 250;
  ALTER TABLE "products_variant_weights" ADD CONSTRAINT "products_variant_weights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variant_weights" ADD CONSTRAINT "_products_v_version_variant_weights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_variant_weights_order_idx" ON "products_variant_weights" USING btree ("_order");
  CREATE INDEX "products_variant_weights_parent_id_idx" ON "products_variant_weights" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variant_weights_order_idx" ON "_products_v_version_variant_weights" USING btree ("_order");
  CREATE INDEX "_products_v_version_variant_weights_parent_id_idx" ON "_products_v_version_variant_weights" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_variant_weights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_variant_weights" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_variant_weights" CASCADE;
  DROP TABLE "_products_v_version_variant_weights" CASCADE;
  ALTER TABLE "customers_addresses" ALTER COLUMN "province" SET NOT NULL;
  ALTER TABLE "customers_addresses" ALTER COLUMN "district" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "address_province" SET NOT NULL;
  ALTER TABLE "orders" ALTER COLUMN "address_district" SET NOT NULL;
  ALTER TABLE "products" DROP COLUMN "customs_description";
  ALTER TABLE "products" DROP COLUMN "customs_hs_code";
  ALTER TABLE "products" DROP COLUMN "customs_country_of_origin";
  ALTER TABLE "_products_v" DROP COLUMN "version_customs_description";
  ALTER TABLE "_products_v" DROP COLUMN "version_customs_hs_code";
  ALTER TABLE "_products_v" DROP COLUMN "version_customs_country_of_origin";
  ALTER TABLE "integrations" DROP COLUMN "shipping_origin_name";
  ALTER TABLE "integrations" DROP COLUMN "shipping_origin_phone";
  ALTER TABLE "integrations" DROP COLUMN "shipping_origin_address";
  ALTER TABLE "integrations" DROP COLUMN "shipping_origin_postal_code";
  ALTER TABLE "integrations" DROP COLUMN "shipping_origin_area_id";
  ALTER TABLE "integrations" DROP COLUMN "shipping_couriers";
  ALTER TABLE "integrations" DROP COLUMN "shipping_packaging_grams";
  ALTER TABLE "integrations" DROP COLUMN "shipping_default_item_grams";`)
}
