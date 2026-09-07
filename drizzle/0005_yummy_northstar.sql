ALTER TABLE `gift_transactions` ADD `chatRoomId` int;--> statement-breakpoint
ALTER TABLE `gift_transactions` ADD `chatMessageId` int;--> statement-breakpoint
CREATE INDEX `gift_tx_chat_room_idx` ON `gift_transactions` (`chatRoomId`);--> statement-breakpoint
CREATE INDEX `gift_tx_chat_message_idx` ON `gift_transactions` (`chatMessageId`);