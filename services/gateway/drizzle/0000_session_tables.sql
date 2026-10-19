CREATE TABLE `session_limits` (
	`session_id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_records` (
	`kind` text NOT NULL,
	`record_id` text NOT NULL,
	`session_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`kind`, `record_id`)
);
--> statement-breakpoint
CREATE INDEX `session_records_session_kind` ON `session_records` (`session_id`,`kind`);--> statement-breakpoint
CREATE INDEX `session_records_created_at` ON `session_records` (`created_at`);