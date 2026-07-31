# 💗 Alice — a human-like, girly Discord chatbot (powered by Grok)

This bot chats naturally in your server — no slash commands, no need to
@mention it. It just reads the room and jumps into conversation like a
real member, using xAI's Grok as its brain.

Files:
```
girly-bot/
├── package.json
├── .env.example
├── README.md
└── src/
    ├── index.js      ← main bot logic
    ├── persona.js    ← personality / system prompt
    └── groq.js       ← Groq API wrapper
```

---

## 1. Create the Discord bot & get your token

1. Go to the **Discord Developer Portal**: https://discord.com/developers/applications
2. Click **New Application**, give it a name (e.g. "Luna").
3. In the left sidebar, go to **Bot**.
   - Click **Reset Token** / **Add Bot**, then copy the **token** — this
     goes in `DISCORD_TOKEN` in your `.env` file. Keep it secret; never
     commit it or share it publicly.
   - Scroll down to **Privileged Gateway Intents** and turn ON:
     - **MESSAGE CONTENT INTENT** (required — this is what lets the bot
       read normal messages, not just mentions)
     - **SERVER MEMBERS INTENT** (used so the bot can see display names)
4. In the left sidebar, go to **OAuth2 → URL Generator**.
   - Under **Scopes**, check `bot`.
   - Under **Bot Permissions**, check:
     - `Send Messages`
     - `Read Message History`
     - `View Channels`
     - `Use External Emojis` (optional, nice to have)
   - Copy the generated URL at the bottom, paste it into your browser,
     pick your server, and click **Authorize**. The bot will now appear
     (offline) in your member list.

---

## 2. Get a Groq API key

1. Go to the xAI console: https://console.groq.com/keys
2. Sign in with an X (Twitter) account, or create a new Groq account if
   prompted.
3. If this is a new account, go to **Billing** in the left sidebar and
   add a payment method / credit — Groq's API requires an active billing
   setup before it issues usable keys, even for small usage.
4. In the left sidebar, click **API Keys**.
5. Click **Create API Key**, give it a name (e.g. "discord-bot"), and
   confirm.
6. **Copy the key immediately** — like your Discord token, it's shown
   only once. If you lose it, just create a new one.
7. Paste it into `GROQ_API_KEY` in your `.env` file.
8. (Optional) Check https://console.groq.com/keys for current available models —
   `openai/gpt-oss-120b` is set as the default in this bot, but you can change
   it via `GROQ_MODEL` in `.env` if xAI releases a newer one you want to
   use instead.

---

## 3. Configure the bot

1. Install **Node.js 18+** if you don't have it: https://nodejs.org
2. In the `alice-bot` folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in:
   - `DISCORD_TOKEN` — from step 1
   - `GROQ_API_KEY` — from step 2
   - `ALLOWED_CHANNEL_IDS` — (optional) comma-separated channel IDs where
     you want it to chat freely. To get a channel ID: enable **Developer
     Mode** in Discord (User Settings → Advanced), then right-click a
     channel → **Copy Channel ID**. Leave blank to allow every channel.
   - `BOT_NICKNAME` — the name people can type to get its attention
     without @mentioning it (e.g. `Alice`).
4. Install dependencies:
   ```bash
   cd alice-bot
   npm install
   ```
5. Run it locally to test:
   ```bash
   npm start
   ```
   You should see `Logged in as Alice#1234` in the console, and the bot
   will go online in Discord.

### How it decides when to talk
- It **always** replies if someone @mentions it, says its nickname, or
  replies directly to one of its own messages.
- Otherwise, it replies to a **random message** with probability
  `RANDOM_REPLY_CHANCE` (default 15%), so it feels like it's naturally
  part of the conversation without answering every single line.
- It keeps a short rolling memory (`HISTORY_LENGTH` messages) per channel
  so its replies stay in context.
- It waits briefly and shows a "typing…" indicator before sending, so it
  doesn't feel like a robotic instant-reply bot.

Tune `RANDOM_REPLY_CHANCE`, `CHANNEL_COOLDOWN_MS`, and `HISTORY_LENGTH` in
`.env` to taste. Edit `src/persona.js` any time to change her personality,
tone, or language style.

---

## 4. Run it 24/7 (so it stays online even with your PC off)

Running `npm start` on your own laptop only keeps the bot online while
that laptop is on and connected. To keep it running permanently, deploy
it somewhere that's always on. Two solid options below — pick one.

### Option A — Cheap VPS (most control, ~$4–6/mo)

Works with any provider (DigitalOcean, Hetzner, Linode, AWS Lightsail, a
home server, etc). Example using a fresh Ubuntu 22.04 server:

```bash
# 1. SSH into your server
ssh root@your_server_ip

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# 3. Upload your project (from your local machine, in another terminal)
scp -r girly-bot root@your_server_ip:/root/girly-bot

# 4. Back on the server: install deps
cd /root/girly-bot
npm install

# 5. Make sure .env is filled in on the server too
nano .env   # paste in your tokens, save with Ctrl+O, exit with Ctrl+X

# 6. Install PM2 — a process manager that keeps Node apps alive,
#    restarts them on crash, and restarts them on server reboot
npm install -g pm2

# 7. Start the bot under PM2
pm2 start src/index.js --name luna

# 8. Make PM2 auto-start on server reboot
pm2 startup
# ^ this prints a command — copy & run the exact command it gives you
pm2 save
```

Useful PM2 commands:
```bash
pm2 status        # see if it's running
pm2 logs luna      # view live logs
pm2 restart luna   # restart after you edit code
pm2 stop luna      # stop it
```

Once this is done, you can close your laptop entirely — the bot keeps
running on the VPS, restarts itself if it crashes, and comes back up
automatically even if the server reboots.

### Option B — Managed platform (easiest, no server admin needed)

Services like **Railway** (https://railway.app) or **Render**
(https://render.com) can run this bot 24/7 for you:

1. Push the `girly-bot` folder to a **GitHub repo** (don't commit your
   `.env` — add a `.gitignore` with `.env` and `node_modules` in it).
2. On Railway/Render, create a **New Project → Deploy from GitHub repo**,
   point it at your repo.
3. Set the **Start Command** to `npm start`.
4. In the platform's **Environment Variables** settings, add
   `DISCORD_TOKEN`, `XAI_API_KEY`, and the other values from your
   `.env.example` (never upload the `.env` file itself).
5. Deploy. The platform keeps the process running continuously and
   restarts it automatically if it crashes — same result as the VPS
   option, with less setup, usually for a small monthly cost after any
   free tier runs out.

Either option keeps the bot online independent of your own device.

---

## 5. Basic troubleshooting

- **Bot appears offline** → check `DISCORD_TOKEN` is correct and that
  `npm start` / `pm2 logs luna` doesn't show a login error.
- **Bot online but never replies** → confirm **MESSAGE CONTENT INTENT**
  is enabled in the Developer Portal (step 1), and that you're testing in
  a channel listed in `ALLOWED_CHANNEL_IDS` (or that it's left blank).
- **"xAI API error 401"** → your `XAI_API_KEY` is missing/invalid, or
  billing isn't set up on the xAI console.
- **Replies feel too frequent/rare** → adjust `RANDOM_REPLY_CHANCE` in
  `.env` (0 = only when addressed, 1 = replies to almost everything).

---

## A note on safety

Keep `DISCORD_TOKEN` and `XAI_API_KEY` private — anyone with your bot
token can control your bot, and anyone with your API key can rack up
charges on your account. Never paste them in chat, screenshots, or a
public GitHub repo.
