CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`contact` text NOT NULL,
	`requested_at` text NOT NULL,
	`status` text NOT NULL,
	`resolved_at` text,
	`resolved_by` text
);
--> statement-breakpoint
ALTER TABLE `app_sessions` ADD `token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `app_sessions_token_hash_unique` ON `app_sessions` (`token_hash`);--> statement-breakpoint
ALTER TABLE `users` ADD `pin_hash` text;
--> statement-breakpoint
UPDATE users SET role='user' WHERE role!='admin';
--> statement-breakpoint
UPDATE users SET role='user' WHERE role='admin' AND id!=(SELECT id FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1);
--> statement-breakpoint
UPDATE app_sessions SET ended_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ended_at IS NULL;
