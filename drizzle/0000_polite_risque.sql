CREATE TABLE `exclusions` (
	`key` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`address` text NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_state` (
	`id` text PRIMARY KEY NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`follow` integer DEFAULT 0 NOT NULL,
	`action` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	`actor` text NOT NULL
);
