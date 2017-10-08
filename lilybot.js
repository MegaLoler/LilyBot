// todo:
// ~~invite-link command
// arbitrary midi program numbers
// arbitrary tempos too
// midi import and export via file sends
// seriouly just... redo all the music code!
//   especially have a proper expression parser, and make it a module on its own!
//   loops and looping structures and ... sequential groups of parallel?
//   fix starting rests
//   inline tempo and patch changes
//   percussion
//   triplets
//   solfege input mode
//   "wait" character (multirest, ie: r1 for rest, r5 for 5 units of rest
//   or like , r = .. and w = rr
//   LILYPOND ENGINE?????
// private calls and dms
// server specific config of sorts..
//   command permissions?
//   including designated bot channel!! so i can make the bot say stuff there it needs to say on its own
//   user example library
//   delete messages after a bit in bot channel? maybe?
// fancy server side repl
//   with debug logger
// edit messages, maybe?
// inline musical snippits? :P
// encores with arguments
// "scrolling" game presence for announcements and stuff?
// somehow fix playing unknown commands as music?
// proper ~~commands listing
// relative octaves (nearest octave)
// tts singer
//
// join link:
// https://discordapp.com/oauth2/authorize?client_id=365644276417298432&scope=bot&permissions=0

// libraries
const scribble = require("scribbletune");
const discord = require("discord.js");
const { spawn } = require("child_process");

// config
const config = require("./config");

// output a midi file from a musical expression
// translates from tunebot's language to scribbletune's language
// then uses scribbletune to output the midi file
function generate_midi(expression, out)
{
	var notes = [];
	var pattern = "";
	var accentMap = [];
	var octave = 4;
	var defaultVelocity = 64;
	var velocity = defaultVelocity;

	var target = notes;

	for(var c of expression.toLowerCase())
	{
		if("abcdefg".indexOf(c) != -1)
		{
			target.push(c + octave);
			if(target == notes) pattern += 'x';
			if(target == notes) accentMap.push(velocity);
			velocity = defaultVelocity;
		}
		else if(c == '#')
		{
			target[target.length - 1] += c;
		}
		else if(c == ',')
		{
			target.push(target[target.length - 1]);
			if(target == notes) pattern += 'x';
			if(target == notes) accentMap.push(velocity);
		}
		else if(c == '[' && target == notes)
		{
			var newNest = [];
			target.push(newNest);
			target = newNest;
			pattern += 'x';
			accentMap.push(defaultVelocity);
			velocity = '70';
		}
		else if(c == ']')
		{
			target = notes;
		}
		else if(c == '-')
		{
			if(target == notes) pattern += '_';
		}
		else if(c == '.')
		{
			if(target == notes) pattern += '-';
		}
		else if(c == '^')
		{
			if(target == notes) velocity = parseInt(velocity) + 16;
		}
		else if(c == 'v')
		{
			if(target == notes) velocity = parseInt(velocity) - 16;
		}
		else if(c == 'p')
		{
			if(target == notes)
			{
				defaultVelocity = 40;
				velocity = defaultVelocity;
			}
		}
		else if(c == 'l')
		{
			if(target == notes)
			{
				defaultVelocity = 88;
				velocity = defaultVelocity;
			}
		}
		else if(c == 'm')
		{
			if(target == notes)
			{
				defaultVelocity = 64;
				velocity = defaultVelocity;
			}
		}
		else if(c == '>')
		{
			octave++;
		}
		else if(c == '<')
		{
			octave--;
		}
		else if("0123456789".indexOf(c) != -1)
		{
			octave = c;
		}
	}

	var clip = scribble.clip({
	    notes: notes,
	    pattern: pattern,
	    accentMap: accentMap,
	});  

	scribble.midi(clip, `${out}.mid`);
}

function convert_midi_to_wav(program, tempo, volume, input, out, callback)
{
	const { spawn } = require("child_process");
        const child = spawn("timidity", [`${input}.mid`, "-A", volume, `--adjust-tempo=${tempo}`, `--force-program=${program}`, "-Ow", "-o", `${out}.wav`]);
        
        child.stdout.on("data", (data) => {
		if(config.testing) console.log(`timidity: ${data}`);
        });
        
        child.stderr.on("data", (data) => {
		if(config.testing) console.log(`!!timidity: ${data}`);
        });
        
        child.on("close", (code) => {
		if(config.testing || code) console.log(`timidity exit code: ${code}`);
		if(callback) callback();
        });
}

function merge_wavs(id, count, callback)
{
	if(count == 1)
	{
		const child = spawn("mv", [`out_0_${id}.wav`, `out_${id}.wav`]);
		child.on("close", (code) => {
			if(callback) callback();
		});
	}
	else if(count > 1)
	{
		// do this functionally
		const inputArgs = [];
		for(var i = 0; i < count; i++)
		{
			inputArgs.push("-i", `out_${i}_${id}.wav`);
		}

		const out = `out_${id}.wav`;
		const child = spawn("ffmpeg", ["-y"].concat(inputArgs).concat(["-filter_complex", `amix=inputs=${count}`, out]));

		child.stdout.on("data", (data) => {
			if(config.testing) console.log(`ffmpeg: ${data}`);
		});
		
		child.stderr.on("data", (data) => {
			if(config.testing) console.log(`!!ffmpeg: ${data}`);
		});
		
		child.on("close", (code) => {
			if(config.testing || code) console.log(`ffmpeg exit code: ${code}`);
			if(callback) callback();
		});
	}
}

// make a wave file from an expression
// id is the id of the discord server
// each discord server gets their own .wav output
// calls callback (async) when its done
function generate_wav(id, expression, callback)
{
	// i'd like this entire system of evaluating musical expressions to be reworked somehow
	// to be more flexible and better written
	// separate all the expressions separated by :
	// and processes them in order
	const parts = expression.split(":").slice(0, 12); // some max args for safety
	var program = 0;
	var tempo = 75;
	var volume = 100
	var i = 0;
	const processing = [];
	for(var p of parts)
	{
		p = p.trim().toLowerCase();
		if(p in config.programs)
		{
			program = config.programs[p];
		}
		else if(p === "loud")
		{
			volume = 100;
		}
		else if(p === "quiet")
		{
			volume = 50;
		}
		else if(p === "double")
		{
			tempo *= 2;
		}
		else if(p === "half")
		{
			tempo /= 2;
		}
		else if(p in config.tempos)
		{
			tempo = config.tempos[p];
		}
		else
		{
			const out = `out_${i}_${id}`;
			generate_midi(p, out);
			processing.push(out);
			convert_midi_to_wav(program, tempo, volume, out, out, () => {
				const i = processing.indexOf(out);
				if(i != -1) processing.splice(i, 1);
			});
			i++;
		}
	}
	// asynchronously wait for all the midis to be converted to wavs
	function wait()
	{
		if(processing.length == 0)
		{
			merge_wavs(id, i, callback);
		}
		else
		{
			setTimeout(wait, 10);
		}
	}
	setTimeout(wait, 0);
}


function getVoiceConnection(guild)
{
	for(var voiceChannel of client.voiceConnections)
	{
		if(guild.id === voiceChannel[1].channel.guild.id) return voiceChannel[1];
	}
}

// timers are for leaving voice channels when not used for a while
var playingStatus = {};
var dispatchers = {};
var timers = {};

// reset the auto leave timer for this guild because it was used
function voiceEvent(guild)
{
	if(timers[guild]) clearTimeout(timers[guild]);
	timers[guild] = setTimeout(() => {
		const voiceConnection = getVoiceConnection(guild);
		if(voiceConnection)
		{
			voiceConnection.disconnect();
			// make designated bot channels a thing first, then do this
			//sendBotString("onAutoLeaveVoiceChannel", (msg) => message.reply(msg));
		}
	}, config.autoLeaveTimout * 1000);
}

function playSound(message)
{
	var voiceConnection = getVoiceConnection(message.guild);
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
		dispatchers[message.guild.id] = voiceConnection.playFile(`out_${message.guild.id}.wav`);
		playingStatus[message.guild.id] = true;

		dispatchers[message.guild.id].on("end", () => {
			playingStatus[message.guild.id] = false;
			dispatchers[message.guild.id].end();
		});

		dispatchers[message.guild.id].on("error", error => {
			console.log(`\t->Error playing file:\n${error}`);
		});

		return true;
	}
	return false;
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

// process a message to the bot
// the message string, and the originating discord message object
function processBotMessage(msg, message)
{
	// cmd is case insensitive, args retain case
	const words = msg.split(" ");
	const cmd = words[0].toLowerCase();
	const arg = words.slice(1).join(" ");
	const args = words.slice(1).filter((v) => {
		return v.length;
	});

	// get the command function and call it
	// assume play function if none other found
	const command = commands[cmd];
	if(command) command(arg, args, message);
	else commands.play(msg, words, message);
}

// make the discord connection
const client = new discord.Client();

// once its all connected and good to go
client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setGame(`${config.trigger}help`);
});

// on message recieve
client.on("message", message => {
	if(client.user.id === message.author.id) return;
        const content = message.content.trim();
        const dm = !message.guild;
        const triggered = content.startsWith(config.trigger);
	const msg = triggered ? content.slice(config.trigger.length) : content;
	if(triggered && msg.length)
	{
		// received message directed at the bot
		console.log(`${message.guild.name}> #${message.channel.name}> ${message.author.username}> ${msg}`);
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
