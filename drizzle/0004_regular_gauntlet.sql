CREATE TABLE `admin_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admin_records_kind_status` ON `admin_records` (`kind`,`status`,`archived`);--> statement-breakpoint
CREATE INDEX `idx_admin_records_kind_sort` ON `admin_records` (`kind`,`sort_order`,`updated_at`);--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `region` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `tractor_slug` text;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `power` integer;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `purpose` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `farm_area` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `budget_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `purchase_method` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `purchase_timing` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_customers` ADD `updated_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `crm_customers` SET `updated_at`=CURRENT_TIMESTAMP WHERE `updated_at`='';
--> statement-breakpoint
UPDATE `crm_deals` SET `stage`='qualified' WHERE `stage`='contacted';
--> statement-breakpoint
UPDATE `crm_deals` SET `stage`='negotiation' WHERE `stage`='proposal';
