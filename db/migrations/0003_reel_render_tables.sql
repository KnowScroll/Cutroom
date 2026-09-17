CREATE TABLE `hold` (
	`run_id` text NOT NULL,
	`render_id` text NOT NULL,
	`shot_id` text NOT NULL,
	`seconds` real NOT NULL,
	`reason` text NOT NULL,
	PRIMARY KEY(`run_id`, `render_id`, `shot_id`),
	FOREIGN KEY (`run_id`,`render_id`) REFERENCES `render`(`run_id`,`render_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `narration` (
	`run_id` text NOT NULL,
	`narration_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`shot_unit` integer NOT NULL,
	`text` text NOT NULL,
	`path` text NOT NULL,
	`words` text,
	`probe` text,
	PRIMARY KEY(`run_id`, `narration_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `render` (
	`run_id` text NOT NULL,
	`render_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`render_manifest` text NOT NULL,
	`hash` text NOT NULL,
	`path` text,
	`profile` text NOT NULL,
	`invocations` text,
	`measure` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`gate7` text,
	PRIMARY KEY(`run_id`, `render_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `speech_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`narration_id` text NOT NULL,
	`model` text NOT NULL,
	`characters` integer NOT NULL,
	`rate_cents` real NOT NULL,
	`cost_cents` integer NOT NULL,
	`fake` integer NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `take` (
	`run_id` text NOT NULL,
	`take_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`shot_unit` integer NOT NULL,
	`number` integer NOT NULL,
	`mode` text NOT NULL,
	`picture_id` text,
	`degraded` integer DEFAULT false NOT NULL,
	`prompt` text NOT NULL,
	`requested_seconds` integer NOT NULL,
	`seed` integer NOT NULL,
	`request_id` text NOT NULL,
	`expanded_prompt` text NOT NULL,
	`path` text NOT NULL,
	`probe` text,
	`scan` text,
	`words` text,
	`sound` text,
	`verdicts` text DEFAULT '[]' NOT NULL,
	`outcome` text,
	`degradation` text,
	PRIMARY KEY(`run_id`, `take_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `take_observation` (
	`id` text NOT NULL,
	`run_id` text NOT NULL,
	`take_id` text NOT NULL,
	`observation` text NOT NULL,
	PRIMARY KEY(`run_id`, `id`),
	FOREIGN KEY (`run_id`,`take_id`) REFERENCES `take`(`run_id`,`take_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `take_reconciliation` (
	`id` text NOT NULL,
	`run_id` text NOT NULL,
	`take_id` text NOT NULL,
	`answer` text NOT NULL,
	`failed` text NOT NULL,
	PRIMARY KEY(`run_id`, `id`),
	FOREIGN KEY (`run_id`,`take_id`) REFERENCES `take`(`run_id`,`take_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `video_receipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`take_id` text NOT NULL,
	`model` text NOT NULL,
	`mode` text NOT NULL,
	`resolution` text NOT NULL,
	`requested_seconds` integer NOT NULL,
	`aspect_ratio` text,
	`seed` integer NOT NULL,
	`request_id` text NOT NULL,
	`prompt` text NOT NULL,
	`expanded_prompt` text NOT NULL,
	`expansion_mode` text NOT NULL,
	`style_id` text NOT NULL,
	`style_version` integer NOT NULL,
	`rate_cents` real NOT NULL,
	`cost_cents` integer NOT NULL,
	`fake` integer NOT NULL,
	`degraded` integer DEFAULT false NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action
);
