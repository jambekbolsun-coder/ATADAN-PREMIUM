CREATE TABLE `admin_profile` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`display_name` text DEFAULT 'Администратор ATADAN' NOT NULL,
	`phone` text DEFAULT '+996 706 131 404' NOT NULL,
	`email` text DEFAULT 'admin@atadan.kg' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interest_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tractor_slug` text,
	`path` text NOT NULL,
	`event_type` text DEFAULT 'page_view' NOT NULL,
	`visitor_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tractor_slug` text,
	`tractor_model` text,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`source` text DEFAULT 'website' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_overrides` (
	`slug` text PRIMARY KEY NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
