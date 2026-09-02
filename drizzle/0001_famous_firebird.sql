CREATE TABLE `news_posts` (
	`slug` text PRIMARY KEY NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
