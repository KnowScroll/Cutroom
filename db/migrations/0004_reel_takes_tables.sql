CREATE TABLE `still_hold` (
	`run_id` text NOT NULL,
	`shot_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`picture_id` text NOT NULL,
	`probe` text NOT NULL,
	`take_ids` text NOT NULL,
	`reason` text NOT NULL,
	PRIMARY KEY(`run_id`, `shot_id`),
	FOREIGN KEY (`run_id`) REFERENCES `run`(`run_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`,`picture_id`) REFERENCES `picture`(`run_id`,`picture_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `speech_receipt` ADD `transient_errors` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `video_receipt` ADD `transient_errors` integer DEFAULT 0 NOT NULL;