CREATE TABLE `lost_call` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`port` text NOT NULL,
	`model` text NOT NULL,
	`cost_cents` integer NOT NULL,
	`detail` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
