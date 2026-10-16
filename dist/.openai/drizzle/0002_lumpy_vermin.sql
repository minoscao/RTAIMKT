CREATE TABLE `invoices` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_order_id_unique` ON `invoices` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`buyer` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_lead_idx` ON `orders` (`lead_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `lead_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `business_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
