CREATE TABLE `agreement_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agreementId` int NOT NULL,
	`signerId` int NOT NULL,
	`version` int NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`consentText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agreement_signatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `agreement_signature_unique` UNIQUE(`agreementId`,`signerId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `agreement_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agreementId` int NOT NULL,
	`version` int NOT NULL,
	`termType` varchar(80) NOT NULL,
	`label` varchar(180) NOT NULL,
	`value` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agreement_terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `declaration_acceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`declarationId` int NOT NULL,
	`userId` int NOT NULL,
	`acceptanceText` text NOT NULL,
	`dataHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `declaration_acceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marriage_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`version` int NOT NULL,
	`maritalStatusDetail` varchar(120) NOT NULL,
	`hasChildren` int NOT NULL,
	`childrenCount` int NOT NULL DEFAULT 0,
	`essentialObligations` text NOT NULL,
	`additionalNotes` text,
	`status` enum('confirmed','superseded') NOT NULL DEFAULT 'confirmed',
	`dataHash` varchar(128) NOT NULL,
	`confirmedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marriage_declarations_id` PRIMARY KEY(`id`),
	CONSTRAINT `declarations_version_unique` UNIQUE(`userId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `premarital_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initiatorId` int NOT NULL,
	`counterpartyId` int NOT NULL,
	`status` enum('draft','shared','accepted_by_one','accepted_by_both','locked','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`contentHash` varchar(128) NOT NULL,
	`legalDisclaimer` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `premarital_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`priceEgp` decimal(12,2) NOT NULL,
	`durationDays` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	CONSTRAINT `subscription_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_products_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`provider` varchar(80) NOT NULL,
	`externalReference` varchar(180) NOT NULL,
	`status` enum('pending','active','expired','cancelled','reversed') NOT NULL DEFAULT 'pending',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_external_unique` UNIQUE(`provider`,`externalReference`)
);
--> statement-breakpoint
CREATE TABLE `transparency_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`previousEventHash` varchar(128),
	`eventHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transparency_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vault_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`storageKey` text NOT NULL,
	`sha256` varchar(128) NOT NULL,
	`iv` varchar(64) NOT NULL,
	`authTag` varchar(64) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vault_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verified_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`respondentId` int NOT NULL,
	`answer` text NOT NULL,
	`answerHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verified_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `verified_answer_question_unique` UNIQUE(`questionId`)
);
--> statement-breakpoint
CREATE TABLE `verified_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`askerId` int NOT NULL,
	`respondentId` int NOT NULL,
	`conversationKey` varchar(160) NOT NULL,
	`category` varchar(80) NOT NULL,
	`question` text NOT NULL,
	`questionHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verified_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `agreement_terms_agreement_idx` ON `agreement_terms` (`agreementId`);--> statement-breakpoint
CREATE INDEX `acceptances_declaration_idx` ON `declaration_acceptances` (`declarationId`);--> statement-breakpoint
CREATE INDEX `declarations_user_idx` ON `marriage_declarations` (`userId`);--> statement-breakpoint
CREATE INDEX `agreements_initiator_idx` ON `premarital_agreements` (`initiatorId`);--> statement-breakpoint
CREATE INDEX `agreements_counterparty_idx` ON `premarital_agreements` (`counterpartyId`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `transparency_events_entity_idx` ON `transparency_events` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `transparency_events_created_idx` ON `transparency_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `vault_documents_owner_idx` ON `vault_documents` (`ownerId`);--> statement-breakpoint
CREATE INDEX `verified_questions_conversation_idx` ON `verified_questions` (`conversationKey`);