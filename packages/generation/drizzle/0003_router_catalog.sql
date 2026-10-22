CREATE TABLE `router_listings` (
	`key_tag` text PRIMARY KEY NOT NULL,
	`models` text NOT NULL,
	`checked_at` integer NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `router_schemas` (
	`model` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`etag` text,
	`source` text NOT NULL,
	`checked_at` integer NOT NULL
);
