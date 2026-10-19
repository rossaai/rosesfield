CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`status` text NOT NULL,
	`inputs` text NOT NULL,
	`count` integer NOT NULL,
	`aspect_ratio` text,
	`seed` integer,
	`outputs` text NOT NULL,
	`progress` real,
	`engine_adapter` text NOT NULL,
	`engine_models` text NOT NULL,
	`workflow_hash` text,
	`engine_ref` text,
	`cost_amount` real,
	`origin` text NOT NULL,
	`failure_code` text,
	`failure_status` integer,
	`idempotency_key` text,
	`attempts` integer NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runs_idempotency_key_unique` ON `runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `runs_created_at_id` ON `runs` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `runs_app_id_created_at` ON `runs` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `runs_status` ON `runs` (`status`);