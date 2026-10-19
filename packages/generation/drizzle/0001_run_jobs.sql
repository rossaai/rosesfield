ALTER TABLE `runs` ADD `jobs` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `runs` SET `jobs` = json_array(json_object('index', 0, 'seed', `seed`, 'ref', `engine_ref`, 'status', CASE WHEN `status` = 'done' THEN 'done' WHEN `engine_ref` IS NULL THEN 'pending' ELSE 'queued' END, 'progress', `progress`, 'outputs', CASE WHEN `status` = 'done' THEN json(`outputs`) ELSE json('[]') END));--> statement-breakpoint
ALTER TABLE `runs` DROP COLUMN `engine_ref`;
