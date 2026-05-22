ALTER TABLE `leads` MODIFY COLUMN `bank` varchar(64) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `bankName` varchar(128) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `loanSize` varchar(128) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `interest` varchar(64) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `leads` ADD `hasSmsf` varchar(8) DEFAULT 'yes' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `ownsProperty` varchar(8) DEFAULT 'yes' NOT NULL;