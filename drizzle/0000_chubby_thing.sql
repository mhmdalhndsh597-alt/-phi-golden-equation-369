CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gift_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`giftId` int NOT NULL,
	`postId` int,
	`commentId` int,
	`messageId` int,
	`amountEgp` decimal(12,2) NOT NULL,
	`status` enum('completed','reversed') NOT NULL DEFAULT 'completed',
	`idempotencyKey` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gift_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `gift_tx_idempotency_unique` UNIQUE(`senderId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`giftName` varchar(80) NOT NULL,
	`iconUrl` text NOT NULL,
	`priceEgp` decimal(12,2) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('like','comment','follow') NOT NULL,
	`postId` int,
	`targetUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `interaction_post_unique` UNIQUE(`userId`,`type`,`postId`),
	CONSTRAINT `interaction_user_unique` UNIQUE(`userId`,`type`,`targetUserId`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`body` text,
	`imageUrl` text,
	`mediaType` enum('image'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`bio` text,
	`age` int,
	`location` varchar(120),
	`gender` enum('male','female','other'),
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balanceEgp` decimal(12,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`postId`);--> statement-breakpoint
CREATE INDEX `comments_user_idx` ON `comments` (`userId`);--> statement-breakpoint
CREATE INDEX `gift_tx_sender_idx` ON `gift_transactions` (`senderId`);--> statement-breakpoint
CREATE INDEX `gift_tx_recipient_idx` ON `gift_transactions` (`recipientId`);--> statement-breakpoint
CREATE INDEX `gift_tx_comment_idx` ON `gift_transactions` (`commentId`);--> statement-breakpoint
CREATE INDEX `gift_tx_message_idx` ON `gift_transactions` (`messageId`);--> statement-breakpoint
CREATE INDEX `interactions_post_idx` ON `interactions` (`postId`);--> statement-breakpoint
CREATE INDEX `interactions_target_user_idx` ON `interactions` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`senderId`);--> statement-breakpoint
CREATE INDEX `messages_recipient_idx` ON `messages` (`recipientId`);--> statement-breakpoint
CREATE INDEX `posts_user_idx` ON `posts` (`userId`);--> statement-breakpoint
CREATE INDEX `posts_created_idx` ON `posts` (`createdAt`);