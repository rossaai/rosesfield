CREATE TABLE `measured_prices` (
	`model` text NOT NULL,
	`settings` text NOT NULL,
	`cost_amount` real NOT NULL,
	`measured_at` integer NOT NULL,
	PRIMARY KEY(`model`, `settings`)
);
