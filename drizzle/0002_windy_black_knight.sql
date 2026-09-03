ALTER TABLE `users` ADD `curriculumVitae` text;--> statement-breakpoint
ALTER TABLE `users` ADD `specifications` text;--> statement-breakpoint
ALTER TABLE `users` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `users` ADD `occupation` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `education` varchar(160);--> statement-breakpoint
ALTER TABLE `users` ADD `maritalStatus` enum('single','divorced','widowed') DEFAULT 'single';