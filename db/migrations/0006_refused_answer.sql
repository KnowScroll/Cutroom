CREATE TABLE `refused_answer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`port` text NOT NULL,
	`role` text,
	`call` text,
	`about` text NOT NULL,
	`ask` integer NOT NULL,
	`reasons` text NOT NULL,
	`answer` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
