const express = require("express");
const { Bot, webhookCallback } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.RENDER_EXTERNAL_URL;

const firstToken = process.env.FIRST_BOT_TOKEN;
const secondToken = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

app.get("/", (req, res) => {
  res.send("Viral Video Club Backend is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  if (!BASE_URL || !firstToken || !secondToken) {
    throw new Error("Missing Render URL or bot token");
  }

  const firstBot = new Bot(firstToken);
  const secondBot = new Bot(secondToken);
  const firstInfo = await firstBot.api.getMe();
const secondInfo = await secondBot.api.getMe();

console.log("FIRST BOT:", firstInfo.username);
console.log("SECOND BOT:", secondInfo.username);

  firstBot.command("start", async (ctx) => {
    await ctx.reply(
      "স্বাগতম Viral Video Club-এ! 🎬\nভিডিও দেখতে আমাদের সেবা প্রস্তুত হচ্ছে।"
    );
  });

  secondBot.command("start", async (ctx) => {
  console.log("SECOND BOT START RECEIVED");

  await ctx.reply(
    "স্বাগতম Viral Video Delivery Bot-এ! 🎥"
  );
});   

  app.use(
    "/telegram/first",
    webhookCallback(firstBot, "express")
  );

  app.use(
    "/telegram/second",
    webhookCallback(secondBot, "express")
  );

  await firstBot.api.setWebhook(`${BASE_URL}/telegram/first`);
  await secondBot.api.setWebhook(`${BASE_URL}/telegram/second`);
  console.log(
  "FIRST WEBHOOK:",
  await firstBot.api.getWebhookInfo()
);

console.log(
  "SECOND WEBHOOK:",
  await secondBot.api.getWebhookInfo()
);

  app.listen(PORT, () => {
    console.log("Viral Video Club server started");
  });
}

startServer().catch((error) => {
  console.error("Startup error:", error);
  process.exit(1);
});
