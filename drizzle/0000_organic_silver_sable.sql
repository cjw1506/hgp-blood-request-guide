CREATE TABLE `prompt_acknowledgements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`revision` integer NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_acknowledgement` ON `prompt_acknowledgements` (`user_id`,`prompt_id`,`revision`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`event` text NOT NULL,
	`at` text NOT NULL,
	`details` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_time` ON `audit_events` (`at`);--> statement-breakpoint
CREATE INDEX `event_user` ON `audit_events` (`user_id`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`checklist` text NOT NULL,
	`stage` text NOT NULL,
	`conditions` text NOT NULL,
	`frequency` text NOT NULL,
	`action` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`client_key` text NOT NULL,
	`prepared_at` text NOT NULL,
	`confirmed_at` text,
	`confirmed_tests` text,
	`status` text NOT NULL,
	`inputs` text NOT NULL,
	`tests` text NOT NULL,
	`rule_version` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_idempotency` ON `test_requests` (`user_id`,`client_key`);--> statement-breakpoint
CREATE INDEX `request_time` ON `test_requests` (`prepared_at`);--> statement-breakpoint
CREATE TABLE `app_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`login_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_user` ON `app_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_id_unique` ON `users` (`auth_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);