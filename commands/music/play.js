const Discord = require("discord.js");
const ytdl = require('ytdl-core');

module.exports = {
    name: 'djplay',
    description: 'A simple ping to the bot to see if it will respond.',
    aliases: ['djplay', 'play', 'queuesong', 'startmusic'],
    usage: '+djplay',
    async run (atlas, message, params, guildInfo) {
        let serverQueue = atlas.queue.get(message.guild.id);
        let voiceChannel = message.member.voiceChannel;
        let botChannel = message.guild.me.voiceChannel;

        if (!voiceChannel) {
            message.delete(2000);
            message.reply('You need to be in a voice channel to play music!').then(msg => msg.delete(5000));
            return;
        }
        if (!botChannel) {
            message.delete(2000);
            message.reply('I need to be in a voice channel to play music!').then(msg => msg.delete(5000));
            return;
        }
        if (voiceChannel !== botChannel) {
            message.delete(2000);
            message.reply('I need to be in the same channel as you to allow usage of this command.').then(msg => msg.delete(5000));
            return;
        }

        if (serverQueue === undefined) { //if for some reason bot goes down on server and still shows as connected to a voice server
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: guildInfo.volume,
                playing: false,
            };

            atlas.queue.set(message.guild.id, queueConstruct);

            queueConstruct.connection = await voiceChannel.join();
            serverQueue = atlas.queue.get(message.guild.id);
        }

        if (!message.guild.me.hasPermission('SPEAK')) {
            return message.reply('I need the permission [Speak] to play music!');
        }

        let songInfo = await ytdl.getInfo(params.join(" "));
        let song = {
            title: songInfo.title,
            url: songInfo.video_url,
            thumbnail: songInfo.thumbnail_url,
            author: {
                name: songInfo.author.name,
                avatar: songInfo.author.avatar,
                url: songInfo.author.user_url
            }
        };

        serverQueue.songs.push(song);
        console.log(serverQueue.songs);

        let songEmbed = new Discord.RichEmbed()
            .setAuthor("Added to Queue", message.author.avatarURL)
            .setThumbnail(song.thumbnail)
            .setDescription(`**[${song.title}](${song.url})**`)
            .setColor("#9d04bf")
            .addField("Channel", song.author.name, true)
            .addField("Position in Queue", serverQueue.songs.length, true);

        message.channel.send(songEmbed);

        if (!serverQueue.playing === true) stream(serverQueue);

        function stream(serverQueue) {
            let songToPlay = serverQueue.songs[0];
            serverQueue.playing = true;
            const streamFrom = ytdl(songToPlay.url, {
                quality: "highestaudio",
                highWaterMark: 1<<25
            });
            const streamOptions = {
                bitrate: '44100',
                passes: 3,
                volume: serverQueue.volume
            };
            const dispatcher = serverQueue.connection.playStream(streamFrom, streamOptions);
            message.channel.send(`**Now Playing** - \`${songToPlay.title}\``);
            dispatcher.on('end', end => {
                console.log(end);
                serverQueue.songs.shift();
                console.log(serverQueue.songs.length);
                if (serverQueue.songs.length > 0) stream(serverQueue);
                else {
                    serverQueue.playing = false;
                    dispatcher.setSpeaking(false);
                }
            });
            dispatcher.on('error', error => {
                console.error(error);
            });
        }
    }
};