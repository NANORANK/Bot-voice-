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
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus
} from "@discordjs/voice";
import "@discordjs/opus";
import sodium from "libsodium-wrappers";
import dotenv from "dotenv";
dotenv.config();
await sodium.ready;

const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const TZ = process.env.TIMEZONE || "Asia/Bangkok";
const MEMBER_ROLE = "1449125703487459530";

let targetVoiceChannel = null;
let logJoinChannel = null;
let logLeaveChannel = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
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
    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
      debug: false
    });
    await entersState(conn, VoiceConnectionStatus.Ready, 15_000);
    console.log(`Joined VC: ${channel.id}`);
  } catch (err) {
    console.log("VC Join error:", err.message);
  }
};

const leaveVC = (guild) => {
  try {
    const conn = getVoiceConnection(guild.id);
    if (conn) conn.destroy();
  } catch {}
};

// =========================== SLASH COMMANDS ===========================
const commands = [
  new SlashCommandBuilder()
    .setName("setupvoice")
    .setDescription(" ")
    .addChannelOption(opt =>
      opt.setName("voice")
        .setDescription(" ")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("leavevoice")
    .setDescription(" "),

  new SlashCommandBuilder()
    .setName("setjoinlog")
    .setDescription(" ")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription(" ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setleavelog")
    .setDescription(" ")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription(" ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setserver")
    .setDescription(" ")
    .addStringOption(opt =>
      opt.setName("type")
        .setDescription(" ")
        .setRequired(true)
        .addChoices(
          { name: "ห้องแชทปกติ", value: "text" },
          { name: "ห้องเสียง", value: "voice" }
        )
    )
]
  .map(c => c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator))
  .map(c => c.toJSON());

// =========================== READY ===========================

client.once("ready", async () => {
  console.log(`🟢 Bot Online: ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  for (const [gid] of client.guilds.cache) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, gid),
        { body: commands }
      );
    } catch {}
  }
});

// =========================== COMMAND LOGIC ===========================

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
    leaveVC(i.guild);
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

  if (i.commandName === "setserver") {
    const type = i.options.getString("type");

    // CREATE CATEGORY
    const category = await i.guild.channels.create({
      name: "📊・ยอดคนในเซิร์ฟ",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: i.guild.roles.everyone,
          deny: ["Connect", "SendMessages", "ViewChannel"]
        },
        {
          id: MEMBER_ROLE,
          allow: ["ViewChannel"],
          deny: ["SendMessages", "Connect"]
        }
      ]
    });

    const total = await i.guild.members.fetch();
    const humans = total.filter(m => !m.user.bot).size;
    const bots = total.filter(m => m.user.bot).size;

    const base = {
      parent: category.id,
      permissionOverwrites: [
        {
          id: i.guild.roles.everyone,
          allow: ["ViewChannel"],
          deny: ["SendMessages", "Connect"]
        },
        {
          id: MEMBER_ROLE,
          allow: ["ViewChannel"],
          deny: ["SendMessages", "Connect"]
        }
      ]
    };

    const nameType = (str) => type === "voice"
      ? { ...base, type: ChannelType.GuildVoice, name: str }
      : { ...base, type: ChannelType.GuildText, name: str };

    await i.guild.channels.create(nameType(`📊・ยอดคนในเซิร์ฟ : ${humans}`));
    await i.guild.channels.create(nameType(`♻️・สมาชิก & บอท : ${humans + bots}`));
    await i.guild.channels.create(nameType(`🔥・รวมพลทั้งหมด : ${total.size}`));

    return i.reply(`🟢 สร้างห้องแสดงยอดแล้วค้าบ`);
  }
});

// =========================== RECONNECT ===========================

setInterval(() => {
  if (!targetVoiceChannel) return;
  const conn = getVoiceConnection(targetVoiceChannel.guild.id);
  if (!conn || conn.state.status === VoiceConnectionStatus.Disconnected) {
    joinVC(targetVoiceChannel);
  }
}, 7000);

// =========================== VOICE LOGS ===========================

client.on("voiceStateUpdate", (oldState, newState) => {
  const user = newState.member?.user;
  if (!user) return;

  if (!oldState.channelId && newState.channelId && logJoinChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(` ** <a:emoji_46:1451252945424351310> <@${user.id}> ได้เข้าห้องเสียงแล้ว ** `)
      .setThumbnail("https://cdn.discordapp.com/attachments/1449115719479590984/1451221912259923989/a64f8f38ab161df88f85f035eaa12cb7.jpg")
      .setDescription(`
** ╭┈ ✧ : เข้าห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
> - <a:emoji_10:1449150901628440767> <#${newState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> คุยให้สนุกนะค้าบ  
** ╰ ┈ ✧ : <a:emoji_11:1449150928048361603> BY ┆ <a:emoji_12:1449150980179366024> • ➵ ซีม่อน **`);
    client.channels.cache.get(logJoinChannel)?.send({ embeds: [embed] });
  }

  if (oldState.channelId && !newState.channelId && logLeaveChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(` ** <a:emoji_46:1451253063980417075> <@${user.id}> ได้ออกห้องเสียงแล้ว ** `)
      .setThumbnail("https://cdn.discordapp.com/attachments/1449115719479590984/1451221912670830612/a9b8cf03aafc0ed58b542e03d281dd2f.jpg")
      .setDescription(`
** ╭┈ ✧ : ออกห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
> - <a:emoji_10:1449150901628440767> <#${oldState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> กลับมาคุยกันใหม่ได้น้า  
** ╰ ┈ ✧ : <a:emoji_11:1449150928048361603> BY ┆ <a:emoji_12:1449150980179366024> • ➵ ซีม่อน **`);
    client.channels.cache.get(logLeaveChannel)?.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
