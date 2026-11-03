import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'ops');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('ordering', 'shipping', 'payment', 'products', 'wholesale', 'other');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'loyverse-sync');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'loyverse-sync');
  CREATE TYPE "public"."enum_site_settings_socials_platform" AS ENUM('instagram', 'whatsapp', 'tiktok', 'facebook', 'youtube', 'x');
  CREATE TYPE "public"."enum_site_settings_analytics_provider" AS ENUM('none', 'ga4', 'plausible', 'umami');
  CREATE TYPE "public"."enum_site_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__site_settings_v_version_socials_platform" AS ENUM('instagram', 'whatsapp', 'tiktok', 'facebook', 'youtube', 'x');
  CREATE TYPE "public"."enum__site_settings_v_version_analytics_provider" AS ENUM('none', 'ga4', 'plausible', 'umami');
  CREATE TYPE "public"."enum__site_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__site_settings_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_announcement_tone" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_announcement_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__announcement_v_version_tone" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum__announcement_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__announcement_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_navigation_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navigation_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navigation_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_footer_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__footer_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__footer_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_home_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_about_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_gallery_items_size" AS ENUM('small', 'wide', 'tall', 'large');
  CREATE TYPE "public"."enum_gallery_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__gallery_v_version_items_size" AS ENUM('small', 'wide', 'tall', 'large');
  CREATE TYPE "public"."enum__gallery_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__gallery_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_news_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_page_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_faq_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_page_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_contact_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_page_v_published_locale" AS ENUM('en', 'id');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_full_url" varchar,
  	"sizes_full_width" numeric,
  	"sizes_full_height" numeric,
  	"sizes_full_mime_type" varchar,
  	"sizes_full_filesize" numeric,
  	"sizes_full_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "product_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"sector_image_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_categories_locales" (
  	"label" varchar NOT NULL,
  	"blurb" varchar,
  	"sector_badge" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_specs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "products_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "products_loyverse_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"sku" varchar,
  	"option_label" varchar,
  	"price" numeric,
  	"stock" numeric,
  	"sold_out" boolean
  );
  
  CREATE TABLE "products_variant_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "products_line_options_choices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "products_detail_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"score" numeric,
  	"loyverse_item_id" varchar,
  	"loyverse_active" boolean DEFAULT true,
  	"loyverse_price" numeric,
  	"loyverse_tax_included" boolean,
  	"loyverse_tax_rate" numeric,
  	"loyverse_sold_out" boolean,
  	"loyverse_low_stock" boolean,
  	"loyverse_synced_at" timestamp(3) with time zone,
  	"rating_avg" numeric,
  	"rating_count" numeric,
  	"image_id" integer,
  	"weight_grams" numeric,
  	"hidden" boolean DEFAULT false,
  	"is_new" boolean DEFAULT false,
  	"featured_rank" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_locales" (
  	"name" varchar,
  	"eyebrow" varchar,
  	"size" varchar,
  	"unit" varchar,
  	"line_options_label" varchar,
  	"detail_eyebrow" varchar,
  	"detail_summary" varchar,
  	"detail_caption" varchar,
  	"detail_tagline" varchar,
  	"detail_story" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "_products_v_version_specs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_loyverse_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"sku" varchar,
  	"option_label" varchar,
  	"price" numeric,
  	"stock" numeric,
  	"sold_out" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_variant_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_line_options_choices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_detail_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_score" numeric,
  	"version_loyverse_item_id" varchar,
  	"version_loyverse_active" boolean DEFAULT true,
  	"version_loyverse_price" numeric,
  	"version_loyverse_tax_included" boolean,
  	"version_loyverse_tax_rate" numeric,
  	"version_loyverse_sold_out" boolean,
  	"version_loyverse_low_stock" boolean,
  	"version_loyverse_synced_at" timestamp(3) with time zone,
  	"version_rating_avg" numeric,
  	"version_rating_count" numeric,
  	"version_image_id" integer,
  	"version_weight_grams" numeric,
  	"version_hidden" boolean DEFAULT false,
  	"version_is_new" boolean DEFAULT false,
  	"version_featured_rank" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__products_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_products_v_locales" (
  	"version_name" varchar,
  	"version_eyebrow" varchar,
  	"version_size" varchar,
  	"version_unit" varchar,
  	"version_line_options_label" varchar,
  	"version_detail_eyebrow" varchar,
  	"version_detail_summary" varchar,
  	"version_detail_caption" varchar,
  	"version_detail_tagline" varchar,
  	"version_detail_story" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "articles_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_featured" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_faqs_category" DEFAULT 'other',
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs_locales" (
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"articles_id" integer,
  	"pages_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"product_categories_id" integer,
  	"products_id" integer,
  	"articles_id" integer,
  	"pages_id" integer,
  	"faqs_id" integer,
  	"redirects_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "site_settings_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_socials_platform",
  	"url" varchar
  );
  
  CREATE TABLE "site_settings_opening_hours_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"days" varchar,
  	"hours" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'sregcoffee',
  	"logo_id" integer,
  	"favicon_id" integer,
  	"instagram_handle" varchar DEFAULT '@sregcoffee',
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"contact_whatsapp" varchar,
  	"coordinates_lat" numeric,
  	"coordinates_lng" numeric,
  	"seo_defaults_image_id" integer,
  	"analytics_provider" "enum_site_settings_analytics_provider" DEFAULT 'none',
  	"analytics_measurement_id" varchar,
  	"cookie_banner_enabled" boolean DEFAULT false,
  	"cookie_banner_policy_link" varchar,
  	"free_shipping_enabled" boolean DEFAULT false,
  	"free_shipping_threshold" numeric,
  	"_status" "enum_site_settings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"tagline" varchar DEFAULT 'Made for everyday grind',
  	"address" varchar,
  	"opening_hours_summary" varchar,
  	"wholesale_note" varchar,
  	"copyright" varchar,
  	"seo_defaults_title" varchar,
  	"seo_defaults_description" varchar,
  	"cookie_banner_text" varchar,
  	"cookie_banner_accept_label" varchar,
  	"cookie_banner_decline_label" varchar,
  	"tax_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v_version_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__site_settings_v_version_socials_platform",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v_version_opening_hours_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"days" varchar,
  	"hours" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_site_name" varchar DEFAULT 'sregcoffee',
  	"version_logo_id" integer,
  	"version_favicon_id" integer,
  	"version_instagram_handle" varchar DEFAULT '@sregcoffee',
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_contact_whatsapp" varchar,
  	"version_coordinates_lat" numeric,
  	"version_coordinates_lng" numeric,
  	"version_seo_defaults_image_id" integer,
  	"version_analytics_provider" "enum__site_settings_v_version_analytics_provider" DEFAULT 'none',
  	"version_analytics_measurement_id" varchar,
  	"version_cookie_banner_enabled" boolean DEFAULT false,
  	"version_cookie_banner_policy_link" varchar,
  	"version_free_shipping_enabled" boolean DEFAULT false,
  	"version_free_shipping_threshold" numeric,
  	"version__status" "enum__site_settings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__site_settings_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_site_settings_v_locales" (
  	"version_tagline" varchar DEFAULT 'Made for everyday grind',
  	"version_address" varchar,
  	"version_opening_hours_summary" varchar,
  	"version_wholesale_note" varchar,
  	"version_copyright" varchar,
  	"version_seo_defaults_title" varchar,
  	"version_seo_defaults_description" varchar,
  	"version_cookie_banner_text" varchar,
  	"version_cookie_banner_accept_label" varchar,
  	"version_cookie_banner_decline_label" varchar,
  	"version_tax_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "announcement" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"cta_link" varchar,
  	"tone" "enum_announcement_tone" DEFAULT 'dark',
  	"start_at" timestamp(3) with time zone,
  	"end_at" timestamp(3) with time zone,
  	"_status" "enum_announcement_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "announcement_locales" (
  	"text" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_announcement_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_enabled" boolean DEFAULT false,
  	"version_cta_link" varchar,
  	"version_tone" "enum__announcement_v_version_tone" DEFAULT 'dark',
  	"version_start_at" timestamp(3) with time zone,
  	"version_end_at" timestamp(3) with time zone,
  	"version__status" "enum__announcement_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__announcement_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_announcement_v_locales" (
  	"version_text" varchar,
  	"version_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "navigation_main" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "navigation_main_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "navigation_footer_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_info_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "navigation_info_columns_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_info_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "navigation_info_columns_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_navigation_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_navigation_v_version_main" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_main_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_footer_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_info_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_info_columns_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v_version_info_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navigation_v_version_info_columns_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navigation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__navigation_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__navigation_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"_status" "enum_footer_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_locales" (
  	"slogan" varchar,
  	"marquee_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_logo_id" integer,
  	"version__status" "enum__footer_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__footer_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_footer_v_locales" (
  	"version_slogan" varchar,
  	"version_marquee_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "home_sector_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer
  );
  
  CREATE TABLE "home_sector_columns_locales" (
  	"badge" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_enabled" boolean DEFAULT true,
  	"hero_background_id" integer,
  	"hero_mark_id" integer,
  	"hero_chat_enabled" boolean DEFAULT false,
  	"hero_chat_href" varchar,
  	"sector_enabled" boolean DEFAULT true,
  	"featured_enabled" boolean DEFAULT true,
  	"featured_cta_href" varchar,
  	"roots_enabled" boolean DEFAULT true,
  	"roots_photo_id" integer,
  	"places_map_id" integer,
  	"places_shop_id" integer,
  	"_status" "enum_home_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_locales" (
  	"hero_intro" varchar,
  	"hero_chat_label" varchar,
  	"sector_title" varchar DEFAULT 'SECTOR SELECTION',
  	"featured_title" varchar,
  	"featured_subtitle" varchar,
  	"featured_cta_label" varchar,
  	"roots_title" varchar DEFAULT 'Our Roots',
  	"roots_lead" varchar,
  	"roots_body" varchar,
  	"roots_visit_title" varchar,
  	"roots_visit_address" varchar,
  	"roots_visit_hours" varchar,
  	"roots_visit_open_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "_home_v_version_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_v_version_sector_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_v_version_sector_columns_locales" (
  	"badge" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_enabled" boolean DEFAULT true,
  	"version_hero_background_id" integer,
  	"version_hero_mark_id" integer,
  	"version_hero_chat_enabled" boolean DEFAULT false,
  	"version_hero_chat_href" varchar,
  	"version_sector_enabled" boolean DEFAULT true,
  	"version_featured_enabled" boolean DEFAULT true,
  	"version_featured_cta_href" varchar,
  	"version_roots_enabled" boolean DEFAULT true,
  	"version_roots_photo_id" integer,
  	"version_places_map_id" integer,
  	"version_places_shop_id" integer,
  	"version__status" "enum__home_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_v_locales" (
  	"version_hero_intro" varchar,
  	"version_hero_chat_label" varchar,
  	"version_sector_title" varchar DEFAULT 'SECTOR SELECTION',
  	"version_featured_title" varchar,
  	"version_featured_subtitle" varchar,
  	"version_featured_cta_label" varchar,
  	"version_roots_title" varchar DEFAULT 'Our Roots',
  	"version_roots_lead" varchar,
  	"version_roots_body" varchar,
  	"version_roots_visit_title" varchar,
  	"version_roots_visit_address" varchar,
  	"version_roots_visit_hours" varchar,
  	"version_roots_visit_open_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "about_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"masthead_background_id" integer,
  	"band_image_id" integer,
  	"show_featured" boolean DEFAULT true,
  	"_status" "enum_about_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_locales" (
  	"masthead_title" varchar DEFAULT 'ABOUT',
  	"intro_heading" varchar,
  	"intro_subheading" varchar,
  	"intro_body" varchar,
  	"story_title" varchar DEFAULT 'OUR STORY',
  	"story_body" varchar,
  	"philosophy_title" varchar DEFAULT 'OUR PHILOSOPHY',
  	"philosophy_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_masthead_background_id" integer,
  	"version_band_image_id" integer,
  	"version_show_featured" boolean DEFAULT true,
  	"version__status" "enum__about_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__about_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_about_v_locales" (
  	"version_masthead_title" varchar DEFAULT 'ABOUT',
  	"version_intro_heading" varchar,
  	"version_intro_subheading" varchar,
  	"version_intro_body" varchar,
  	"version_story_title" varchar DEFAULT 'OUR STORY',
  	"version_story_body" varchar,
  	"version_philosophy_title" varchar DEFAULT 'OUR PHILOSOPHY',
  	"version_philosophy_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gallery_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"size" "enum_gallery_items_size" DEFAULT 'small'
  );
  
  CREATE TABLE "gallery" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_gallery_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "gallery_locales" (
  	"title" varchar DEFAULT 'GALLERY',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_gallery_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"size" "enum__gallery_v_version_items_size" DEFAULT 'small',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gallery_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__gallery_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__gallery_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_gallery_v_locales" (
  	"version_title" varchar DEFAULT 'GALLERY',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "news_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"headline_id" integer,
  	"_status" "enum_news_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "news_page_locales" (
  	"title" varchar DEFAULT 'NEWS',
  	"headline_bar_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "news_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "_news_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_headline_id" integer,
  	"version__status" "enum__news_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__news_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_news_page_v_locales" (
  	"version_title" varchar DEFAULT 'NEWS',
  	"version_headline_bar_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_news_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "faq_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_faq_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "faq_page_locales" (
  	"title" varchar DEFAULT 'FAQ',
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faq_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__faq_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__faq_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_faq_page_v_locales" (
  	"version_title" varchar DEFAULT 'FAQ',
  	"version_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_map" boolean DEFAULT true,
  	"show_form" boolean DEFAULT true,
  	"_status" "enum_contact_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_page_locales" (
  	"title" varchar DEFAULT 'CONTACTS',
  	"intro" varchar,
  	"form_success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_contact_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_show_map" boolean DEFAULT true,
  	"version_show_form" boolean DEFAULT true,
  	"version__status" "enum__contact_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__contact_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_contact_page_v_locales" (
  	"version_title" varchar DEFAULT 'CONTACTS',
  	"version_intro" varchar,
  	"version_form_success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "integrations_loyverse_unprofiled" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "integrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"loyverse_store_id" varchar,
  	"loyverse_payment_type_id" varchar,
  	"loyverse_low_stock_threshold" numeric DEFAULT 5,
  	"loyverse_last_full_sync_at" timestamp(3) with time zone,
  	"loyverse_last_error" varchar,
  	"loyverse_last_summary" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_sector_image_id_media_id_fk" FOREIGN KEY ("sector_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_categories_locales" ADD CONSTRAINT "product_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_specs" ADD CONSTRAINT "products_specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_notes" ADD CONSTRAINT "products_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_loyverse_variants" ADD CONSTRAINT "products_loyverse_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variant_labels" ADD CONSTRAINT "products_variant_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_line_options_choices" ADD CONSTRAINT "products_line_options_choices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_detail_facts" ADD CONSTRAINT "products_detail_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_specs" ADD CONSTRAINT "_products_v_version_specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_notes" ADD CONSTRAINT "_products_v_version_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_loyverse_variants" ADD CONSTRAINT "_products_v_version_loyverse_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variant_labels" ADD CONSTRAINT "_products_v_version_variant_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_line_options_choices" ADD CONSTRAINT "_products_v_version_line_options_choices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_detail_facts" ADD CONSTRAINT "_products_v_version_detail_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_product_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_tags" ADD CONSTRAINT "articles_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_tags" ADD CONSTRAINT "_articles_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faqs_locales" ADD CONSTRAINT "faqs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_ticker" ADD CONSTRAINT "site_settings_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_socials" ADD CONSTRAINT "site_settings_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_opening_hours_items" ADD CONSTRAINT "site_settings_opening_hours_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_defaults_image_id_media_id_fk" FOREIGN KEY ("seo_defaults_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_ticker" ADD CONSTRAINT "_site_settings_v_version_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_socials" ADD CONSTRAINT "_site_settings_v_version_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_opening_hours_items" ADD CONSTRAINT "_site_settings_v_version_opening_hours_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_favicon_id_media_id_fk" FOREIGN KEY ("version_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_seo_defaults_image_id_media_id_fk" FOREIGN KEY ("version_seo_defaults_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcement_locales" ADD CONSTRAINT "announcement_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcement_v_locales" ADD CONSTRAINT "_announcement_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_announcement_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main" ADD CONSTRAINT "navigation_main_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main_locales" ADD CONSTRAINT "navigation_main_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_main"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_links" ADD CONSTRAINT "navigation_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_links_locales" ADD CONSTRAINT "navigation_footer_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_info_columns_links" ADD CONSTRAINT "navigation_info_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_info_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_info_columns_links_locales" ADD CONSTRAINT "navigation_info_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_info_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_info_columns" ADD CONSTRAINT "navigation_info_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_info_columns_locales" ADD CONSTRAINT "navigation_info_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_info_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_main" ADD CONSTRAINT "_navigation_v_version_main_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_main_locales" ADD CONSTRAINT "_navigation_v_version_main_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_main"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_links" ADD CONSTRAINT "_navigation_v_version_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_links_locales" ADD CONSTRAINT "_navigation_v_version_footer_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_footer_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_info_columns_links" ADD CONSTRAINT "_navigation_v_version_info_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_info_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_info_columns_links_locales" ADD CONSTRAINT "_navigation_v_version_info_columns_links_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_info_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_info_columns" ADD CONSTRAINT "_navigation_v_version_info_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_info_columns_locales" ADD CONSTRAINT "_navigation_v_version_info_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_info_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v" ADD CONSTRAINT "_footer_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_locales" ADD CONSTRAINT "_footer_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_hero_stats" ADD CONSTRAINT "home_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_sector_columns" ADD CONSTRAINT "home_sector_columns_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_sector_columns" ADD CONSTRAINT "home_sector_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_sector_columns_locales" ADD CONSTRAINT "home_sector_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_sector_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_background_id_media_id_fk" FOREIGN KEY ("hero_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_mark_id_media_id_fk" FOREIGN KEY ("hero_mark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_roots_photo_id_media_id_fk" FOREIGN KEY ("roots_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_places_map_id_media_id_fk" FOREIGN KEY ("places_map_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_places_shop_id_media_id_fk" FOREIGN KEY ("places_shop_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_locales" ADD CONSTRAINT "home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_hero_stats" ADD CONSTRAINT "_home_v_version_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_sector_columns" ADD CONSTRAINT "_home_v_version_sector_columns_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_version_sector_columns" ADD CONSTRAINT "_home_v_version_sector_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_sector_columns_locales" ADD CONSTRAINT "_home_v_version_sector_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v_version_sector_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_background_id_media_id_fk" FOREIGN KEY ("version_hero_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_mark_id_media_id_fk" FOREIGN KEY ("version_hero_mark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_roots_photo_id_media_id_fk" FOREIGN KEY ("version_roots_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_places_map_id_media_id_fk" FOREIGN KEY ("version_places_map_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_places_shop_id_media_id_fk" FOREIGN KEY ("version_places_shop_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_locales" ADD CONSTRAINT "_home_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_rels" ADD CONSTRAINT "_home_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_rels" ADD CONSTRAINT "_home_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_photos" ADD CONSTRAINT "about_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_photos" ADD CONSTRAINT "about_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_masthead_background_id_media_id_fk" FOREIGN KEY ("masthead_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_band_image_id_media_id_fk" FOREIGN KEY ("band_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_locales" ADD CONSTRAINT "about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_photos" ADD CONSTRAINT "_about_v_version_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_photos" ADD CONSTRAINT "_about_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_masthead_background_id_media_id_fk" FOREIGN KEY ("version_masthead_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_band_image_id_media_id_fk" FOREIGN KEY ("version_band_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_locales" ADD CONSTRAINT "_about_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gallery_locales" ADD CONSTRAINT "gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gallery_v_version_items" ADD CONSTRAINT "_gallery_v_version_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gallery_v_version_items" ADD CONSTRAINT "_gallery_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gallery_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gallery_v_locales" ADD CONSTRAINT "_gallery_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gallery_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_page" ADD CONSTRAINT "news_page_headline_id_articles_id_fk" FOREIGN KEY ("headline_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_page_locales" ADD CONSTRAINT "news_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_page_rels" ADD CONSTRAINT "news_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_page_rels" ADD CONSTRAINT "news_page_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_page_v" ADD CONSTRAINT "_news_page_v_version_headline_id_articles_id_fk" FOREIGN KEY ("version_headline_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_page_v_locales" ADD CONSTRAINT "_news_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_page_v_rels" ADD CONSTRAINT "_news_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_news_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_page_v_rels" ADD CONSTRAINT "_news_page_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_page_locales" ADD CONSTRAINT "faq_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_page_v_locales" ADD CONSTRAINT "_faq_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_page_locales" ADD CONSTRAINT "contact_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_page_v_locales" ADD CONSTRAINT "_contact_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "integrations_loyverse_unprofiled" ADD CONSTRAINT "integrations_loyverse_unprofiled_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_full_sizes_full_filename_idx" ON "media" USING btree ("sizes_full_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "product_categories_slug_idx" ON "product_categories" USING btree ("slug");
  CREATE INDEX "product_categories_sector_image_idx" ON "product_categories" USING btree ("sector_image_id");
  CREATE INDEX "product_categories_updated_at_idx" ON "product_categories" USING btree ("updated_at");
  CREATE INDEX "product_categories_created_at_idx" ON "product_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_categories_locales_locale_parent_id_unique" ON "product_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "product_categories_locales_parent_id_idx" ON "product_categories_locales" USING btree ("_parent_id");
  CREATE INDEX "products_specs_order_idx" ON "products_specs" USING btree ("_order");
  CREATE INDEX "products_specs_parent_id_idx" ON "products_specs" USING btree ("_parent_id");
  CREATE INDEX "products_specs_locale_idx" ON "products_specs" USING btree ("_locale");
  CREATE INDEX "products_notes_order_idx" ON "products_notes" USING btree ("_order");
  CREATE INDEX "products_notes_parent_id_idx" ON "products_notes" USING btree ("_parent_id");
  CREATE INDEX "products_notes_locale_idx" ON "products_notes" USING btree ("_locale");
  CREATE INDEX "products_loyverse_variants_order_idx" ON "products_loyverse_variants" USING btree ("_order");
  CREATE INDEX "products_loyverse_variants_parent_id_idx" ON "products_loyverse_variants" USING btree ("_parent_id");
  CREATE INDEX "products_variant_labels_order_idx" ON "products_variant_labels" USING btree ("_order");
  CREATE INDEX "products_variant_labels_parent_id_idx" ON "products_variant_labels" USING btree ("_parent_id");
  CREATE INDEX "products_variant_labels_locale_idx" ON "products_variant_labels" USING btree ("_locale");
  CREATE INDEX "products_line_options_choices_order_idx" ON "products_line_options_choices" USING btree ("_order");
  CREATE INDEX "products_line_options_choices_parent_id_idx" ON "products_line_options_choices" USING btree ("_parent_id");
  CREATE INDEX "products_line_options_choices_locale_idx" ON "products_line_options_choices" USING btree ("_locale");
  CREATE INDEX "products_detail_facts_order_idx" ON "products_detail_facts" USING btree ("_order");
  CREATE INDEX "products_detail_facts_parent_id_idx" ON "products_detail_facts" USING btree ("_parent_id");
  CREATE INDEX "products_detail_facts_locale_idx" ON "products_detail_facts" USING btree ("_locale");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE UNIQUE INDEX "products_loyverse_loyverse_item_id_idx" ON "products" USING btree ("loyverse_item_id");
  CREATE INDEX "products_image_idx" ON "products" USING btree ("image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_meta_meta_image_idx" ON "products_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_locales_parent_id_idx" ON "products_locales" USING btree ("_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "_products_v_version_specs_order_idx" ON "_products_v_version_specs" USING btree ("_order");
  CREATE INDEX "_products_v_version_specs_parent_id_idx" ON "_products_v_version_specs" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_specs_locale_idx" ON "_products_v_version_specs" USING btree ("_locale");
  CREATE INDEX "_products_v_version_notes_order_idx" ON "_products_v_version_notes" USING btree ("_order");
  CREATE INDEX "_products_v_version_notes_parent_id_idx" ON "_products_v_version_notes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_notes_locale_idx" ON "_products_v_version_notes" USING btree ("_locale");
  CREATE INDEX "_products_v_version_loyverse_variants_order_idx" ON "_products_v_version_loyverse_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_loyverse_variants_parent_id_idx" ON "_products_v_version_loyverse_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variant_labels_order_idx" ON "_products_v_version_variant_labels" USING btree ("_order");
  CREATE INDEX "_products_v_version_variant_labels_parent_id_idx" ON "_products_v_version_variant_labels" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variant_labels_locale_idx" ON "_products_v_version_variant_labels" USING btree ("_locale");
  CREATE INDEX "_products_v_version_line_options_choices_order_idx" ON "_products_v_version_line_options_choices" USING btree ("_order");
  CREATE INDEX "_products_v_version_line_options_choices_parent_id_idx" ON "_products_v_version_line_options_choices" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_line_options_choices_locale_idx" ON "_products_v_version_line_options_choices" USING btree ("_locale");
  CREATE INDEX "_products_v_version_detail_facts_order_idx" ON "_products_v_version_detail_facts" USING btree ("_order");
  CREATE INDEX "_products_v_version_detail_facts_parent_id_idx" ON "_products_v_version_detail_facts" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_detail_facts_locale_idx" ON "_products_v_version_detail_facts" USING btree ("_locale");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_loyverse_version_loyverse_item_id_idx" ON "_products_v" USING btree ("version_loyverse_item_id");
  CREATE INDEX "_products_v_version_version_image_idx" ON "_products_v" USING btree ("version_image_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_version_meta_version_meta_image_idx" ON "_products_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_locales_parent_id_idx" ON "_products_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");
  CREATE INDEX "articles_tags_order_idx" ON "articles_tags" USING btree ("_order");
  CREATE INDEX "articles_tags_parent_id_idx" ON "articles_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_image_idx" ON "articles" USING btree ("image_id");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_meta_meta_image_idx" ON "articles_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articles_locales_parent_id_idx" ON "articles_locales" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_tags_order_idx" ON "_articles_v_version_tags" USING btree ("_order");
  CREATE INDEX "_articles_v_version_tags_parent_id_idx" ON "_articles_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_image_idx" ON "_articles_v" USING btree ("version_image_id");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_version_meta_version_meta_image_idx" ON "_articles_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_locales_parent_id_idx" ON "_articles_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_locales_parent_id_idx" ON "pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_locales_parent_id_idx" ON "_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE UNIQUE INDEX "faqs_locales_locale_parent_id_unique" ON "faqs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faqs_locales_parent_id_idx" ON "faqs_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_products_id_idx" ON "redirects_rels" USING btree ("products_id");
  CREATE INDEX "redirects_rels_articles_id_idx" ON "redirects_rels" USING btree ("articles_id");
  CREATE INDEX "redirects_rels_pages_id_idx" ON "redirects_rels" USING btree ("pages_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_product_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("product_categories_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_ticker_order_idx" ON "site_settings_ticker" USING btree ("_order");
  CREATE INDEX "site_settings_ticker_parent_id_idx" ON "site_settings_ticker" USING btree ("_parent_id");
  CREATE INDEX "site_settings_ticker_locale_idx" ON "site_settings_ticker" USING btree ("_locale");
  CREATE INDEX "site_settings_socials_order_idx" ON "site_settings_socials" USING btree ("_order");
  CREATE INDEX "site_settings_socials_parent_id_idx" ON "site_settings_socials" USING btree ("_parent_id");
  CREATE INDEX "site_settings_opening_hours_items_order_idx" ON "site_settings_opening_hours_items" USING btree ("_order");
  CREATE INDEX "site_settings_opening_hours_items_parent_id_idx" ON "site_settings_opening_hours_items" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_seo_defaults_seo_defaults_image_idx" ON "site_settings" USING btree ("seo_defaults_image_id");
  CREATE INDEX "site_settings__status_idx" ON "site_settings" USING btree ("_status");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_ticker_order_idx" ON "_site_settings_v_version_ticker" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_ticker_parent_id_idx" ON "_site_settings_v_version_ticker" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_ticker_locale_idx" ON "_site_settings_v_version_ticker" USING btree ("_locale");
  CREATE INDEX "_site_settings_v_version_socials_order_idx" ON "_site_settings_v_version_socials" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_socials_parent_id_idx" ON "_site_settings_v_version_socials" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_opening_hours_items_order_idx" ON "_site_settings_v_version_opening_hours_items" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_opening_hours_items_parent_id_idx" ON "_site_settings_v_version_opening_hours_items" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version_favicon_idx" ON "_site_settings_v" USING btree ("version_favicon_id");
  CREATE INDEX "_site_settings_v_version_seo_defaults_version_seo_defaul_idx" ON "_site_settings_v" USING btree ("version_seo_defaults_image_id");
  CREATE INDEX "_site_settings_v_version_version__status_idx" ON "_site_settings_v" USING btree ("version__status");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "_site_settings_v_snapshot_idx" ON "_site_settings_v" USING btree ("snapshot");
  CREATE INDEX "_site_settings_v_published_locale_idx" ON "_site_settings_v" USING btree ("published_locale");
  CREATE INDEX "_site_settings_v_latest_idx" ON "_site_settings_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_settings_v_locales_parent_id_idx" ON "_site_settings_v_locales" USING btree ("_parent_id");
  CREATE INDEX "announcement__status_idx" ON "announcement" USING btree ("_status");
  CREATE UNIQUE INDEX "announcement_locales_locale_parent_id_unique" ON "announcement_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "announcement_locales_parent_id_idx" ON "announcement_locales" USING btree ("_parent_id");
  CREATE INDEX "_announcement_v_version_version__status_idx" ON "_announcement_v" USING btree ("version__status");
  CREATE INDEX "_announcement_v_created_at_idx" ON "_announcement_v" USING btree ("created_at");
  CREATE INDEX "_announcement_v_updated_at_idx" ON "_announcement_v" USING btree ("updated_at");
  CREATE INDEX "_announcement_v_snapshot_idx" ON "_announcement_v" USING btree ("snapshot");
  CREATE INDEX "_announcement_v_published_locale_idx" ON "_announcement_v" USING btree ("published_locale");
  CREATE INDEX "_announcement_v_latest_idx" ON "_announcement_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_announcement_v_locales_locale_parent_id_unique" ON "_announcement_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_announcement_v_locales_parent_id_idx" ON "_announcement_v_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation_main_order_idx" ON "navigation_main" USING btree ("_order");
  CREATE INDEX "navigation_main_parent_id_idx" ON "navigation_main" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_main_locales_locale_parent_id_unique" ON "navigation_main_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_main_locales_parent_id_idx" ON "navigation_main_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_links_order_idx" ON "navigation_footer_links" USING btree ("_order");
  CREATE INDEX "navigation_footer_links_parent_id_idx" ON "navigation_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_footer_links_locales_locale_parent_id_unique" ON "navigation_footer_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_footer_links_locales_parent_id_idx" ON "navigation_footer_links_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation_info_columns_links_order_idx" ON "navigation_info_columns_links" USING btree ("_order");
  CREATE INDEX "navigation_info_columns_links_parent_id_idx" ON "navigation_info_columns_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_info_columns_links_locales_locale_parent_id_uniqu" ON "navigation_info_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_info_columns_links_locales_parent_id_idx" ON "navigation_info_columns_links_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation_info_columns_order_idx" ON "navigation_info_columns" USING btree ("_order");
  CREATE INDEX "navigation_info_columns_parent_id_idx" ON "navigation_info_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_info_columns_locales_locale_parent_id_unique" ON "navigation_info_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_info_columns_locales_parent_id_idx" ON "navigation_info_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation__status_idx" ON "navigation" USING btree ("_status");
  CREATE INDEX "_navigation_v_version_main_order_idx" ON "_navigation_v_version_main" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_main_parent_id_idx" ON "_navigation_v_version_main" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_main_locales_locale_parent_id_unique" ON "_navigation_v_version_main_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_main_locales_parent_id_idx" ON "_navigation_v_version_main_locales" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_footer_links_order_idx" ON "_navigation_v_version_footer_links" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_footer_links_parent_id_idx" ON "_navigation_v_version_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_footer_links_locales_locale_parent_id_" ON "_navigation_v_version_footer_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_footer_links_locales_parent_id_idx" ON "_navigation_v_version_footer_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_info_columns_links_order_idx" ON "_navigation_v_version_info_columns_links" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_info_columns_links_parent_id_idx" ON "_navigation_v_version_info_columns_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_info_columns_links_locales_locale_pare" ON "_navigation_v_version_info_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_info_columns_links_locales_parent__idx" ON "_navigation_v_version_info_columns_links_locales" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_info_columns_order_idx" ON "_navigation_v_version_info_columns" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_info_columns_parent_id_idx" ON "_navigation_v_version_info_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_info_columns_locales_locale_parent_id_" ON "_navigation_v_version_info_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navigation_v_version_info_columns_locales_parent_id_idx" ON "_navigation_v_version_info_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_version__status_idx" ON "_navigation_v" USING btree ("version__status");
  CREATE INDEX "_navigation_v_created_at_idx" ON "_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "_navigation_v" USING btree ("updated_at");
  CREATE INDEX "_navigation_v_snapshot_idx" ON "_navigation_v" USING btree ("snapshot");
  CREATE INDEX "_navigation_v_published_locale_idx" ON "_navigation_v" USING btree ("published_locale");
  CREATE INDEX "_navigation_v_latest_idx" ON "_navigation_v" USING btree ("latest");
  CREATE INDEX "footer_logo_idx" ON "footer" USING btree ("logo_id");
  CREATE INDEX "footer__status_idx" ON "footer" USING btree ("_status");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_locales_parent_id_idx" ON "footer_locales" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_version_logo_idx" ON "_footer_v" USING btree ("version_logo_id");
  CREATE INDEX "_footer_v_version_version__status_idx" ON "_footer_v" USING btree ("version__status");
  CREATE INDEX "_footer_v_created_at_idx" ON "_footer_v" USING btree ("created_at");
  CREATE INDEX "_footer_v_updated_at_idx" ON "_footer_v" USING btree ("updated_at");
  CREATE INDEX "_footer_v_snapshot_idx" ON "_footer_v" USING btree ("snapshot");
  CREATE INDEX "_footer_v_published_locale_idx" ON "_footer_v" USING btree ("published_locale");
  CREATE INDEX "_footer_v_latest_idx" ON "_footer_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_footer_v_locales_locale_parent_id_unique" ON "_footer_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_locales_parent_id_idx" ON "_footer_v_locales" USING btree ("_parent_id");
  CREATE INDEX "home_hero_stats_order_idx" ON "home_hero_stats" USING btree ("_order");
  CREATE INDEX "home_hero_stats_parent_id_idx" ON "home_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "home_hero_stats_locale_idx" ON "home_hero_stats" USING btree ("_locale");
  CREATE INDEX "home_sector_columns_order_idx" ON "home_sector_columns" USING btree ("_order");
  CREATE INDEX "home_sector_columns_parent_id_idx" ON "home_sector_columns" USING btree ("_parent_id");
  CREATE INDEX "home_sector_columns_category_idx" ON "home_sector_columns" USING btree ("category_id");
  CREATE UNIQUE INDEX "home_sector_columns_locales_locale_parent_id_unique" ON "home_sector_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_sector_columns_locales_parent_id_idx" ON "home_sector_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "home_hero_hero_background_idx" ON "home" USING btree ("hero_background_id");
  CREATE INDEX "home_hero_hero_mark_idx" ON "home" USING btree ("hero_mark_id");
  CREATE INDEX "home_roots_roots_photo_idx" ON "home" USING btree ("roots_photo_id");
  CREATE INDEX "home_places_places_map_idx" ON "home" USING btree ("places_map_id");
  CREATE INDEX "home_places_places_shop_idx" ON "home" USING btree ("places_shop_id");
  CREATE INDEX "home__status_idx" ON "home" USING btree ("_status");
  CREATE UNIQUE INDEX "home_locales_locale_parent_id_unique" ON "home_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_locales_parent_id_idx" ON "home_locales" USING btree ("_parent_id");
  CREATE INDEX "home_rels_order_idx" ON "home_rels" USING btree ("order");
  CREATE INDEX "home_rels_parent_idx" ON "home_rels" USING btree ("parent_id");
  CREATE INDEX "home_rels_path_idx" ON "home_rels" USING btree ("path");
  CREATE INDEX "home_rels_products_id_idx" ON "home_rels" USING btree ("products_id");
  CREATE INDEX "_home_v_version_hero_stats_order_idx" ON "_home_v_version_hero_stats" USING btree ("_order");
  CREATE INDEX "_home_v_version_hero_stats_parent_id_idx" ON "_home_v_version_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_hero_stats_locale_idx" ON "_home_v_version_hero_stats" USING btree ("_locale");
  CREATE INDEX "_home_v_version_sector_columns_order_idx" ON "_home_v_version_sector_columns" USING btree ("_order");
  CREATE INDEX "_home_v_version_sector_columns_parent_id_idx" ON "_home_v_version_sector_columns" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_sector_columns_category_idx" ON "_home_v_version_sector_columns" USING btree ("category_id");
  CREATE UNIQUE INDEX "_home_v_version_sector_columns_locales_locale_parent_id_uniq" ON "_home_v_version_sector_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_version_sector_columns_locales_parent_id_idx" ON "_home_v_version_sector_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_hero_version_hero_background_idx" ON "_home_v" USING btree ("version_hero_background_id");
  CREATE INDEX "_home_v_version_hero_version_hero_mark_idx" ON "_home_v" USING btree ("version_hero_mark_id");
  CREATE INDEX "_home_v_version_roots_version_roots_photo_idx" ON "_home_v" USING btree ("version_roots_photo_id");
  CREATE INDEX "_home_v_version_places_version_places_map_idx" ON "_home_v" USING btree ("version_places_map_id");
  CREATE INDEX "_home_v_version_places_version_places_shop_idx" ON "_home_v" USING btree ("version_places_shop_id");
  CREATE INDEX "_home_v_version_version__status_idx" ON "_home_v" USING btree ("version__status");
  CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
  CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  CREATE INDEX "_home_v_snapshot_idx" ON "_home_v" USING btree ("snapshot");
  CREATE INDEX "_home_v_published_locale_idx" ON "_home_v" USING btree ("published_locale");
  CREATE INDEX "_home_v_latest_idx" ON "_home_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_home_v_locales_locale_parent_id_unique" ON "_home_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_locales_parent_id_idx" ON "_home_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_home_v_rels_order_idx" ON "_home_v_rels" USING btree ("order");
  CREATE INDEX "_home_v_rels_parent_idx" ON "_home_v_rels" USING btree ("parent_id");
  CREATE INDEX "_home_v_rels_path_idx" ON "_home_v_rels" USING btree ("path");
  CREATE INDEX "_home_v_rels_products_id_idx" ON "_home_v_rels" USING btree ("products_id");
  CREATE INDEX "about_photos_order_idx" ON "about_photos" USING btree ("_order");
  CREATE INDEX "about_photos_parent_id_idx" ON "about_photos" USING btree ("_parent_id");
  CREATE INDEX "about_photos_image_idx" ON "about_photos" USING btree ("image_id");
  CREATE INDEX "about_masthead_masthead_background_idx" ON "about" USING btree ("masthead_background_id");
  CREATE INDEX "about_band_band_image_idx" ON "about" USING btree ("band_image_id");
  CREATE INDEX "about__status_idx" ON "about" USING btree ("_status");
  CREATE UNIQUE INDEX "about_locales_locale_parent_id_unique" ON "about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_locales_parent_id_idx" ON "about_locales" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_photos_order_idx" ON "_about_v_version_photos" USING btree ("_order");
  CREATE INDEX "_about_v_version_photos_parent_id_idx" ON "_about_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_photos_image_idx" ON "_about_v_version_photos" USING btree ("image_id");
  CREATE INDEX "_about_v_version_masthead_version_masthead_background_idx" ON "_about_v" USING btree ("version_masthead_background_id");
  CREATE INDEX "_about_v_version_band_version_band_image_idx" ON "_about_v" USING btree ("version_band_image_id");
  CREATE INDEX "_about_v_version_version__status_idx" ON "_about_v" USING btree ("version__status");
  CREATE INDEX "_about_v_created_at_idx" ON "_about_v" USING btree ("created_at");
  CREATE INDEX "_about_v_updated_at_idx" ON "_about_v" USING btree ("updated_at");
  CREATE INDEX "_about_v_snapshot_idx" ON "_about_v" USING btree ("snapshot");
  CREATE INDEX "_about_v_published_locale_idx" ON "_about_v" USING btree ("published_locale");
  CREATE INDEX "_about_v_latest_idx" ON "_about_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_about_v_locales_locale_parent_id_unique" ON "_about_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_locales_parent_id_idx" ON "_about_v_locales" USING btree ("_parent_id");
  CREATE INDEX "gallery_items_order_idx" ON "gallery_items" USING btree ("_order");
  CREATE INDEX "gallery_items_parent_id_idx" ON "gallery_items" USING btree ("_parent_id");
  CREATE INDEX "gallery_items_image_idx" ON "gallery_items" USING btree ("image_id");
  CREATE INDEX "gallery__status_idx" ON "gallery" USING btree ("_status");
  CREATE UNIQUE INDEX "gallery_locales_locale_parent_id_unique" ON "gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gallery_locales_parent_id_idx" ON "gallery_locales" USING btree ("_parent_id");
  CREATE INDEX "_gallery_v_version_items_order_idx" ON "_gallery_v_version_items" USING btree ("_order");
  CREATE INDEX "_gallery_v_version_items_parent_id_idx" ON "_gallery_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_gallery_v_version_items_image_idx" ON "_gallery_v_version_items" USING btree ("image_id");
  CREATE INDEX "_gallery_v_version_version__status_idx" ON "_gallery_v" USING btree ("version__status");
  CREATE INDEX "_gallery_v_created_at_idx" ON "_gallery_v" USING btree ("created_at");
  CREATE INDEX "_gallery_v_updated_at_idx" ON "_gallery_v" USING btree ("updated_at");
  CREATE INDEX "_gallery_v_snapshot_idx" ON "_gallery_v" USING btree ("snapshot");
  CREATE INDEX "_gallery_v_published_locale_idx" ON "_gallery_v" USING btree ("published_locale");
  CREATE INDEX "_gallery_v_latest_idx" ON "_gallery_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_gallery_v_locales_locale_parent_id_unique" ON "_gallery_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_gallery_v_locales_parent_id_idx" ON "_gallery_v_locales" USING btree ("_parent_id");
  CREATE INDEX "news_page_headline_idx" ON "news_page" USING btree ("headline_id");
  CREATE INDEX "news_page__status_idx" ON "news_page" USING btree ("_status");
  CREATE UNIQUE INDEX "news_page_locales_locale_parent_id_unique" ON "news_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "news_page_locales_parent_id_idx" ON "news_page_locales" USING btree ("_parent_id");
  CREATE INDEX "news_page_rels_order_idx" ON "news_page_rels" USING btree ("order");
  CREATE INDEX "news_page_rels_parent_idx" ON "news_page_rels" USING btree ("parent_id");
  CREATE INDEX "news_page_rels_path_idx" ON "news_page_rels" USING btree ("path");
  CREATE INDEX "news_page_rels_articles_id_idx" ON "news_page_rels" USING btree ("articles_id");
  CREATE INDEX "_news_page_v_version_version_headline_idx" ON "_news_page_v" USING btree ("version_headline_id");
  CREATE INDEX "_news_page_v_version_version__status_idx" ON "_news_page_v" USING btree ("version__status");
  CREATE INDEX "_news_page_v_created_at_idx" ON "_news_page_v" USING btree ("created_at");
  CREATE INDEX "_news_page_v_updated_at_idx" ON "_news_page_v" USING btree ("updated_at");
  CREATE INDEX "_news_page_v_snapshot_idx" ON "_news_page_v" USING btree ("snapshot");
  CREATE INDEX "_news_page_v_published_locale_idx" ON "_news_page_v" USING btree ("published_locale");
  CREATE INDEX "_news_page_v_latest_idx" ON "_news_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_news_page_v_locales_locale_parent_id_unique" ON "_news_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_news_page_v_locales_parent_id_idx" ON "_news_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_news_page_v_rels_order_idx" ON "_news_page_v_rels" USING btree ("order");
  CREATE INDEX "_news_page_v_rels_parent_idx" ON "_news_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_news_page_v_rels_path_idx" ON "_news_page_v_rels" USING btree ("path");
  CREATE INDEX "_news_page_v_rels_articles_id_idx" ON "_news_page_v_rels" USING btree ("articles_id");
  CREATE INDEX "faq_page__status_idx" ON "faq_page" USING btree ("_status");
  CREATE UNIQUE INDEX "faq_page_locales_locale_parent_id_unique" ON "faq_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faq_page_locales_parent_id_idx" ON "faq_page_locales" USING btree ("_parent_id");
  CREATE INDEX "_faq_page_v_version_version__status_idx" ON "_faq_page_v" USING btree ("version__status");
  CREATE INDEX "_faq_page_v_created_at_idx" ON "_faq_page_v" USING btree ("created_at");
  CREATE INDEX "_faq_page_v_updated_at_idx" ON "_faq_page_v" USING btree ("updated_at");
  CREATE INDEX "_faq_page_v_snapshot_idx" ON "_faq_page_v" USING btree ("snapshot");
  CREATE INDEX "_faq_page_v_published_locale_idx" ON "_faq_page_v" USING btree ("published_locale");
  CREATE INDEX "_faq_page_v_latest_idx" ON "_faq_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_faq_page_v_locales_locale_parent_id_unique" ON "_faq_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faq_page_v_locales_parent_id_idx" ON "_faq_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "contact_page__status_idx" ON "contact_page" USING btree ("_status");
  CREATE UNIQUE INDEX "contact_page_locales_locale_parent_id_unique" ON "contact_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "contact_page_locales_parent_id_idx" ON "contact_page_locales" USING btree ("_parent_id");
  CREATE INDEX "_contact_page_v_version_version__status_idx" ON "_contact_page_v" USING btree ("version__status");
  CREATE INDEX "_contact_page_v_created_at_idx" ON "_contact_page_v" USING btree ("created_at");
  CREATE INDEX "_contact_page_v_updated_at_idx" ON "_contact_page_v" USING btree ("updated_at");
  CREATE INDEX "_contact_page_v_snapshot_idx" ON "_contact_page_v" USING btree ("snapshot");
  CREATE INDEX "_contact_page_v_published_locale_idx" ON "_contact_page_v" USING btree ("published_locale");
  CREATE INDEX "_contact_page_v_latest_idx" ON "_contact_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_contact_page_v_locales_locale_parent_id_unique" ON "_contact_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_contact_page_v_locales_parent_id_idx" ON "_contact_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "integrations_loyverse_unprofiled_order_idx" ON "integrations_loyverse_unprofiled" USING btree ("_order");
  CREATE INDEX "integrations_loyverse_unprofiled_parent_id_idx" ON "integrations_loyverse_unprofiled" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "product_categories" CASCADE;
  DROP TABLE "product_categories_locales" CASCADE;
  DROP TABLE "products_specs" CASCADE;
  DROP TABLE "products_notes" CASCADE;
  DROP TABLE "products_loyverse_variants" CASCADE;
  DROP TABLE "products_variant_labels" CASCADE;
  DROP TABLE "products_line_options_choices" CASCADE;
  DROP TABLE "products_detail_facts" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_specs" CASCADE;
  DROP TABLE "_products_v_version_notes" CASCADE;
  DROP TABLE "_products_v_version_loyverse_variants" CASCADE;
  DROP TABLE "_products_v_version_variant_labels" CASCADE;
  DROP TABLE "_products_v_version_line_options_choices" CASCADE;
  DROP TABLE "_products_v_version_detail_facts" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "articles_tags" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "_articles_v_version_tags" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "faqs_locales" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_ticker" CASCADE;
  DROP TABLE "site_settings_socials" CASCADE;
  DROP TABLE "site_settings_opening_hours_items" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_ticker" CASCADE;
  DROP TABLE "_site_settings_v_version_socials" CASCADE;
  DROP TABLE "_site_settings_v_version_opening_hours_items" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  DROP TABLE "announcement" CASCADE;
  DROP TABLE "announcement_locales" CASCADE;
  DROP TABLE "_announcement_v" CASCADE;
  DROP TABLE "_announcement_v_locales" CASCADE;
  DROP TABLE "navigation_main" CASCADE;
  DROP TABLE "navigation_main_locales" CASCADE;
  DROP TABLE "navigation_footer_links" CASCADE;
  DROP TABLE "navigation_footer_links_locales" CASCADE;
  DROP TABLE "navigation_info_columns_links" CASCADE;
  DROP TABLE "navigation_info_columns_links_locales" CASCADE;
  DROP TABLE "navigation_info_columns" CASCADE;
  DROP TABLE "navigation_info_columns_locales" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "_navigation_v_version_main" CASCADE;
  DROP TABLE "_navigation_v_version_main_locales" CASCADE;
  DROP TABLE "_navigation_v_version_footer_links" CASCADE;
  DROP TABLE "_navigation_v_version_footer_links_locales" CASCADE;
  DROP TABLE "_navigation_v_version_info_columns_links" CASCADE;
  DROP TABLE "_navigation_v_version_info_columns_links_locales" CASCADE;
  DROP TABLE "_navigation_v_version_info_columns" CASCADE;
  DROP TABLE "_navigation_v_version_info_columns_locales" CASCADE;
  DROP TABLE "_navigation_v" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_locales" CASCADE;
  DROP TABLE "_footer_v" CASCADE;
  DROP TABLE "_footer_v_locales" CASCADE;
  DROP TABLE "home_hero_stats" CASCADE;
  DROP TABLE "home_sector_columns" CASCADE;
  DROP TABLE "home_sector_columns_locales" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "home_locales" CASCADE;
  DROP TABLE "home_rels" CASCADE;
  DROP TABLE "_home_v_version_hero_stats" CASCADE;
  DROP TABLE "_home_v_version_sector_columns" CASCADE;
  DROP TABLE "_home_v_version_sector_columns_locales" CASCADE;
  DROP TABLE "_home_v" CASCADE;
  DROP TABLE "_home_v_locales" CASCADE;
  DROP TABLE "_home_v_rels" CASCADE;
  DROP TABLE "about_photos" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "about_locales" CASCADE;
  DROP TABLE "_about_v_version_photos" CASCADE;
  DROP TABLE "_about_v" CASCADE;
  DROP TABLE "_about_v_locales" CASCADE;
  DROP TABLE "gallery_items" CASCADE;
  DROP TABLE "gallery" CASCADE;
  DROP TABLE "gallery_locales" CASCADE;
  DROP TABLE "_gallery_v_version_items" CASCADE;
  DROP TABLE "_gallery_v" CASCADE;
  DROP TABLE "_gallery_v_locales" CASCADE;
  DROP TABLE "news_page" CASCADE;
  DROP TABLE "news_page_locales" CASCADE;
  DROP TABLE "news_page_rels" CASCADE;
  DROP TABLE "_news_page_v" CASCADE;
  DROP TABLE "_news_page_v_locales" CASCADE;
  DROP TABLE "_news_page_v_rels" CASCADE;
  DROP TABLE "faq_page" CASCADE;
  DROP TABLE "faq_page_locales" CASCADE;
  DROP TABLE "_faq_page_v" CASCADE;
  DROP TABLE "_faq_page_v_locales" CASCADE;
  DROP TABLE "contact_page" CASCADE;
  DROP TABLE "contact_page_locales" CASCADE;
  DROP TABLE "_contact_page_v" CASCADE;
  DROP TABLE "_contact_page_v_locales" CASCADE;
  DROP TABLE "integrations_loyverse_unprofiled" CASCADE;
  DROP TABLE "integrations" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_faqs_category";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_site_settings_socials_platform";
  DROP TYPE "public"."enum_site_settings_analytics_provider";
  DROP TYPE "public"."enum_site_settings_status";
  DROP TYPE "public"."enum__site_settings_v_version_socials_platform";
  DROP TYPE "public"."enum__site_settings_v_version_analytics_provider";
  DROP TYPE "public"."enum__site_settings_v_version_status";
  DROP TYPE "public"."enum__site_settings_v_published_locale";
  DROP TYPE "public"."enum_announcement_tone";
  DROP TYPE "public"."enum_announcement_status";
  DROP TYPE "public"."enum__announcement_v_version_tone";
  DROP TYPE "public"."enum__announcement_v_version_status";
  DROP TYPE "public"."enum__announcement_v_published_locale";
  DROP TYPE "public"."enum_navigation_status";
  DROP TYPE "public"."enum__navigation_v_version_status";
  DROP TYPE "public"."enum__navigation_v_published_locale";
  DROP TYPE "public"."enum_footer_status";
  DROP TYPE "public"."enum__footer_v_version_status";
  DROP TYPE "public"."enum__footer_v_published_locale";
  DROP TYPE "public"."enum_home_status";
  DROP TYPE "public"."enum__home_v_version_status";
  DROP TYPE "public"."enum__home_v_published_locale";
  DROP TYPE "public"."enum_about_status";
  DROP TYPE "public"."enum__about_v_version_status";
  DROP TYPE "public"."enum__about_v_published_locale";
  DROP TYPE "public"."enum_gallery_items_size";
  DROP TYPE "public"."enum_gallery_status";
  DROP TYPE "public"."enum__gallery_v_version_items_size";
  DROP TYPE "public"."enum__gallery_v_version_status";
  DROP TYPE "public"."enum__gallery_v_published_locale";
  DROP TYPE "public"."enum_news_page_status";
  DROP TYPE "public"."enum__news_page_v_version_status";
  DROP TYPE "public"."enum__news_page_v_published_locale";
  DROP TYPE "public"."enum_faq_page_status";
  DROP TYPE "public"."enum__faq_page_v_version_status";
  DROP TYPE "public"."enum__faq_page_v_published_locale";
  DROP TYPE "public"."enum_contact_page_status";
  DROP TYPE "public"."enum__contact_page_v_version_status";
  DROP TYPE "public"."enum__contact_page_v_published_locale";`)
}
