ALTER TABLE `users` ADD `preferredAgeMin` int;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredAgeMax` int;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLocations` text;--> statement-breakpoint
ALTER TABLE `users` ADD `interests` text;--> statement-breakpoint
ALTER TABLE `users` ADD `showCompatibility` int DEFAULT 1 NOT NULL;