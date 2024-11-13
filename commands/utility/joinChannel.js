const { SlashCommandBuilder, ChannelType } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { createAudioResource, createAudioPlayer, NoSubscriberBehavior, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const path = require('node:path');
const fs = require('node:fs');
const { clearTimeout } = require('node:timers');
let timeOutFunction;
let timeOut;
let minutesMin = MinutesToMiliseconds(0.5);
let minutesMax = MinutesToMiliseconds(35);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription("Bot joins a server voice channel")
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('the channel to join')
                .setRequired(true)
				.addChannelTypes(ChannelType.GuildVoice)),
	async execute(interaction) {
		let channel = interaction.options.getChannel('channel');
		
		await interaction.reply(`Joined ${channel}`);

        const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
		});
		
		await wait(2_000);

		connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
			console.log('Connection is in the Ready state!');
		});

		connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			} catch (error) {
				// Seems to be a real disconnect which SHOULDN'T be recovered from
				console.log("destroy connection");
				connection.destroy();
			}
		});

		StartRandomSound(channel);
	},
};

function StartRandomSound(connection){

	GenerateRandomTime();
	const resource = GetRandomAudio();
	if(timeOutFunction != null){
		clearTimeout(timeOutFunction);
	}
	timeOutFunction = setTimeout(PlaySoundAtTime, timeOut, resource, connection);
}

function GenerateRandomTime(){
	timeOut = Math.random() * (minutesMax - minutesMin) + minutesMin;
	console.log('next audio: ' + timeOut / 60000 + ' minutes');
}

function GetRandomAudio(){

	const foldersPath = path.join(__dirname, './../../audios');
	const audioFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.mp3'));
	let audios = [];

	for (const audio of audioFiles) {
		//console.log('audio: ' + audio);
        audios.push(audio);
	}

	let random = GenerateRandomInteger(0, audios.length - 1)

	return createAudioResource('./audios/' + audios[random]);

}

function MinutesToMiliseconds(minutes){
	return minutes * 60000;
}

const GenerateRandomInteger = (min, max) => {
	min = Math.ceil(min)
	max = Math.floor(max)
  
	let random = Math.floor(Math.random() * (max - min)) + min
	console.log('random integer ' + random);
	return random;
  }
  

function PlaySoundAtTime(resource, channel){

	const connection = getVoiceConnection(channel.guild.id);

	const player = createAudioPlayer({
		behaviors: {
			noSubscriber: NoSubscriberBehavior.Play,
		},
	});
	
	player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
		console.log('Audio player is in the Playing state!');
	});

	// Subscribe the connection to the audio player (will play audio on the voice connection)
	connection.subscribe(player);

	 try{
		 player.play(resource);
		 console.log('resource played!');
	 } catch (error) {
		 console.log('error playing resource: ' + error);
	 }

	 StartRandomSound(channel);//starts process again
}