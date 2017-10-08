// todo:
// ```lily ...``` addressing
// scratch files auto gen directories n stuff
// lilypond functions
// more elegant logging system?? use console objects features??
// more elegant javascript in general :3
// proper commands listing
// permissions based on server roles?
// use discord emoji yo
// give arguments to most commands so you can call commands for other users

// libraries
const { spawn } = require("child_process");
const fs = require("fs");
const discord = require("discord.js");

// config
const config = require("./config");

// timers are for leaving voice channels when not used for a while
const playingStatus = {};
const dispatchers = {};
const timers = {};

/* EXTERNAL COMMANDS */

// render a midi file to a wav file with timidity
function renderMidi(inFile, outFile, callback)
{
	const { spawn } = require("child_process");
        const child = spawn("timidity", [`${inFile}.mid`, "-Ow", "-o", `${outFile}.wav`]);
        
        child.stdout.on("data", (data) => {
		if(config.testing) console.log(`timidity: ${data}`);
        });
        
        child.stderr.on("data", (data) => {
		if(config.testing) console.error(`timidity: ${data}`);
        });
        
        child.on("close", (code) => {
		if(config.testing || code) console.log(`timidity exit code: ${code}`);
		if(callback) callback();
        });
}

/* BOT UTILITY FUNCTIONS */

// get the scratch directory for a user
function getUserScratchPath(user)
{
	return `${config.scratchDirectory}/user_${user.id}`;
}

// get the scratch directory for a guild
function getGuildScratchPath(guild)
{
	return `${config.scratchDirectory}/guild_${guild.id}`;
}

// get the scratch file of an extension for a user
function getUserScratchFile(user, extension)
{
	return `${getUserScratchPath(user)}/scratch.${extension}`;
}

// get the scratch file of an extension for a guild
function getGuildScratchFile(guild, extension)
{
	return `${getGuildScratchPath(guild)}/scratch.${extension}`;
}

// get the voice connection (if connected) of a guild
function getVoiceConnection(guild)
{
	return client.voiceConnections.filter((connection) => {
		return guild.id === connection.channel.guild.id;
	}).first();
}

// is the bot playing in this guild?
function isPlaying(guild)
{
	return playingStatus[guild.id];
}

// id like play sound and stop sound to be CHANNEL dependant, not guild
// play a sound file in a guild in response to message
function playSound(file, guild)
{
	const voiceConnection = getVoiceConnection(guild);
	dispatchers[guild.id] = voiceConnection.playFile(file);
	playingStatus[guild.id] = true;

	dispatchers[guild.id].on("end", () => {
		stopSound(guild);
	});

	dispatchers[guild.id].on("error", error => {
		console.log(`\t->Error playing file:\n${error}`);
	});
}

// stop playing in a guild if it is
// return false if wasn't playing
function stopSound(guild)
{
	if(!playingStatus[guild.id]) return false;
	dispatchers[guild.id].end();
	playingStatus[guild.id] = false;
	return true;
}

// reset the auto leave timer for this guild because it was used
function voiceEvent(guild)
{
	clearTimer(guild);
	timers[guild.id] = setTimeout(() => {
		const voiceConnection = getVoiceConnection(guild);
		if(voiceConnection)
		{
			voiceConnection.disconnect();
			sendBotString("onAutoLeaveVoiceChannel", (msg) => getBotChannel(guild).send(msg));
		}
	}, config.autoLeaveTimout * 1000);
}

// clear the voice auto leave timer for a guild
function clearTimer(guild)
{
	if(timers[guild.id]) clearTimeout(timers[guild.id]);
}

// get the designated bot channel for the guild
// for now just the first channel with the name specified in the config
function getBotChannel(guild)
{
	return guild.channels.filter((channel) => {
		return channel.name === config.botChannel;
	}).first();
}

// send discord messages safely
// and properly split up messages longer than _limit_ characters
// callback is the send function for the first chunk
// tail is for the rest
function safeSend(msg, callback, callbackTail, chunkDelimiter="\n", charLimit=1800)
{
	if(!msg.trim().length) return;
	var first = msg;
	var rest = "";
	// make this safer so it aborts if something can't be split small enough
	while(first.length > charLimit)
	{
		if(first.indexOf(chunkDelimiter) == -1)
		{
			console.log("\t-> Can't split message into small enough pieces:");
			console.log(`{${first}}\n`);
			console.log("\t<-!!");
			return;
		}
		rest = first.split(chunkDelimiter).slice(-1).concat([rest]).join(chunkDelimiter);
		first = first.split(chunkDelimiter).slice(0, -1).join(chunkDelimiter);
	}
	callback(first);
	safeSend(rest, callbackTail, callbackTail, chunkDelimiter, charLimit);
}

// send a bot string from config file
// with optional stuff after it (arg)
function sendBotString(string, headSendFunction, tailSendFunction, arg="", chunkDelimiter, charLimit)
{
	const stringObj = config.botStrings[string];
	const msg = stringObj.string + arg;
	if(stringObj.enabled) safeSend(msg, headSendFunction, tailSendFunction, chunkDelimiter, charLimit);
}

// reply to a message with msg
// mentions the user unless its private
function reply(message, msg)
{
	if(message.guild) message.reply(msg);
	else message.channel.send(msg);
}

/* COMMAND FUNCTIONS AND INFRASTRUCTURE */

// just perform the join of the voice channel of the member of the message
function doJoin(message, verbose=true)
{
	message.member.voiceChannel.join().then(connection => {
		if(verbose) sendBotString("onJoinVoiceChannel", (msg) => reply(message, msg));
	}).catch(console.log);
	voiceEvent(message.guild);
}

// a "subcommand" to try to auto join a channel if set in config , if not already in there
// return whether in or getting in
function tryAutoJoin(message)
{
	if(getVoiceConnection(message.guild)) return true;
	else if(config.autoJoin)
	{
		doJoin(message, false);
		return true;
	}
	else return false;
}

// a "subcommand" to try to auto stop a tune if set in config , if one is playing already
// return whether stopped
function tryAutoStop(message)
{
	if(!isPlaying(message.guild)) return true;
	else if(config.autoStop)
	{
		stopSound(message.guild);
		return true;
	}
	else return false;
}

// a "subcommand" to handle wanting to play something
// returns whether can play or not
function requestToPlay(message)
{
	if(!message.guild) sendBotString("onPrivatePlayFail", (msg) => reply(message, msg));
	else if(!tryAutoJoin(message)) sendBotString("onNotInVoiceChannel", (msg) => reply(message, msg));
	else if(!tryAutoStop(message)) sendBotString("onAlreadyPlayingTune", (msg) => reply(message, msg));
	else return true;
	return false;
}

// join the voice channel of the author
function joinVoiceChannel(message)
{
	if(!message.guild) sendBotString("onPrivateJoinVoiceChannelFail", (msg) => reply(message, msg));
	else if(message.member.voiceChannel) doJoin(message);
	else sendBotString("onJoinVoiceChannelFail", (msg) => reply(message, msg));
}

// leave the voice channel its in
function leaveVoiceChannel(message)
{
	if(!message.guild) sendBotString("onPrivateLeaveVoiceChannelFail", (msg) => reply(message, msg));
	else
	{
		const voiceConnection = getVoiceConnection(message.guild);
		if(!voiceConnection) sendBotString("onLeaveVoiceChannelFail", (msg) => reply(message, msg));
		else
		{
			voiceConnection.disconnect();
			sendBotString("onLeaveVoiceChannel", (msg) => reply(message, msg));
		}
		clearTimer(message.guild);
	}
}

// respond with playing the tune
function playTune(tune, message)
{
	if(requestToPlay(message))
	{
		try
		{
			// this is going to be totally redone
			playSound(getGuildScratchFile(message.guild), message.guild);
		}
		catch(error)
		{
			console.log(`\t-> Invalid musical expression!\n${error}`);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		}
		voiceEvent(message.guild);
	}
}

// repeat the last tune
function repeatTune(message)
{
	if(requestToPlay(message))
	{
		playSound(getGuildScratchFile(message.guild, "wav"), message.guild);
		sendBotString("onEncore", (msg) => reply(message, msg));
		voiceEvent(message.guild);
	}
}

// stop playing in the channel of the guild the message is from
function stopPlayingTune(message)
{
	if(message.guild && stopSound(message.guild))
	{
		sendBotString("onStopTune", (msg) => reply(message, msg));
		voiceEvent(message.guild);
	}
	else sendBotString("onNotPlayingTune", (msg) => reply(message, msg));
}

// respond to the message with examples
function requestExamples(message)
{
	// get the list of example strings
	const ls = Object.keys(config.examples).map((key) => {
		const example = config.examples[key];
		return `**${key}**:${ example.credit ? ` _(sequenced by ${example.credit})_` : " " }\`\`\`${config.trigger}${example.example}\`\`\``;
	});
	sendBotString("onExampleRequest", (msg) => reply(message, msg), (msg) => message.channel.send(msg), `\n\n${ls.join("\n\n")}`, "\n\n");
}

// respond with help message
function requestHelp(message)
{
	sendBotString("onHelpRequest", (msg) => reply(message, msg), (msg) => message.channel.send(msg));
}

// respond with tutorial message
function requestTutorial(message)
{
	sendBotString("onTutorialRequest", (msg) => reply(message, msg), (msg) => message.channel.send(msg));
}

// respond with discord server invite link in private messages
function requestInviteLink(message)
{
	sendBotString("onInviteLinkRequest", (msg) => message.author.send(msg));
}

// respond with github link in private messages
function requestGithubLink(message)
{
	sendBotString("onGithubLinkRequest", (msg) => message.author.send(msg));
}

// map of commands
const commands = {};

// add a command to the commands map
// names is all the aliases of the command
// f is the command function
function registerCommand(names, f)
{
	names.map((v) => {
		commands[v] = f;
	});
}

// register the commands
registerCommand(["join", "voice", "enter", "hello", "come", "comeon", "here"], (arg, args, message) => joinVoiceChannel(message));
registerCommand(["leave", "exit", "part", "bye", "get", "shoo", "goaway", "nasty"], (arg, args, message) => leaveVoiceChannel(message));
registerCommand(["play", "tune"], (arg, args, message) => playTune(arg, message));
registerCommand(["stop", "quit", "quiet", "end"], (arg, args, message) => stopPlayingTune(message));
registerCommand(["again", "repeat", "encore"], (arg, args, message) => repeatTune(message));
registerCommand(["help", "commands", "about", "info"], (arg, args, message) => requestHelp(message));
registerCommand(["tutorial", "composing", "how", "howto"], (arg, args, message) => requestTutorial(message));
registerCommand(["examples", "example", "tunes", "songs", "list", "songlist", "tunelist", "sample", "samples", "juke", "jukebox"], (arg, args, message) => requestExamples(message));
registerCommand(["invite", "link", "server", "discord"], (arg, args, message) => requestInviteLink(message));
registerCommand(["github", "git", "code", "dev", "developer", "creator", "about", "writer", "author", "owner"], (arg, args, message) => requestGithubLink(message));

/* MAIN BOT INTERFACE */

// executes a command
// given cmd name, arg string, args list, and originating discord message
function executeCommand(cmd, arg, args, message)
{
	// get the command function and call it
	// return false if command doesn't exist
	const command = commands[cmd];
	if(command) command(arg, args, message);
	else return false;
	return true;
}

// process a message to the bot
// the message string, and the originating discord message object
function processBotMessage(msg, message)
{
	// cmd is case insensitive, args retain case
	const words = msg.split(/\s+/g);
	const cmd = words[0].toLowerCase();
	const arg = words.slice(1).join(" ");
	// remove empty args
	const args = words.slice(1).filter((v) => {
		return v.length;
	});

	// execute the command
	// assume play function if none other found
	if(!executeCommand(cmd, arg, args, message))
		commands.play(msg, words, message);
}

// remove mentions of the bot from a message
function removeMentions(msg)
{
	const mention = `<@${client.user.id}>`;
	return msg.replace(new RegExp(mention, "g"), "");
}

// make the discord connection
const client = new discord.Client();

// once its all connected and good to go
client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
	// set the discord presence to show how to get help
	client.user.setGame(`${config.trigger}help`);
});

// on message recieve
client.on("message", message => {
	// ignore messages from self
	if(client.user.id === message.author.id) return;

	// figure out if a message is directed at the bot or not
	// and extract the intended message to the bot
        const content = message.content.trim();
        const dm = !message.guild;
        const triggered = content.startsWith(config.trigger);
	const mentioned = message.mentions.users.has(client.user.id);
	const inBotChannel = message.channel.name === config.botChannel;
	const blockCodeHead = `\`\`\`${config.blockCodeAlias}\n`;
	const blockCode = content.indexOf(blockCodeHead) != -1;
	const clean = mentioned ? removeMentions(content).trim() : content;
	// i don't like that this is var and not const
	var msg = triggered ? clean.slice(config.trigger.length).trim() : clean;
	if(msg.length && (dm || triggered || mentioned || inBotChannel || blockCode))
	{
		// first check to see if it was addressed by code block
		// if so, extract the intended command from the message
		if(blockCode)
		{
			// if it was given code blocks, the first block is the arg string
			// and the command is the first word (if any)
			// i find this ugly parsing, allowing for unclosed blocks and all, w/e
			const parts = msg.split(blockCodeHead);
			const words = parts[0].split(/\s+/g);
			const cmd = words[0].toLowerCase();
			const arg = parts[1].split("```")[0].trim();
			// reform the msg from the cmd and the arg from the code block
			// only include cmd if it is a known command
			msg = (commands[cmd] ? [cmd] : []).concat([arg]).join(" ");
		}

		// log received message directed at the bot
		if(dm) console.log(`${message.author.tag}> ${msg}`);
		else console.log(`${message.guild.name}> #${message.channel.name}> ${message.author.tag}> ${msg}`);

		// go handle the message to the bot
		processBotMessage(msg, message);
	}
});

// load the token from file and login
function main()
{
	const token = fs.readFileSync("token.txt", "ascii").trim();
	client.login(token);
}

// run the bot!
main();
