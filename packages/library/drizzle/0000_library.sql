CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`duration_seconds` real,
	`source_run_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_created_at_id` ON `assets` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `assets_kind_created_at` ON `assets` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `assets_source_run_id` ON `assets` (`source_run_id`);--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`references` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `characters_created_at` ON `characters` (`created_at`);