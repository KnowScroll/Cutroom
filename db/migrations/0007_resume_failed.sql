DROP INDEX `run_request_id_unique`;--> statement-breakpoint
ALTER TABLE `run` ADD `resumes` text;--> statement-breakpoint
ALTER TABLE `run` ADD `failure` text;--> statement-breakpoint
ALTER TABLE `run` ADD `resume_request` text;--> statement-breakpoint
CREATE UNIQUE INDEX `run_resumes_unique` ON `run` (`resumes`);--> statement-breakpoint
CREATE UNIQUE INDEX `run_request_id_unique` ON `run` (`request_id`) WHERE resumes IS NULL;--> statement-breakpoint
ALTER TABLE `narration` ADD `kept_from` text;--> statement-breakpoint
ALTER TABLE `picture` ADD `kept_from` text;--> statement-breakpoint
ALTER TABLE `take` ADD `kept_from` text;