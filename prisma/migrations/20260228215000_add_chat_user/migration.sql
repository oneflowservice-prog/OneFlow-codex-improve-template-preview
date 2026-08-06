-- Add optional user ownership to chats for authenticated project history
ALTER TABLE "Chat" ADD COLUMN "userId" TEXT;

CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

ALTER TABLE "Chat"
ADD CONSTRAINT "Chat_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
