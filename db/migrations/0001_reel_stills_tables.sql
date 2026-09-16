CREATE TABLE `degradation` (
	`run_id` text NOT NULL,
	`shot_id` text NOT NULL,
	`gate` text NOT NULL,
	`reason` text NOT NULL,
	PRIMARY KEY(`run_id`, `shot_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generation_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`picture_id` text NOT NULL,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`reference_ids` text NOT NULL,
	`style_id` text NOT NULL,
	`style_version` integer NOT NULL,
	`rate_cents` real NOT NULL,
	`cost_cents` integer NOT NULL,
	`fake` integer NOT NULL,
	`degraded` integer DEFAULT false NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `observation` (
	`id` text NOT NULL,
	`run_id` text NOT NULL,
	`picture_id` text NOT NULL,
	`observation` text NOT NULL,
	PRIMARY KEY(`run_id`, `id`),
	FOREIGN KEY (`run_id`,`picture_id`) REFERENCES `picture`(`run_id`,`picture_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `picture` (
	`run_id` text NOT NULL,
	`picture_id` text NOT NULL,
	`seq` integer NOT NULL,
	`attempt` integer NOT NULL,
	`shot_unit` integer NOT NULL,
	`subject_id` text NOT NULL,
	`role` text NOT NULL,
	`label` text NOT NULL,
	`path` text NOT NULL,
	`prompt` text NOT NULL,
	`framing` text,
	`reference_ids` text NOT NULL,
	`measure` text,
	`words` text,
	`gate1` text,
	`score` text,
	`gate1s` text,
	`degradation` text,
	`chosen` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`run_id`, `picture_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `picture_run_seq_unique` ON `picture` (`run_id`,`seq`);--> statement-breakpoint
CREATE TABLE `reconciliation` (
	`id` text NOT NULL,
	`run_id` text NOT NULL,
	`picture_id` text NOT NULL,
	`answer` text NOT NULL,
	`failed` text NOT NULL,
	PRIMARY KEY(`run_id`, `id`),
	FOREIGN KEY (`run_id`,`picture_id`) REFERENCES `picture`(`run_id`,`picture_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `model_receipt` ADD `call` text DEFAULT 'structured' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_receipt` ADD `picture_ids` text DEFAULT '[]' NOT NULL;