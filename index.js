const { Client, GatewayIntentBits } = require('discord.js');
const { token, defaultGuildId, additionalGuildIds } = require('./config.json');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

// Importuj komendy slash
const cdCommand = require('./commands/cd');
const clearcdCommand = require('./commands/clearcd');
const robloxCommand = require('./commands/roblox');
const verifyCommand = require('./commands/verify');
const whoisCommand = require('./commands/whois');
const checkCommand = require('./commands/check');
const dodajCommand = require('./commands/dodaj');
const usunCommand = require('./commands/usun');
const stanCommand = require('./commands/stan');
const wezwijCommand = require('./commands/wezwij');
const klubdodajCommand = require('./commands/klub-dodaj');
const wzmienCommand = require('./commands/wzmien');
const klubusunCommand = require('./commands/klub-usun');

// Stwórz nową instancję klienta
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] }); // Dodano intenty głosowe

// Przypisz komendy do klienta
client.commands = new Map([
  [cdCommand.data.name, cdCommand],
  [clearcdCommand.data.name, clearcdCommand],
  [robloxCommand.data.name, robloxCommand],
  [verifyCommand.data.name, verifyCommand],
  [whoisCommand.data.name, whoisCommand],
  [checkCommand.data.name, checkCommand],
  [dodajCommand.data.name, dodajCommand],
  [usunCommand.data.name, usunCommand],
  [stanCommand.data.name, stanCommand],
  [wezwijCommand.data.name, wezwijCommand],
  [klubdodajCommand.data.name, klubdodajCommand],
  [wzmienCommand.data.name, wzmienCommand],
  [klubusunCommand.data.name, klubusunCommand],
]);

// Gdy klient jest gotowy, wykonaj ten kod (tylko raz).
client.once('ready', async () => {
    console.log(`Gotowy! Zalogowano jako ${client.user.tag}`);

    // Rejestruj komendy slash na serwerach
    registerSlashCommands().catch(error => {
        console.error('Błąd podczas rejestracji komend slash:', error);
    });
});

// Funkcja do rejestracji komend slash
async function registerSlashCommands() {
    const commands = Array.from(client.commands.values()).map(command => command.data?.toJSON() || {});
    try {
        const defaultGuild = await client.guilds.fetch(defaultGuildId);
        await defaultGuild.commands.set(commands);
        console.log('Zarejestrowano komendy slash na domyślnym serwerze!');

        // Rejestruj komendy na dodatkowych serwerach
        for (const guildId of additionalGuildIds) {
            const guild = await client.guilds.fetch(guildId);
            await guild.commands.set(commands);
            console.log(`Zarejestrowano komendy slash na serwerze o ID ${guildId}!`);
        }
    } catch (error) {
        console.error('Błąd podczas rejestracji komend slash:', error);
    }
}

// Nasłuchuj interakcje użytkowników
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Błąd podczas wykonywania komendy slash:', error);
        await interaction.reply({ content: 'Wystąpił błąd podczas wykonywania tej komendy!', ephemeral: true });
    }
});

// Nasłuchuj zmiany stanu głosowego
client.on('voiceStateUpdate', async (oldState, newState) => {
    const targetChannelId = '1231989811473154213';

    // Funkcja do opuszczania kanału, gdy jest pusty
    const checkAndLeaveIfEmpty = async (channel) => {
        if (channel.members.filter(member => !member.user.bot).size === 0) {
            const connection = getVoiceConnection(channel.guild.id);
            if (connection) {
                connection.destroy();
                console.log(`Opuszczono kanał ${channel.name} w serwerze ${channel.guild.name} ponieważ jest pusty.`);
            }
        }
    };

    // Sprawdzanie czy ktoś dołączył do kanału docelowego
    if (newState.channelId === targetChannelId && !newState.member.user.bot) {
        try {
            const connection = joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
            });

            const stream = ytdl('https://www.youtube.com/watch?v=DiaLMuUQYaw', { filter: 'audioonly' });
            const resource = createAudioResource(stream);

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => connection.destroy());
            player.on('error', error => {
                console.error(`Błąd: ${error.message}`);
                connection.destroy();
            });

            // Nasłuchuj rozłączenia
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    connection.destroy();
                }
            });

        } catch (error) {
            console.error('Błąd podczas dołączania do kanału głosowego:', error);
        }
    }

    // Sprawdzanie czy ktoś opuścił kanał docelowy
    if (oldState.channelId === targetChannelId && oldState.channel.members.size > 0) {
        checkAndLeaveIfEmpty(oldState.channel);
    }
});

// Zaloguj się do Discorda za pomocą tokenu twojego klienta
client.login(token);
