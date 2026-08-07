CREATE TABLE IF NOT EXISTS "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"plus_ones" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_member_event" UNIQUE("member_id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"redeemed_by_member_id" integer,
	"redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membership_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "council" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_codes" ADD CONSTRAINT "membership_codes_redeemed_by_member_id_members_id_fk" FOREIGN KEY ("redeemed_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
