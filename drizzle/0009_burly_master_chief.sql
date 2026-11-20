CREATE TABLE `question_proposal_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_proposal_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_proposal_vote_unique` UNIQUE(`proposalId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `question_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposerId` int NOT NULL,
	`category` enum('financial','social','family','special_conditions') NOT NULL,
	`question` text NOT NULL,
	`normalizedHash` varchar(128) NOT NULL,
	`status` enum('pending','approved_library','approved_popular','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` varchar(180),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_proposals_normalizedHash_unique` UNIQUE(`normalizedHash`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `transparencyPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `question_proposal_votes_proposal_idx` ON `question_proposal_votes` (`proposalId`);--> statement-breakpoint
CREATE INDEX `question_proposals_status_idx` ON `question_proposals` (`status`);--> statement-breakpoint
CREATE INDEX `question_proposals_proposer_idx` ON `question_proposals` (`proposerId`);