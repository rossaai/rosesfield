CREATE TABLE `session_visits` (
	`session_id` text PRIMARY KEY NOT NULL,
	`visited_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_visits_visited_at` ON `session_visits` (`visited_at`);--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`session_id` text,
	`run` text NOT NULL,
	`media` text NOT NULL,
	`poster_key` text,
	`poster_mime` text,
	`placement` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE INDEX `shares_run_id` ON `shares` (`run_id`);--> statement-breakpoint
CREATE INDEX `shares_placement_created_at` ON `shares` (`placement`,`created_at`);--> statement-breakpoint
CREATE INDEX `shares_expires_at` ON `shares` (`expires_at`);--> statement-breakpoint
CREATE TABLE `spend_start` (
	`id` text PRIMARY KEY NOT NULL,
	`credits` real NOT NULL,
	`started_at` integer NOT NULL
);
