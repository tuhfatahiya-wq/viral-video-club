const crypto = require("crypto");
const express = require("express");
const { Bot, webhookCallback, InlineKeyboard } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.RENDER_EXTERNAL_URL;

const firstToken = process.env.FIRST_BOT_TOKEN;
const secondToken = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const BOT_LINK_SECRET = process.env.BOT_LINK_SECRET;
console.log("BOT LINK SECRET EXISTS:", !!BOT_LINK_SECRET);
function createVideoToken(videoId) {
  const signature = crypto
    .createHmac("sha256", BOT_LINK_SECRET)
    .update(String(videoId))
    .digest("base64url")
    .slice(0, 22);

  return `${videoId}_${signature}`;
}

function verifyVideoToken(token) {
  const separator = token.lastIndexOf("_");

  if (separator === -1) return null;

  const videoId = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = createVideoToken(videoId);

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected.split("_").pop());

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return videoId;
}

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
  
   firstBot.command("videos", async (ctx) => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      return ctx.reply("এখনো কোনো ভিডিও আপলোড করা হয়নি।");
    }

    const keyboard = new InlineKeyboard();

    const list = data.map((video, index) => {
      keyboard.text(
        `▶️ Watch Now ${index + 1}`,
        `watch:${video.id}`
      ).row();

      return `${index + 1}. ${video.title}`;
    }).join("\n");

    await ctx.reply(
      "🎬 ভিডিও তালিকা:\n\n" + list,
      { reply_markup: keyboard }
    );

  } catch (error) {
    console.error("VIDEO LIST ERROR:", error);
    await ctx.reply("ভিডিও তালিকা লোড করা যায়নি।");
  }
});

firstBot.callbackQuery(/^watch:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery();

    const videoId = ctx.match[1];
    const token = createVideoToken(videoId);

    const link =
      `https://t.me/ViralVideoDeliveryBot?start=${token}`;

    const keyboard = new InlineKeyboard()
      .url("🎬 Open Delivery Bot", link);

    await ctx.reply(
      "🎬 ভিডিও আনলক করার পর Delivery Bot থেকে ভিডিও পাবেন।",
      { reply_markup: keyboard }
    );

  } catch (error) {
    console.error("WATCH LINK ERROR:", error);
    await ctx.reply("লিংক তৈরি করা যায়নি।");
  }
});

secondBot.command("start", async (ctx) => {
  try {
    console.log("SECOND BOT START RECEIVED");

    const token = String(ctx.match || "").trim();

    if (!token) {
      return ctx.reply(
        "স্বাগতম Viral Video Delivery Bot-এ! 🎥\nভিডিও পেতে প্রথম বট থেকে Watch Now চাপুন।"
      );
    }
console.log("START PAYLOAD EXISTS:", !!token);
console.log("START PAYLOAD LENGTH:", token.length);

    const videoId = verifyVideoToken(token);

    if (!videoId) {
      return ctx.reply("❌ ভিডিও লিংকটি সঠিক নয়।");
    }

    const { data: unlock, error: unlockError } = await supabase
      .from("unlocks")
      .select("id")
      .eq("user_id", String(ctx.from.id))
      .eq("video_id", videoId)
      .maybeSingle();

    if (unlockError) throw unlockError;

    if (!unlock) {
      return ctx.reply(
        "🔒 এই ভিডিওটি এখনো আনলক করা হয়নি।"
      );
    }

    const { data: video, error } = await supabase
      .from("videos")
      .select("title, telegram_file_id, caption")
      .eq("id", videoId)
      .single();

    if (error) throw error;

    await ctx.replyWithVideo(video.telegram_file_id, {
      caption: video.caption || video.title,
      protect_content: true
    });

  } catch (error) {
    console.error("VIDEO DELIVERY ERROR:", error);
    await ctx.reply("ভিডিও পাঠানো যায়নি। আবার চেষ্টা করুন।");
  }
});
  secondBot.on("message:video", async (ctx) => {
  try {
    if (String(ctx.from.id) !== String(ADMIN_ID)) {
      return ctx.reply("আপনার ভিডিও আপলোড করার অনুমতি নেই।");
    }

    const video = ctx.message.video;

    const { error } = await supabase
      .from("videos")
      .insert({
        title: ctx.message.caption || "নতুন ভিডিও",
        telegram_file_id: video.file_id,
        caption: ctx.message.caption || null
      });

    if (error) throw error;

    await ctx.reply("ভিডিও সফলভাবে সংরক্ষণ হয়েছে! 🎬");
  } catch (error) {
    console.error("VIDEO SAVE ERROR:", error);
    await ctx.reply("ভিডিও সংরক্ষণ করা যায়নি।");
  }
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
