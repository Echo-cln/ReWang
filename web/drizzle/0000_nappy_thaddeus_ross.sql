CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `accounts_owner_idx` ON `accounts` (`owner_id`);--> statement-breakpoint
CREATE TABLE `cash_flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`effective_date` text NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`sequence` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flows_account_date_idx` ON `cash_flows` (`account_id`,`effective_date`);--> statement-breakpoint
CREATE TABLE `daily_prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`price_date` text NOT NULL,
	`close_minor` integer NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`symbol`) REFERENCES `instruments`(`symbol`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prices_symbol_date_unique` ON `daily_prices` (`symbol`,`price_date`);--> statement-breakpoint
CREATE TABLE `decision_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`trade_id` integer,
	`reason` text NOT NULL,
	`expectation` text DEFAULT '' NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notes_account_idx` ON `decision_notes` (`account_id`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`symbol` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`price_type` text NOT NULL,
	`source` text NOT NULL,
	`data_kind` text NOT NULL,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`effective_date` text NOT NULL,
	`symbol` text NOT NULL,
	`side` text NOT NULL,
	`quantity` integer NOT NULL,
	`price_minor` integer NOT NULL,
	`fee_minor` integer DEFAULT 0 NOT NULL,
	`sequence` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trades_account_date_idx` ON `trades` (`account_id`,`effective_date`);