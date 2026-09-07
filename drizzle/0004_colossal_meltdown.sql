CREATE TABLE `chat_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('member','moderator','owner') NOT NULL DEFAULT 'member',
	`mutedUntil` timestamp,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_member_unique` UNIQUE(`roomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`messageId` int,
	`reporterId` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`status` enum('draft','scheduled','live','closed','archived') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`closedAt` timestamp,
	`closedBy` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chat_members_room_idx` ON `chat_members` (`roomId`);--> statement-breakpoint
CREATE INDEX `chat_messages_room_idx` ON `chat_messages` (`roomId`);--> statement-breakpoint
CREATE INDEX `chat_messages_created_idx` ON `chat_messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `chat_reports_room_idx` ON `chat_reports` (`roomId`);--> statement-breakpoint
CREATE INDEX `chat_reports_message_idx` ON `chat_reports` (`messageId`);--> statement-breakpoint
CREATE INDEX `chat_rooms_status_idx` ON `chat_rooms` (`status`);--> statement-breakpoint
CREATE INDEX `chat_rooms_created_idx` ON `chat_rooms` (`createdAt`);