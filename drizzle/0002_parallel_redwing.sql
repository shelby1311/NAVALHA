ALTER TABLE "financial_entry" ADD COLUMN "booking_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "opening_hours" json;--> statement-breakpoint
ALTER TABLE "financial_entry" ADD CONSTRAINT "financial_entry_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_barber_slot_unique" ON "booking" USING btree ("barber_id","scheduled_at") WHERE "booking"."status" <> 'cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX "financial_entry_booking_id_unique" ON "financial_entry" USING btree ("booking_id") WHERE "financial_entry"."booking_id" is not null;--> statement-breakpoint
ALTER TABLE "financial_entry" ADD CONSTRAINT "financial_entry_amount_positive" CHECK ("financial_entry"."amount_cents" > 0);