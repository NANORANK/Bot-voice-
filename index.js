
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const TOKEN = ''; // ใส่โทเค่นบอท
const ADMIN_IDS = ['1352630562812067930']; // ใส่ไอดีแอดมินคนที่จะใช้คำสั่งบอทได้

const green = 0x00ff00;
const red = 0xff0000;
const blue = 0x0099ff;

function createBadgeMenuEmbed() {
    return new EmbedBuilder()
        .setTitle('``🏆`` ระบบรับตรา HypeSquad Badges')
        .setDescription('<:Hypesquad_Bravery:1386992784417886248> **Bravery** - สำหรับผู้กล้าหาญ\n<:Hypesquad_Brilliance:1386992779229401149> **Brilliance** - สำหรับผู้ฉลาด\n<:Hypesquad_Balance:1386992773848371251> **Balance** - สำหรับผู้สมดุล')
        .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1415999280262676492/e5b3508e-ccc8-43f9-a693-276517c1cc47.gif?ex=68c53f98&is=68c3ee18&hm=5d4df97b589aed222ba7680455d87515ab5702ceafef841995b556366c28ecdb&');
}

function createBadgeSelectMenu() {
    return new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('badge_menu')
                .setPlaceholder('[ 🏆 เลือกบ้าน HypeSquad ที่ต้องการ ]')
                .addOptions([
                    {
                        label: 'HypeSquad Bravery',
                        description: '🔥 • สมัครเข้าบ้านผู้กล้าหาญ',
                        value: 'bravery',
                        emoji: '<:Hypesquad_Bravery:1386992784417886248>'
                    },
                    {
                        label: 'HypeSquad Brilliance',
                        description: '⚡ • สมัครเข้าบ้านผู้ฉลาด',
                        value: 'brilliance',
                        emoji: '<:Hypesquad_Brilliance:1386992779229401149>'
                    },
                    {
                        label: 'HypeSquad Balance',
                        description: '🌟 • สมัครเข้าบ้านผู้สมดุล',
                        value: 'balance',
                        emoji: '<:Hypesquad_Balance:1386992773848371251>'
                    },
                    {
                        label: 'ล้างตัวเลือกใหม่',
                        value: 'refresh_menu',
                        emoji: '<:Ldelete:1387382890781999115>'
                    }
                ])
        );
}

function createBadgeButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('info_badge')
                .setLabel('꒰ HypeSquad คืออะไร? ꒱')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<a:green_cycle:1403018466562408658>'),
            new ButtonBuilder()
                .setCustomId('remove_badge')
                .setLabel('꒰ ลบตราออก ꒱')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('<a:red_cycle:1403018523604942858>')
        );
}

function createBadgeInfoEmbed() {
    return new EmbedBuilder()
        .setTitle('``📖`` ตรา HypeSquad คืออะไร?')
        .setDescription('**HypeSquad** เป็นโปรแกรมชุมชนของ Discord ที่แบ่งออกเป็น 3 บ้าน:\n\n' +
            '<:Hypesquad_Bravery:1386992784417886248> **HypeSquad Bravery (กล้าหาญ)**\n' +
            '• สำหรับผู้ที่ชอบการผจญภัยและท้าทาย\n' +
            '• มีสีแดงเป็นสัญลักษณ์\n\n' +
            '<:Hypesquad_Brilliance:1386992779229401149> **HypeSquad Brilliance (ฉลาด)**\n' +
            '• สำหรับผู้ที่ชอบแก้ปัญหาและคิดเชิงกลยุทธ์\n' +
            '• มีสีม่วงเป็นสัญลักษณ์\n\n' +
            '<:Hypesquad_Balance:1386992773848371251> **HypeSquad Balance (สมดุล)**\n' +
            '• สำหรับผู้ที่ชอบสร้างสมดุลและความสงบ\n' +
            '• มีสีเขียวเป็นสัญลักษณ์\n\n' +
            '``🍀`` **เมื่อเข้าร่วม HypeSquad จะได้ป้ายพิเศษบนโปรไฟล์ และสิทธิ์ร่วมกิจกรรมพิเศษจาก Discord**'
                        )
        .setColor(blue)
        .setImage('https://cdn.discordapp.com/attachments/1373550875435470869/1416002048725352481/images.png?ex=68c5422c&is=68c3f0ac&hm=8def107f0ec3e73c042ecc9ba310bb37b30d7b3a9ce8ec448c4653499e93b720&');
}

function createTokenModal(customId, title) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const tokenInput = new TextInputBuilder()
        .setCustomId('user_token')
        .setLabel('🔑 : User Token')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('โทเค่นผู้ใช้งานของคุณ')
        .setRequired(true)
        .setMaxLength(200);

    const actionRow = new ActionRowBuilder().addComponents(tokenInput);
    modal.addComponents(actionRow);

    return modal;
}

async function hypesquadAPI(userToken, action, houseId = null) {
    try {
        const headers = {
            'Authorization': userToken,
            'Content-Type': 'application/json'
        };

        let response;
        if (action === 'join') {
            response = await axios.post('https://discord.com/api/v9/hypesquad/online', {
                house_id: houseId
            }, { headers });
        } else if (action === 'remove') {
            response = await axios.delete('https://discord.com/api/v9/hypesquad/online', { headers });
        }
        
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data || error.message };
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
});

client.once('ready', async () => {
    console.log(`[STATUS] ✅ บอท: ${client.user.tag} พร้อมทำงาน`);

    const commands = [
        new SlashCommandBuilder()
            .setName('setup_badge')
            .setDescription('[ADMIN] 🏆 ตั้งค่าเมนูรับตรา HypeSquad Badges')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('📌 เลือกช่องที่จะส่งเมนู')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ];

    try {
        await client.application.commands.set(commands);
        console.log('[SUCCESS] ✅ ลงทะเบียนคำสั่งบอทสำเร็จ');
    } catch (error) {
        console.error('[ERROR] ❌ ไม่สามารถลงทะเบียนคำสั่งบอทได้:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === 'setup_badge') {
            if (!ADMIN_IDS.includes(interaction.user.id)) {
                const noPermission = new EmbedBuilder()
                    .setTitle('``❌`` คุณไม่มีสิทธิ์ใช้คำสั่งนี้')
                    .setColor(red);
                return interaction.reply({ embeds: [noPermission], ephemeral: true });
            }

            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                const invaildCn = new  EmbedBuilder()
                .setTitle('``❌`` กรุณาเลือกช่องข้อความที่ถูกต้อง')
                .setColor(red);
                return interaction.reply({ embeds: [invaildCn], ephemeral: true });
            }

            const embed = createBadgeMenuEmbed();
            const selectMenu = createBadgeSelectMenu();
            const buttons = createBadgeButtons();

            try {
                await channel.send({ embeds: [embed], components: [selectMenu, buttons] });
                const sent = new EmbedBuilder()
                    .setTitle('``✅`` ส่งเมนูสำเร็จ')
                    .setColor(green);
                await interaction.reply({ embeds: [sent], ephemeral: true });
            } catch (error) {
                const failed = new EmbedBuilder()
                    .setTitle('``❌`` ส่งเมนูไม่สำเร็จ')
                    .setColor(red);
                await interaction.reply({ embeds: [failed], ephemeral: true });
            }
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'badge_menu') {
            const selectedValue = interaction.values[0];

            if (selectedValue === 'refresh_menu') {
                const embed = createBadgeMenuEmbed();
                const selectMenu = createBadgeSelectMenu();
                const buttons = createBadgeButtons();
                return interaction.update({ embeds: [embed], components: [selectMenu, buttons] });
            }

            const modal = createTokenModal(`token_modal_${selectedValue}`, '🔑 กรอก User Token');
            await interaction.showModal(modal);
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'info_badge') {
            const infoEmbed = createBadgeInfoEmbed();
            return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        }

        if (interaction.customId === 'remove_badge') {
            const modal = createTokenModal('remove_token_modal', '🗑️ ลบตรา HypeSquad');
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'remove_token_modal') {
            const userToken = interaction.fields.getTextInputValue('user_token');

            const processingEmbed = new EmbedBuilder()
                .setTitle('``🗑️`` กำลังลบตราให้คุณ...')
                .setColor(blue);
            await interaction.reply({ embeds: [processingEmbed], ephemeral: true });


            try {
                const result = await hypesquadAPI(userToken, 'remove');

                if (result.success) {
                    const successEmbed = new EmbedBuilder()
                        .setTitle('``✅`` ลบตรา HypeSquad เรียบร้อยแล้ว')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setColor(green);

                    await interaction.editReply({ embeds: [successEmbed] });
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('``❌`` เกิดข้อผิดพลาด')
                        .setDescription('**```\n• User Token ไม่ถูกต้อง\n• คุณไม่มีตรา HypeSquad อยู่แล้ว\n• เกิดข้อผิดพลาดจาก Discord API```**')
                        .setColor(red);
                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('``❌`` เกิดข้อผิดพลาดของระบบ')
                    .setColor(red);

                await interaction.editReply({ embeds: [errorEmbed] });
                console.error('[ERROR] ❌ Remove HypeSquad API Error:', error);
            }
        }

        if (interaction.customId.startsWith('token_modal_')) {
            const houseType = interaction.customId.split('_')[2];
            const userToken = interaction.fields.getTextInputValue('user_token');

            const processingEmbed = new EmbedBuilder()
                .setTitle('``🔃`` กำลังรับตราให้คุณ...')
                .setColor(blue);
            await interaction.reply({ embeds: [processingEmbed], ephemeral: true });

            const houseMap = {
                'bravery': 1,
                'brilliance': 2,
                'balance': 3
            };

            const houseNames = {
                'bravery': '<:Hypesquad_Bravery:1386992784417886248> HypeSquad Bravery',
                'brilliance': '<:Hypesquad_Brilliance:1386992779229401149> HypeSquad Brilliance',
                'balance': '<:Hypesquad_Balance:1386992773848371251> HypeSquad Balance '
            };

            const houseConsole = {
                'bravery': '🔥 HypeSquad Bravery',
                'brilliance': '⚡ HypeSquad Brilliance',
                'balance': '🌟 HypeSquad Balance'
            };

            const houseConsolelog = houseConsole[houseType];
            const houseId = houseMap[houseType];
            const houseName = houseNames[houseType];

            try {
                const result = await hypesquadAPI(userToken, 'join', houseId);

                if (result.success) {
                    const successEmbed = new EmbedBuilder()
                        .setTitle(`\`\`✅\`\` รับตรา ${houseName} เรียบร้อยแล้ว`)
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setColor(green);

                    await interaction.editReply({ embeds: [successEmbed] });
                    console.log(`[CLAIMED] ✅ ผู้ใช้: ${interaction.user.id} รับตรา ${houseConsolelog} สำเร็จ`)
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('``❌`` เกิดข้อผิดพลาด')
                        .setDescription('**```\n• User Token ไม่ถูกต้อง\n• เกิดข้อผิดพลาดจาก Discord API```**')
                        .setColor(red);
                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('``❌`` เกิดข้อผิดพลาดของระบบ')
                    .setColor(red);

                await interaction.editReply({ embeds: [errorEmbed] });
                console.error('[ERROR] ❌ HypeSquad API Error:', error);
            }
        }
    }
});

client.login(TOKEN);
