CREATE TABLE "AgentChannel" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "discordApplicationId" TEXT,
    "discordPublicKey" TEXT,
    "discordBotTokenEncrypted" TEXT,
    "discordGuildId" TEXT,
    "discordBotUserId" TEXT,
    "discordBotUsername" TEXT,
    "discordCommandId" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentChannelMessage" (
    "id" TEXT NOT NULL,
    "agentChannelId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "externalUserId" TEXT,
    "externalChannelId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentChannelMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentChannel_agentId_provider_key" ON "AgentChannel"("agentId", "provider");
CREATE INDEX "AgentChannel_provider_discordApplicationId_idx" ON "AgentChannel"("provider", "discordApplicationId");
CREATE INDEX "AgentChannel_agentId_createdAt_idx" ON "AgentChannel"("agentId", "createdAt");
CREATE INDEX "AgentChannelMessage_agentChannelId_createdAt_idx" ON "AgentChannelMessage"("agentChannelId", "createdAt");
CREATE INDEX "AgentChannelMessage_externalUserId_createdAt_idx" ON "AgentChannelMessage"("externalUserId", "createdAt");

ALTER TABLE "AgentChannel" ADD CONSTRAINT "AgentChannel_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentChannelMessage" ADD CONSTRAINT "AgentChannelMessage_agentChannelId_fkey" FOREIGN KEY ("agentChannelId") REFERENCES "AgentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
