ALTER TABLE `lead_state` ADD `status` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `lead_state` ADD `slots` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE lead_state SET status='follow' WHERE follow=1;
