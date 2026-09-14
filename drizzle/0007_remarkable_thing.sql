ALTER TABLE `crm_tasks` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD `priority` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD `customer_id` text REFERENCES crm_customers(id);--> statement-breakpoint
ALTER TABLE `staff` ADD `position` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `department` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `skills` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `permissions_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff_invites` ADD `permissions_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `staff` SET `permissions_json`='["deals","client-base","inventory-units","sales","payments","employee-tasks","notifications","chat","groups","leasing-applications"]' WHERE `role`='manager' AND `permissions_json`='[]';
--> statement-breakpoint
UPDATE `staff` SET `permissions_json`='["suppliers","expenses","finance","payroll","payments","debts","employee-tasks","notifications","chat","groups"]' WHERE `role`='accountant' AND `permissions_json`='[]';
--> statement-breakpoint
UPDATE `staff` SET `permissions_json`='["catalog","parts","news","public-service","faq","leasing","leasing-models","promotions","site-leads","site-analytics","employee-tasks","notifications","chat","groups"]' WHERE `role`='marketer' AND `permissions_json`='[]';
