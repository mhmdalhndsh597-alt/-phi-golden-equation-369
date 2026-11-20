CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`actorId` int NOT NULL,
	`type` enum('like','comment','follow','gift','moderation') NOT NULL,
	`entityId` int,
	`message` varchar(240) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `notifications_created_idx` ON `notifications` (`createdAt`);