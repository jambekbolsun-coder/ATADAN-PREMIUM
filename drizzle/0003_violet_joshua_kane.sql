ALTER TABLE `leads` ADD `consent_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `consent_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `source_path` text DEFAULT '' NOT NULL;