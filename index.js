import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
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

const commands = [
  new SlashCommandBuilder()
    .setName("joinvoice")
    .setDescription("ให้บอทเข้าห้องเสียงค้าง 24/7 (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("voice")
        .setDescription("เลือกห้องเสียง")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("logjoin")
    .setDescription("ตั้งช่อง log เวลาเข้า VC (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("เลือกช่องข้อความ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("logleave")
    .setDescription("ตั้งช่อง log เวลาออก VC (เฉพาะเจ้าของ)")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("เลือกช่องข้อความ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
]
.map(cmd => cmd.setDefaultMemberPermissions(PermissionFlagsBits.Administrator))
.map(cmd => cmd.toJSON());

client.once("ready", async () => {
  console.log(`🟢 Bot online: ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  for (const [guildId] of client.guilds.cache) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands }
      );
      console.log(`Slash Ready for ${guildId}`);
    } catch (err) {
      console.error("Slash error:", err);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.user.id !== ADMIN_ID)
    return interaction.reply({ content: "❌ ไม่อนุญาตใช้นะ", ephemeral: true });

  if (interaction.commandName === "joinvoice") {
    targetVoiceChannel = interaction.options.getChannel("voice");
    joinVoiceChannel({
      channelId: targetVoiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
    return interaction.reply(
      `🟢 บอทเข้าห้องเสียง <#${targetVoiceChannel.id}> แล้วค้าบ 24/7`
    );
  }

  if (interaction.commandName === "logjoin") {
    logJoinChannel = interaction.options.getChannel("channel").id;
    return interaction.reply(
      `🟢 Log เข้าเสียงจะถูกส่งไปที่ <#${logJoinChannel}>`
    );
  }

  if (interaction.commandName === "logleave") {
    logLeaveChannel = interaction.options.getChannel("channel").id;
    return interaction.reply(
      `🟢 Log ออกเสียงจะถูกส่งไปที่ <#${logLeaveChannel}>`
    );
  }
});

setInterval(() => {
  if (!targetVoiceChannel) return;
  const conn = getVoiceConnection(targetVoiceChannel.guild.id);
  if (!conn) {
    try {
      joinVoiceChannel({
        channelId: targetVoiceChannel.id,
        guildId: targetVoiceChannel.guild.id,
        adapterCreator: targetVoiceChannel.guild.voiceAdapterCreator,
      });
    } catch (err) {}
  }
}, 5000);

client.on("voiceStateUpdate", (oldState, newState) => {
  const user = newState.member.user;

  if (!oldState.channelId && newState.channelId && logJoinChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`# 🟢 <@${user.id}> ได้เข้าห้องเสียงแล้ว`)
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1449115719479590984/1451221912259923989/a64f8f38ab161df88f85f035eaa12cb7.jpg"
      )
      .setDescription(`
> - <a:emoji_10:1449150901628440767> <#${newState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> พูดคุยให้สนุกนะคะ  
** ╭┈ ✧ : เข้าห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
** ╰ ┈ ✧ :xSwift Hub 🐼 ┆ • ➵ BY Zemon Źx **`);
    client.channels.cache.get(logJoinChannel)?.send({ embeds: [embed] });
  }

  if (oldState.channelId && !newState.channelId && logLeaveChannel) {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`# 🔴 <@${user.id}> ได้ออกห้องเสียงแล้ว`)
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1449115719479590984/1451221912670830612/a9b8cf03aafc0ed58b542e03d281dd2f.jpg"
      )
      .setDescription(`
> - <a:emoji_10:1449150901628440767> <#${oldState.channelId}>
> - <a:emoji_19:1449151254189314150> ${thaiTime()}
> - <a:emoji_34:1450185126901321892> กลับมาพูดคุยใหม่ได้น้า  
** ╭┈ ✧ : ออกห้องเสียง ˗ˏˋ꒰ <a:emoji_2:1449148118690959440> ꒱ **
** ╰ ┈ ✧ :xSwift Hub 🐼 ┆ • ➵ BY Zemon Źx **`);
    client.channels.cache.get(logLeaveChannel)?.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
