// index.js
// Main bot logic: listens to normal messages, decides when to chime in,
// and replies using Groq — no slash commands, no @mention required.

require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { SYSTEM_PROMPT, BOT_NICKNAME } = require("./persona");
const { askGroq } = require("./groq");

const ALLOWED_CHANNEL_IDS = (process.env.ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const RANDOM_REPLY_CHANCE = parseFloat(process.env.RANDOM_REPLY_CHANCE || "0.4");
const CHANNEL_COOLDOWN_MS = parseInt(process.env.CHANNEL_COOLDOWN_MS || "4000", 10);
const HISTORY_LENGTH = parseInt(process.env.HISTORY_LENGTH || "20", 10);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// channelId -> array of { role, content, authorName }
const channelHistory = new Map();
// channelId -> timestamp of last bot reply
const lastReplyAt = new Map();

function pushHistory(channelId, entry) {
  const hist = channelHistory.get(channelId) || [];
  hist.push(entry);
  while (hist.length > HISTORY_LENGTH) hist.shift();
  channelHistory.set(channelId, hist);
}

function isAllowedChannel(channelId) {
  if (ALLOWED_CHANNEL_IDS.length === 0) return true;
  return ALLOWED_CHANNEL_IDS.includes(channelId);
}

function isDirectlyAddressed(message) {
  const content = message.content.toLowerCase();
  if (message.mentions.has(client.user)) return true;
  if (content.includes(BOT_NICKNAME.toLowerCase())) return true;
  // Replying directly to one of the bot's own messages
  if (message.reference?.messageId) {
    const repliedTo = message.channel.messages.cache.get(message.reference.messageId);
    if (repliedTo?.author?.id === client.user.id) return true;
  }
  return false;
}

function onCooldown(channelId) {
  const last = lastReplyAt.get(channelId) || 0;
  return Date.now() - last < CHANNEL_COOLDOWN_MS;
}

function shouldRespond(message, addressed) {
  if (addressed) return true;
  if (onCooldown(message.channel.id)) return false;
  return Math.random() < RANDOM_REPLY_CHANCE;
}

function buildPromptMessages(channelId) {
  const hist = channelHistory.get(channelId) || [];
  const msgs = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const h of hist) {
    if (h.role === "assistant") {
      msgs.push({ role: "assistant", content: h.content });
    } else {
      // prefix with author name so the model can tell people apart
      msgs.push({ role: "user", content: `${h.authorName}: ${h.content}` });
    }
  }
  return msgs;
}

async function humanDelay(text) {
  // Feels more natural than an instant reply: brief think-time +
  // a typing duration roughly proportional to reply length.
  const thinkMs = 400 + Math.random() * 900;
  const typeMs = Math.min(4000, text.length * 35);
  await new Promise((r) => setTimeout(r, thinkMs));
  return typeMs;
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return; // ignore DMs for now
    if (!isAllowedChannel(message.channel.id)) return;
    if (!message.content || message.content.trim().length === 0) return;

    pushHistory(message.channel.id, {
      role: "user",
      authorName: message.member?.displayName || message.author.username,
      content: message.content,
    });

    const addressed = isDirectlyAddressed(message);
    if (!shouldRespond(message, addressed)) return;

    const promptMessages = buildPromptMessages(message.channel.id);

    let reply;
    try {
      reply = await askGroq(promptMessages);
    } catch (err) {
      console.error("Groq API error:", err.message);
      return; // fail silently — a real friend doesn't error-message the chat
    }

    const typeMs = await humanDelay(reply);
    await message.channel.sendTyping();
    await new Promise((r) => setTimeout(r, typeMs));

    await message.reply({ content: reply, allowedMentions: { repliedUser: false } });

    lastReplyAt.set(message.channel.id, Date.now());
    pushHistory(message.channel.id, { role: "assistant", content: reply });
  } catch (err) {
    console.error("Unhandled error in messageCreate:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);