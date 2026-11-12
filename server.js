const express = require("express");
const { Bot, webhookCallback } = require("grammy");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Viral Video Club Backend is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (process.env.BOT_TOKEN) {
  const bot = new Bot(process.env.BOT_TOKEN);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "স্বাগতম Viral Video Club-এ! 🎬\n\nএই বটের কাজ এখনো তৈরি হচ্ছে।"
    );
  });

  app.use("/telegram", webhookCallback(bot, "express"));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
