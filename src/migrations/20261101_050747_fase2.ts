import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payment_methods_type" AS ENUM('card', 'virtual_account', 'qris', 'ewallet');
  CREATE TYPE "public"."enum_discount_codes_type" AS ENUM('percent', 'fixed');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'refunded');
  CREATE TYPE "public"."enum_orders_lang" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_orders_loyverse_sync_status" AS ENUM('pending', 'done', 'failed');
  CREATE TYPE "public"."enum_orders_xero_status" AS ENUM('pending', 'done', 'failed');
  CREATE TYPE "public"."enum_stock_reservations_status" AS ENUM('active', 'committed', 'fulfilled', 'released');
  CREATE TYPE "public"."enum_returns_reason" AS ENUM('damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other');
  CREATE TYPE "public"."enum_returns_status" AS ENUM('requested', 'approved', 'rejected', 'received', 'refunded');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'handled');
  CREATE TYPE "public"."enum_wholesale_inquiries_status" AS ENUM('new', 'contacted', 'closed');
  CREATE TYPE "public"."enum_email_templates_key" AS ENUM('order-created', 'payment-received', 'shipped', 'cancelled', 'return-update', 'password-reset', 'verify-email', 'back-in-stock', 'newsletter-confirm', 'contact-received');
  CREATE TYPE "public"."enum_email_templates_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__email_templates_v_version_key" AS ENUM('order-created', 'payment-received', 'shipped', 'cancelled', 'return-update', 'password-reset', 'verify-email', 'back-in-stock', 'newsletter-confirm', 'contact-received');
  CREATE TYPE "public"."enum__email_templates_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__email_templates_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_ui_strings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__ui_strings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__ui_strings_v_published_locale" AS ENUM('en', 'id');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'expire-orders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'expire-orders';
  CREATE TABLE "customers_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar,
  	"phone" varchar NOT NULL,
  	"country" varchar DEFAULT 'Indonesia',
  	"street" varchar NOT NULL,
  	"address2" varchar,
  	"province" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"district" varchar NOT NULL,
  	"postal_code" varchar NOT NULL,
  	"is_default" boolean DEFAULT false
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"newsletter" boolean DEFAULT false,
  	"xero_contact_id" varchar,
  	"loyverse_customer_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "shipping_methods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"min_days" numeric NOT NULL,
  	"max_days" numeric NOT NULL,
  	"price" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_methods_locales" (
  	"eta_text" varchar,
  	"days_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payment_methods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"fee" numeric DEFAULT 0,
  	"type" "enum_payment_methods_type" NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_methods_locales" (
  	"name" varchar NOT NULL,
  	"detail" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "discount_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"type" "enum_discount_codes_type" DEFAULT 'percent' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_subtotal" numeric,
  	"max_uses" numeric,
  	"used_count" numeric DEFAULT 0,
  	"start_at" timestamp(3) with time zone,
  	"end_at" timestamp(3) with time zone,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "provinces" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"name" varchar NOT NULL,
  	"province_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "districts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"name" varchar NOT NULL,
  	"city_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"loyverse_variant_id" varchar,
  	"sku" varchar,
  	"slug" varchar,
  	"name" varchar NOT NULL,
  	"variant_label" varchar,
  	"variant_option" varchar,
  	"unit" varchar,
  	"image" varchar,
  	"unit_price" numeric NOT NULL,
  	"qty" numeric NOT NULL,
  	"tax" numeric
  );
  
  CREATE TABLE "orders_tracking_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"description" varchar
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"customer_id" integer,
  	"guest_token" varchar,
  	"idempotency_key" varchar,
  	"status" "enum_orders_status" DEFAULT 'awaiting_payment' NOT NULL,
  	"needs_refund" boolean DEFAULT false,
  	"lang" "enum_orders_lang" DEFAULT 'en',
  	"subtotal" numeric NOT NULL,
  	"discount" numeric DEFAULT 0,
  	"discount_code" varchar,
  	"shipping" numeric DEFAULT 0,
  	"shipping_id" varchar,
  	"shipping_name" varchar,
  	"payment_fee" numeric DEFAULT 0,
  	"tax" numeric DEFAULT 0,
  	"tax_included" boolean DEFAULT true,
  	"total" numeric NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"contact_newsletter" boolean DEFAULT false,
  	"address_first_name" varchar NOT NULL,
  	"address_last_name" varchar,
  	"address_phone" varchar NOT NULL,
  	"address_country" varchar DEFAULT 'Indonesia',
  	"address_street" varchar NOT NULL,
  	"address_address2" varchar,
  	"address_province" varchar NOT NULL,
  	"address_city" varchar NOT NULL,
  	"address_district" varchar NOT NULL,
  	"address_postal_code" varchar NOT NULL,
  	"note" varchar,
  	"payment_method_id" varchar,
  	"payment_provider" varchar,
  	"payment_provider_ref" varchar,
  	"payment_card_brand" varchar,
  	"payment_card_last4" varchar,
  	"payment_instructions" jsonb,
  	"payment_expires_at" timestamp(3) with time zone,
  	"payment_paid_at" timestamp(3) with time zone,
  	"tracking_carrier" varchar,
  	"tracking_number" varchar,
  	"tracking_url" varchar,
  	"loyverse_receipt_number" varchar,
  	"loyverse_receipt_id" varchar,
  	"loyverse_sync_status" "enum_orders_loyverse_sync_status",
  	"loyverse_last_error" varchar,
  	"loyverse_reserved_until" timestamp(3) with time zone,
  	"xero_invoice_id" varchar,
  	"xero_invoice_number" varchar,
  	"xero_invoice_url" varchar,
  	"xero_status" "enum_orders_xero_status",
  	"xero_payment_id" varchar,
  	"xero_credit_note_id" varchar,
  	"xero_last_error" varchar,
  	"emails_order_created_sent_at" timestamp(3) with time zone,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_reservations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"product_id" integer,
  	"variant_id" varchar NOT NULL,
  	"qty" numeric NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"status" "enum_stock_reservations_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "returns_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"name" varchar,
  	"qty" numeric NOT NULL
  );
  
  CREATE TABLE "returns_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer NOT NULL
  );
  
  CREATE TABLE "returns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"reason" "enum_returns_reason" NOT NULL,
  	"reason_text" varchar,
  	"status" "enum_returns_status" DEFAULT 'requested',
  	"refund_amount" numeric,
  	"internal_notes" varchar,
  	"xero_credit_note_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"customer_id" integer NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"status" "enum_reviews_status" DEFAULT 'pending',
  	"verified_purchase" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_alerts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" varchar,
  	"email" varchar NOT NULL,
  	"notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "newsletter_subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"confirm_token" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"subject" varchar,
  	"message" varchar NOT NULL,
  	"status" "enum_contact_messages_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wholesale_inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"volume" varchar,
  	"message" varchar,
  	"status" "enum_wholesale_inquiries_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "enum_email_templates_key",
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_email_templates_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "email_templates_locales" (
  	"subject" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_email_templates_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_key" "enum__email_templates_v_version_key",
  	"version_active" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__email_templates_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__email_templates_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_email_templates_v_locales" (
  	"version_subject" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "ui_strings_strings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "ui_strings_strings_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "ui_strings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_ui_strings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_ui_strings_v_version_strings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ui_strings_v_version_strings_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_ui_strings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__ui_strings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__ui_strings_v_published_locale",
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shipping_methods_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_methods_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "discount_codes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "provinces_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cities_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "districts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stock_reservations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "returns_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stock_alerts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "newsletter_subscribers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wholesale_inquiries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_templates_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "customers_addresses" ADD CONSTRAINT "customers_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_methods_locales" ADD CONSTRAINT "shipping_methods_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_methods_locales" ADD CONSTRAINT "payment_methods_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payment_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_tracking_events" ADD CONSTRAINT "orders_tracking_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "returns_items" ADD CONSTRAINT "returns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "returns_photos" ADD CONSTRAINT "returns_photos_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "returns_photos" ADD CONSTRAINT "returns_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_templates_locales" ADD CONSTRAINT "email_templates_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_email_templates_v" ADD CONSTRAINT "_email_templates_v_parent_id_email_templates_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_email_templates_v_locales" ADD CONSTRAINT "_email_templates_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_email_templates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ui_strings_strings" ADD CONSTRAINT "ui_strings_strings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ui_strings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ui_strings_strings_locales" ADD CONSTRAINT "ui_strings_strings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ui_strings_strings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ui_strings_v_version_strings" ADD CONSTRAINT "_ui_strings_v_version_strings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ui_strings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ui_strings_v_version_strings_locales" ADD CONSTRAINT "_ui_strings_v_version_strings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ui_strings_v_version_strings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "customers_addresses_order_idx" ON "customers_addresses" USING btree ("_order");
  CREATE INDEX "customers_addresses_parent_id_idx" ON "customers_addresses" USING btree ("_parent_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_products_id_idx" ON "customers_rels" USING btree ("products_id");
  CREATE UNIQUE INDEX "shipping_methods_slug_idx" ON "shipping_methods" USING btree ("slug");
  CREATE INDEX "shipping_methods_updated_at_idx" ON "shipping_methods" USING btree ("updated_at");
  CREATE INDEX "shipping_methods_created_at_idx" ON "shipping_methods" USING btree ("created_at");
  CREATE UNIQUE INDEX "shipping_methods_locales_locale_parent_id_unique" ON "shipping_methods_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shipping_methods_locales_parent_id_idx" ON "shipping_methods_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "payment_methods_slug_idx" ON "payment_methods" USING btree ("slug");
  CREATE INDEX "payment_methods_updated_at_idx" ON "payment_methods" USING btree ("updated_at");
  CREATE INDEX "payment_methods_created_at_idx" ON "payment_methods" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_methods_locales_locale_parent_id_unique" ON "payment_methods_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "payment_methods_locales_parent_id_idx" ON "payment_methods_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "discount_codes_code_idx" ON "discount_codes" USING btree ("code");
  CREATE INDEX "discount_codes_updated_at_idx" ON "discount_codes" USING btree ("updated_at");
  CREATE INDEX "discount_codes_created_at_idx" ON "discount_codes" USING btree ("created_at");
  CREATE UNIQUE INDEX "provinces_code_idx" ON "provinces" USING btree ("code");
  CREATE INDEX "provinces_updated_at_idx" ON "provinces" USING btree ("updated_at");
  CREATE INDEX "provinces_created_at_idx" ON "provinces" USING btree ("created_at");
  CREATE UNIQUE INDEX "cities_code_idx" ON "cities" USING btree ("code");
  CREATE INDEX "cities_province_idx" ON "cities" USING btree ("province_id");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE UNIQUE INDEX "districts_code_idx" ON "districts" USING btree ("code");
  CREATE INDEX "districts_city_idx" ON "districts" USING btree ("city_id");
  CREATE INDEX "districts_updated_at_idx" ON "districts" USING btree ("updated_at");
  CREATE INDEX "districts_created_at_idx" ON "districts" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_tracking_events_order_idx" ON "orders_tracking_events" USING btree ("_order");
  CREATE INDEX "orders_tracking_events_parent_id_idx" ON "orders_tracking_events" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_guest_token_idx" ON "orders" USING btree ("guest_token");
  CREATE UNIQUE INDEX "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_payment_payment_provider_ref_idx" ON "orders" USING btree ("payment_provider_ref");
  CREATE INDEX "orders_payment_payment_expires_at_idx" ON "orders" USING btree ("payment_expires_at");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "stock_reservations_order_idx" ON "stock_reservations" USING btree ("order_id");
  CREATE INDEX "stock_reservations_product_idx" ON "stock_reservations" USING btree ("product_id");
  CREATE INDEX "stock_reservations_variant_id_idx" ON "stock_reservations" USING btree ("variant_id");
  CREATE INDEX "stock_reservations_expires_at_idx" ON "stock_reservations" USING btree ("expires_at");
  CREATE INDEX "stock_reservations_status_idx" ON "stock_reservations" USING btree ("status");
  CREATE INDEX "stock_reservations_updated_at_idx" ON "stock_reservations" USING btree ("updated_at");
  CREATE INDEX "stock_reservations_created_at_idx" ON "stock_reservations" USING btree ("created_at");
  CREATE INDEX "returns_items_order_idx" ON "returns_items" USING btree ("_order");
  CREATE INDEX "returns_items_parent_id_idx" ON "returns_items" USING btree ("_parent_id");
  CREATE INDEX "returns_photos_order_idx" ON "returns_photos" USING btree ("_order");
  CREATE INDEX "returns_photos_parent_id_idx" ON "returns_photos" USING btree ("_parent_id");
  CREATE INDEX "returns_photos_photo_idx" ON "returns_photos" USING btree ("photo_id");
  CREATE INDEX "returns_order_idx" ON "returns" USING btree ("order_id");
  CREATE INDEX "returns_status_idx" ON "returns" USING btree ("status");
  CREATE INDEX "returns_updated_at_idx" ON "returns" USING btree ("updated_at");
  CREATE INDEX "returns_created_at_idx" ON "returns" USING btree ("created_at");
  CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");
  CREATE INDEX "reviews_customer_idx" ON "reviews" USING btree ("customer_id");
  CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "stock_alerts_product_idx" ON "stock_alerts" USING btree ("product_id");
  CREATE INDEX "stock_alerts_notified_at_idx" ON "stock_alerts" USING btree ("notified_at");
  CREATE INDEX "stock_alerts_updated_at_idx" ON "stock_alerts" USING btree ("updated_at");
  CREATE INDEX "stock_alerts_created_at_idx" ON "stock_alerts" USING btree ("created_at");
  CREATE UNIQUE INDEX "newsletter_subscribers_email_idx" ON "newsletter_subscribers" USING btree ("email");
  CREATE INDEX "newsletter_subscribers_confirm_token_idx" ON "newsletter_subscribers" USING btree ("confirm_token");
  CREATE INDEX "newsletter_subscribers_updated_at_idx" ON "newsletter_subscribers" USING btree ("updated_at");
  CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers" USING btree ("created_at");
  CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX "wholesale_inquiries_status_idx" ON "wholesale_inquiries" USING btree ("status");
  CREATE INDEX "wholesale_inquiries_updated_at_idx" ON "wholesale_inquiries" USING btree ("updated_at");
  CREATE INDEX "wholesale_inquiries_created_at_idx" ON "wholesale_inquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "email_templates_key_idx" ON "email_templates" USING btree ("key");
  CREATE INDEX "email_templates_updated_at_idx" ON "email_templates" USING btree ("updated_at");
  CREATE INDEX "email_templates_created_at_idx" ON "email_templates" USING btree ("created_at");
  CREATE INDEX "email_templates__status_idx" ON "email_templates" USING btree ("_status");
  CREATE UNIQUE INDEX "email_templates_locales_locale_parent_id_unique" ON "email_templates_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "email_templates_locales_parent_id_idx" ON "email_templates_locales" USING btree ("_parent_id");
  CREATE INDEX "_email_templates_v_parent_idx" ON "_email_templates_v" USING btree ("parent_id");
  CREATE INDEX "_email_templates_v_version_version_key_idx" ON "_email_templates_v" USING btree ("version_key");
  CREATE INDEX "_email_templates_v_version_version_updated_at_idx" ON "_email_templates_v" USING btree ("version_updated_at");
  CREATE INDEX "_email_templates_v_version_version_created_at_idx" ON "_email_templates_v" USING btree ("version_created_at");
  CREATE INDEX "_email_templates_v_version_version__status_idx" ON "_email_templates_v" USING btree ("version__status");
  CREATE INDEX "_email_templates_v_created_at_idx" ON "_email_templates_v" USING btree ("created_at");
  CREATE INDEX "_email_templates_v_updated_at_idx" ON "_email_templates_v" USING btree ("updated_at");
  CREATE INDEX "_email_templates_v_snapshot_idx" ON "_email_templates_v" USING btree ("snapshot");
  CREATE INDEX "_email_templates_v_published_locale_idx" ON "_email_templates_v" USING btree ("published_locale");
  CREATE INDEX "_email_templates_v_latest_idx" ON "_email_templates_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_email_templates_v_locales_locale_parent_id_unique" ON "_email_templates_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_email_templates_v_locales_parent_id_idx" ON "_email_templates_v_locales" USING btree ("_parent_id");
  CREATE INDEX "ui_strings_strings_order_idx" ON "ui_strings_strings" USING btree ("_order");
  CREATE INDEX "ui_strings_strings_parent_id_idx" ON "ui_strings_strings" USING btree ("_parent_id");
  CREATE INDEX "ui_strings_strings_key_idx" ON "ui_strings_strings" USING btree ("key");
  CREATE UNIQUE INDEX "ui_strings_strings_locales_locale_parent_id_unique" ON "ui_strings_strings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "ui_strings_strings_locales_parent_id_idx" ON "ui_strings_strings_locales" USING btree ("_parent_id");
  CREATE INDEX "ui_strings__status_idx" ON "ui_strings" USING btree ("_status");
  CREATE INDEX "_ui_strings_v_version_strings_order_idx" ON "_ui_strings_v_version_strings" USING btree ("_order");
  CREATE INDEX "_ui_strings_v_version_strings_parent_id_idx" ON "_ui_strings_v_version_strings" USING btree ("_parent_id");
  CREATE INDEX "_ui_strings_v_version_strings_key_idx" ON "_ui_strings_v_version_strings" USING btree ("key");
  CREATE UNIQUE INDEX "_ui_strings_v_version_strings_locales_locale_parent_id_uniqu" ON "_ui_strings_v_version_strings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_ui_strings_v_version_strings_locales_parent_id_idx" ON "_ui_strings_v_version_strings_locales" USING btree ("_parent_id");
  CREATE INDEX "_ui_strings_v_version_version__status_idx" ON "_ui_strings_v" USING btree ("version__status");
  CREATE INDEX "_ui_strings_v_created_at_idx" ON "_ui_strings_v" USING btree ("created_at");
  CREATE INDEX "_ui_strings_v_updated_at_idx" ON "_ui_strings_v" USING btree ("updated_at");
  CREATE INDEX "_ui_strings_v_snapshot_idx" ON "_ui_strings_v" USING btree ("snapshot");
  CREATE INDEX "_ui_strings_v_published_locale_idx" ON "_ui_strings_v" USING btree ("published_locale");
  CREATE INDEX "_ui_strings_v_latest_idx" ON "_ui_strings_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_methods_fk" FOREIGN KEY ("shipping_methods_id") REFERENCES "public"."shipping_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_methods_fk" FOREIGN KEY ("payment_methods_id") REFERENCES "public"."payment_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discount_codes_fk" FOREIGN KEY ("discount_codes_id") REFERENCES "public"."discount_codes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_provinces_fk" FOREIGN KEY ("provinces_id") REFERENCES "public"."provinces"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_districts_fk" FOREIGN KEY ("districts_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_reservations_fk" FOREIGN KEY ("stock_reservations_id") REFERENCES "public"."stock_reservations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_returns_fk" FOREIGN KEY ("returns_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_alerts_fk" FOREIGN KEY ("stock_alerts_id") REFERENCES "public"."stock_alerts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_subscribers_fk" FOREIGN KEY ("newsletter_subscribers_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wholesale_inquiries_fk" FOREIGN KEY ("wholesale_inquiries_id") REFERENCES "public"."wholesale_inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_templates_fk" FOREIGN KEY ("email_templates_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_methods_id");
  CREATE INDEX "payload_locked_documents_rels_payment_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_methods_id");
  CREATE INDEX "payload_locked_documents_rels_discount_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("discount_codes_id");
  CREATE INDEX "payload_locked_documents_rels_provinces_id_idx" ON "payload_locked_documents_rels" USING btree ("provinces_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_districts_id_idx" ON "payload_locked_documents_rels" USING btree ("districts_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_stock_reservations_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_reservations_id");
  CREATE INDEX "payload_locked_documents_rels_returns_id_idx" ON "payload_locked_documents_rels" USING btree ("returns_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_stock_alerts_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_alerts_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_wholesale_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("wholesale_inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_email_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("email_templates_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers_addresses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shipping_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shipping_methods_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_methods_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "discount_codes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "provinces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "districts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_tracking_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stock_reservations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "returns_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "returns_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "returns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stock_alerts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "newsletter_subscribers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "wholesale_inquiries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_templates_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_email_templates_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_email_templates_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ui_strings_strings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ui_strings_strings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ui_strings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ui_strings_v_version_strings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ui_strings_v_version_strings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_ui_strings_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "customers_addresses" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_rels" CASCADE;
  DROP TABLE "shipping_methods" CASCADE;
  DROP TABLE "shipping_methods_locales" CASCADE;
  DROP TABLE "payment_methods" CASCADE;
  DROP TABLE "payment_methods_locales" CASCADE;
  DROP TABLE "discount_codes" CASCADE;
  DROP TABLE "provinces" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "districts" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_tracking_events" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "stock_reservations" CASCADE;
  DROP TABLE "returns_items" CASCADE;
  DROP TABLE "returns_photos" CASCADE;
  DROP TABLE "returns" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "stock_alerts" CASCADE;
  DROP TABLE "newsletter_subscribers" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "wholesale_inquiries" CASCADE;
  DROP TABLE "email_templates" CASCADE;
  DROP TABLE "email_templates_locales" CASCADE;
  DROP TABLE "_email_templates_v" CASCADE;
  DROP TABLE "_email_templates_v_locales" CASCADE;
  DROP TABLE "ui_strings_strings" CASCADE;
  DROP TABLE "ui_strings_strings_locales" CASCADE;
  DROP TABLE "ui_strings" CASCADE;
  DROP TABLE "_ui_strings_v_version_strings" CASCADE;
  DROP TABLE "_ui_strings_v_version_strings_locales" CASCADE;
  DROP TABLE "_ui_strings_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shipping_methods_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_methods_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_discount_codes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_provinces_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cities_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_districts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stock_reservations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_returns_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reviews_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stock_alerts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_newsletter_subscribers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wholesale_inquiries_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_templates_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_customers_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'loyverse-sync');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'loyverse-sync');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX "payload_locked_documents_rels_shipping_methods_id_idx";
  DROP INDEX "payload_locked_documents_rels_payment_methods_id_idx";
  DROP INDEX "payload_locked_documents_rels_discount_codes_id_idx";
  DROP INDEX "payload_locked_documents_rels_provinces_id_idx";
  DROP INDEX "payload_locked_documents_rels_cities_id_idx";
  DROP INDEX "payload_locked_documents_rels_districts_id_idx";
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_stock_reservations_id_idx";
  DROP INDEX "payload_locked_documents_rels_returns_id_idx";
  DROP INDEX "payload_locked_documents_rels_reviews_id_idx";
  DROP INDEX "payload_locked_documents_rels_stock_alerts_id_idx";
  DROP INDEX "payload_locked_documents_rels_newsletter_subscribers_id_idx";
  DROP INDEX "payload_locked_documents_rels_contact_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_wholesale_inquiries_id_idx";
  DROP INDEX "payload_locked_documents_rels_email_templates_id_idx";
  DROP INDEX "payload_preferences_rels_customers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shipping_methods_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_methods_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "discount_codes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "provinces_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "districts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stock_reservations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "returns_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reviews_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stock_alerts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "newsletter_subscribers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "wholesale_inquiries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_templates_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "customers_id";
  DROP TYPE "public"."enum_payment_methods_type";
  DROP TYPE "public"."enum_discount_codes_type";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_lang";
  DROP TYPE "public"."enum_orders_loyverse_sync_status";
  DROP TYPE "public"."enum_orders_xero_status";
  DROP TYPE "public"."enum_stock_reservations_status";
  DROP TYPE "public"."enum_returns_reason";
  DROP TYPE "public"."enum_returns_status";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_wholesale_inquiries_status";
  DROP TYPE "public"."enum_email_templates_key";
  DROP TYPE "public"."enum_email_templates_status";
  DROP TYPE "public"."enum__email_templates_v_version_key";
  DROP TYPE "public"."enum__email_templates_v_version_status";
  DROP TYPE "public"."enum__email_templates_v_published_locale";
  DROP TYPE "public"."enum_ui_strings_status";
  DROP TYPE "public"."enum__ui_strings_v_version_status";
  DROP TYPE "public"."enum__ui_strings_v_published_locale";`)
}
