CREATE TABLE `blocked_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotKey` varchar(32) NOT NULL,
	`isWholeDay` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_slots_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocked_slots_slotKey_unique` UNIQUE(`slotKey`)
);
