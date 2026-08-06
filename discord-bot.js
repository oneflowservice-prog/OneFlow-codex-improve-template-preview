import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds], // Just basic intents to appear online
});

client.once('ready', () => {
  console.log(`[Discord Logger Bot] Logged in as ${client.user?.tag}!`);
  
  // Set the "Playing in SG | SantelGroup" status
  client.user?.setActivity({
    name: 'in SG | SantelGroup',
    type: ActivityType.Playing,
  });
  
  client.user?.setStatus('online');
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('[Discord Logger Bot] No DISCORD_BOT_TOKEN provided in .env');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('[Discord Logger Bot] Failed to login:', err);
});
