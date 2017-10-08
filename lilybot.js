// todo:
// destinations -- per guild or per user if dm
// bot addressing modes:
//   ```lily ...``` addressing
//   ping addressing
//   dm addressing
//   dedicated channel addressing
//   bot trigger addressing
// invite link command
// github link
// scratch files
// lilypond functions
// more elegant logging system??
// more elegant javascript in general :3
// proper commands listing
// permissions based on server roles?

// libraries
const discord = require("discord.js");
const { spawn } = require("child_process");

// config
const config = require("./config");

// timers are for leaving voice channels when not used for a while
const playingStatus = {};
const dispatchers = {};
const timers = {};

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

// FIGURE THIS OUT
function getVoiceConnection(destination)
{
	for(var voiceChannel of client.voiceConnections)
	{
		if(destination.id === voiceChannel[1].channel.guild.id) return voiceChannel[1];
	}
}

// FIGURE THIS OUT......... 
// play a sound file in a destination (user or guild voice channel)
function playSound(file, destination)
{
	const voiceConnection = getVoiceConnection(destination);
	if(!voiceConnection)
	{
		sendBotString("onNotInVoiceChannel", (msg) => message.reply(msg));
	}
	else if(playingStatus[message.guild.id])
	{
		sendBotString("onAlreadyPlayingTune", (msg) => message.reply(msg));
	}
	else
	{
		dispatchers[destination] = voiceConnection.playFile(file);
		playingStatus[destination] = true;

		dispatchers[destination].on("end", () => {
			playingStatus[destination] = false;
			dispatchers[destination].end();
		});

		dispatchers[destination].on("error", error => {
			console.log(`\t->Error playing file:\n${error}`);
		});

		return true;
	}
	return false;
}

// reset the auto leave timer for this destination because it was used
function voiceEvent(destination)
{
	if(timers[destination]) clearTimeout(timers[destination]);
	timers[destination] = setTimeout(() => {
		const voiceConnection = getVoiceConnection(destination);
		if(voiceConnection)
		{
			voiceConnection.disconnect();
			// FIGURE THIS OUT
			//sendBotString("onAutoLeaveVoiceChannel", (msg) => message.reply(msg));
		}
	}, config.autoLeaveTimout * 1000);
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

// the commands
// join a voice channel
registerCommand(["join", "voice", "enter", "invite"], (arg, args, message) => {
	if(message.member.voiceChannel)
	{
		message.member.voiceChannel.join().then(connection => {
			sendBotString("onJoinVoiceChannel", (msg) => message.reply(msg));
		}).catch(console.log);
		voiceEvent(message.guild);
	} else {
		sendBotString("onJoinVoiceChannelFail", (msg) => message.reply(msg));
	}
});

// stop playing a tune
registerCommand(["stop", "quit", "quiet", "end"], (arg, args, message) => {
	if(playingStatus[message.guild.id])
	{
		dispatchers[message.guild.id].end();
		sendBotString("onStopTune", (msg) => message.reply(msg));
	}
	else
	{
		sendBotString("onNotPlayingTune", (msg) => message.reply(msg));
	}
	voiceEvent(message.guild);
});

// leave a voice channel
registerCommand(["leave", "exit", "part"], (arg, args, message) => {
	const voiceConnection = getVoiceConnection(message.guild);
	if(!voiceConnection)
	{
		sendBotString("onLeaveVoiceChannelFail", (msg) => message.reply(msg));
	}
	else
	{
		voiceConnection.disconnect();
		sendBotString("onLeaveVoiceChannel", (msg) => message.reply(msg));
	}
	if(timers[message.guild]) clearTimeout(timers[message.guild]);
});

// repeat the last tune
registerCommand(["again", "repeat", "encore"], (arg, args, message) => {
	if(playSound(message))
	{
		sendBotString("onEncore", (msg) => message.reply(msg));
		voiceEvent(message.guild);
	}
});

// see what known instruments there are
registerCommand(["instruments", "list", "instrument"], (arg, args, message) => {
	// get the list of instrument strings
	const ls = Array(128).fill().map((v, i) => {
		const aliases = Object.keys(config.programs).filter((key) => {
			return config.programs[key] == i;
		}).map((alias) => {
			return `\`${alias}\``;
		}).join(" ");
		return `• \`p${parseInt(i) + 1}\`\t${aliases}`;
	});
	sendBotString("onInstrumentRequest", (msg) => message.channel.send(msg), (msg) => message.channel.send(msg), `\n${ls.join("\n")}`);
});

// see example tunes
registerCommand(["examples", "examples", "tunes", "songs"], (arg, args, message) => {
	// get the list of example strings
	const ls = Object.keys(config.examples).map((key) => {
		const example = config.examples[key];
		return `**${key}**:${ example.credit ? ` _(sequenced by ${example.credit})_` : " " }\`\`\`${config.trigger}${example.example}\`\`\``;
	});
	sendBotString("onExampleRequest", (msg) => message.reply(msg), (msg) => message.channel.send(msg), `\n\n${ls.join("\n\n")}`, "\n\n");
});

// get general help
registerCommand(["help", "commands", "about", "info"], (arg, args, message) => {
	sendBotString("onHelpRequest", (msg) => message.reply(msg), (msg) => message.channel.send(msg));
});

// see the composing tutorial
registerCommand(["tutorial", "composing", "how", "howto"], (arg, args, message) => {
	sendBotString("onTutorialRequest", (msg) => message.reply(msg), (msg) => message.channel.send(msg));
});

// evaluate and play a musical expression
registerCommand(["play", "tune"], (arg, args, message) => {
	try
	{
		generate_wav(message.guild.id, arg, () => {
			playSound(message);
		});
	}
	catch(error)
	{
		console.log(`\t-> Invalid musical expression!\n${error}`);
		sendBotString("onTuneError", (msg) => message.reply(msg));
	}
	voiceEvent(message.guild);
});

// executes a command
// given cmd name, arg string, args list, and originating discord message
function executeCommand(cmd, arg, args, message)
{
	// get the command function and call it
	// return false if command doesn't exist
	const command = commands[cmd];
	if(command)
	{
		command(arg, args, message);
		return true;
	}
	else
	{
		return false;
	}
}

// process a message to the bot
// the message string, and the originating discord message object
function processBotMessage(msg, message)
{
	// cmd is case insensitive, args retain case
	const words = msg.split(" ");
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
        const content = message.cleanContent.trim();
        const dm = !message.guild;
        const triggered = content.startsWith(config.trigger);
	const pinged = message.mentions.users.has(client.user.id);
	console.log(pinged);
	const inBotChannel = message.channel.name === config.botChannel;
	const msg = triggered ? content.slice(config.trigger.length) : content;
	if(msg.length && (dm || triggered || inBotChannel || pinged))
	{
		// received message directed at the bot
		console.log(`${message.guild.name}> #${message.channel.name}> ${message.author.username}> ${msg}`);
		// go handle the message to the bot
		processBotMessage(msg, message);
	}
});

// load the token from file and login
function main()
{
	const fs = require("fs");
	const token = fs.readFileSync("token.txt", "ascii").trim();
	client.login(token);
}

// run the bot!
main();
