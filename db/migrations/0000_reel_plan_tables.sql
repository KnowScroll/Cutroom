CREATE TABLE `job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run_at` text NOT NULL,
	`locked_at` text,
	`lease_until` text,
	`error` text,
	`parent_id` integer,
	`correlation_id` text NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `model_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`temperature` real NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`fake` integer NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan` (
	`run_id` text NOT NULL,
	`role` text NOT NULL,
	`unit_count` integer NOT NULL,
	`axis` text NOT NULL,
	`plan` text NOT NULL,
	`verdict` text NOT NULL,
	`score` real,
	`estimate_cents` integer NOT NULL,
	`selected` integer NOT NULL,
	PRIMARY KEY(`run_id`, `role`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `run` (
	`run_id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`request` text NOT NULL,
	`request_canonical` text NOT NULL,
	`state` text NOT NULL,
	`result` text,
	`cancel_requested` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_request_id_unique` ON `run` (`request_id`);--> statement-breakpoint
CREATE TABLE `run_event` (
	`run_id` text NOT NULL,
	`seq` integer NOT NULL,
	`at` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`run_id`, `seq`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
