CREATE TABLE `email_job_chunks` (
	`message_id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`chunk_count` integer NOT NULL,
	`status` text NOT NULL,
	`recipients_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_error` text,
	FOREIGN KEY (`job_id`) REFERENCES `email_jobs`(`job_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "email_job_chunks_status_check" CHECK(status IN ('queued', 'enqueue_failed', 'processing', 'sent'))
);
--> statement-breakpoint
CREATE INDEX `email_job_chunks_job_id_status_index` ON `email_job_chunks` (`job_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_job_chunks_job_id_chunk_index_unique` ON `email_job_chunks` (`job_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `email_jobs` (
	`job_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`template` text NOT NULL,
	`priority` text NOT NULL,
	`subject` text NOT NULL,
	`recipients_count` integer NOT NULL,
	`chunk_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_error` text,
	CONSTRAINT "email_jobs_status_check" CHECK(status IN ('pending', 'queued', 'enqueue_failed', 'processing', 'sent')),
	CONSTRAINT "email_jobs_priority_check" CHECK(priority IN ('high', 'normal'))
);
