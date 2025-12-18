import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  Routes
} from "discord.js";
import { REST } from "@discordjs/rest";
import {
  joinVoiceChannel,
  getVoiceConnection
} from "@discordjs/voice";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const TZ = process.env.TIMEZONE || "Asia/Bangkok";

let targetVoiceChannel = null;
let logJoinChannel = null;
let logLeaveChannel = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

function thaiTime() {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: TZ
  }).format(new Date());
}

const joinVC = async (channel) => {
  try {
    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
    console.log(`Joined VC: ${channel.id}`);
  } catch (err) {
    console.log("VC Join error:", err.message);
  }
};

const leaveVC = async (guild) => {
  try {
    const conn = getVoiceConnection(guild.id);
    if (conn) conn.destroy();
  } catch {}
};

const commands = [
  new SlashCommandBuilder()
    .setName("setupvoice")
    .setDescription("ให้บอทเข้าห้องเสียง 24/7 แบบไม่หลุด (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("voice")
        .setDescription("เลือกห้องเสียง")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("leavevoice")
    .setDescription("ให้บอทออกจากห้องเสียงทันที (เฉพาะเจ้าของ)"),

  new SlashCommandBuilder()
    .setName("setjoinlog")
    .setDescription("ตั้งช่องแจ้งสมาชิกเข้า VC (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("เลือกช่องข้อความ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setleavelog")
    .setDescription("ตั้งช่องแจ้งสมาชิกออก VC (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("เลือกช่องข้อความ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
]
.map(c => c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator))
.map(c => c.toJSON());

client.once("ready", async () => {
  console.log(`🟢 Bot Online: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  for (const [gid] of client.guilds.cache) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, gid),
        { body: commands }
      );
    } catch (err) {
      console.log("Slash register error:", err.message);
    }
  }
});

client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  if (i.user.id !== ADMIN_ID)
    return i.reply({ content: "❌ ไม่อนุญาต", ephemeral: true });

  if (i.commandName === "setupvoice") {
    targetVoiceChannel = i.options.getChannel("voice");
    await joinVC(targetVoiceChannel);
    return i.reply(`🟢 บอทเข้าห้องเสียง <#${targetVoiceChannel.id}> แล้วค้าบ`);
  }

  if (i.commandName === "leavevoice") {
    await leaveVC(i.guild);
    targetVoiceChannel = null;
    return i.reply(`🔴 ออกจาก VC แล้วค้าบ`);
  }

  if (i.commandName === "setjoinlog") {
    logJoinChannel = i.options.getChannel("channel").id;
    return i.reply(`🟢 Log เข้าเสียงใช้ <#${logJoinChannel}>`);
  }

  if (i.commandName === "setleavelog") {
    logLeaveChannel = i.options.getChannel("channel").id;
    return i.reply(`🟢 Log ออกเสียงใช้ <#${logLeaveChannel}>`);
  }
});

setInterval(() => {
  if (!targetVoiceChannel) return;
  const conn = getVoiceConnection(targetVoiceChannel.guild.id);
  if (!conn) {
    joinVC(targetVoiceChannel);
  }
}, 5000);

// 🔥 Voice Logs (แก้ style ตามที่สั่ง)
client.on("voiceStateUpdate", (oldState, newState) => {
  const user = newState.member?.user;
  if (!user) return;

  if (!oldState.channelId && newState.channelId && logJoinChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`# 🟢 <@${user.id}> ได้เข้าห้องเสียงแล้ว`)
      .setThumbnail("https://cdn.discordapp.com/attachments/1449115719479590984/1451221912259923989/a64f8f38ab161df88f85f035eaa12cb7.jpg")
      .setDescription(`
** ╭┈ ✧ : เข้าห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
> - <a:emoji_10:1449150901628440767> <#${newState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> คุยให้สนุกนะค้าบ  
** ╰ ┈ ✧ :xSwift Hub 🐼 ┆ • ➵ BY Zemon Źx **`);
    client.channels.cache.get(logJoinChannel)?.send({ embeds: [embed] });
  }

  if (oldState.channelId && !newState.channelId && logLeaveChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`# 🔴 <@${user.id}> ได้ออกห้องเสียงแล้ว`)
      .setThumbnail("https://cdn.discordapp.com/attachments/1449115719479590984/1451221912670830612/a9b8cf03aafc0ed58b542e03d281dd2f.jpg")
      .setDescription(`
** ╭┈ ✧ : ออกห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
> - <a:emoji_10:1449150901628440767> <#${oldState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> กลับมาคุยกันใหม่ได้น้า  
** ╰ ┈ ✧ :xSwift Hub 🐼 ┆ • ➵ BY Zemon Źx **`);
    client.channels.cache.get(logLeaveChannel)?.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
