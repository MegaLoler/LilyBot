// todo:
// give mogrify out a small border
// send and request lilypond files
// proper commands listing with descriptions and stuff (and config file aliases)
// give arguments to most commands so you can call commands for other users (eg invite for others)
// different language options
//   tunebots language
//   different lilypond templates
// server specific config
//   permissions based on server roles?
//   save tunes from users
// more elegant javascript in general :3 async ?? promises? ? i got lot to learn
//   fix those file rename callbacks?
//   more elegant logging system?? use console objects features??
//   figure out why sometimes playing doesnt work???????
//   it outputs pdf, png, and midi all at once.. so get rid of duplicate code for that
// redo help, tutorial, examples, and personality
//   use discord emoji yo
// merge lambot into lilybot?? with lilypond scheme??

// libraries
const { spawn } = require("child_process");
const fs = require("fs");
const https = require("https");
const discord = require("discord.js");

// config
const config = require("./config");

// timers are for leaving voice channels when not used for a while
const playingStatus = {};
const dispatchers = {};
const timers = {};

/* LANGUAGE INTERFACES */

// lilypond templates...
// template to output score and midi both
function makeLilyPondScore(code)
{
	return `
\\version "2.18.2"
\\header { 
  tagline = ""
} 
\\score {
\\new Staff \\relative {
${code}
}
\\layout { }
\\midi { }
}`
}

/* EXTERNAL COMMANDS */

// run an external command
function runCommand(cmd, args, callback, errorCallback, stdoutCallback)
{
	const { spawn } = require("child_process");
        const child = spawn(cmd, args);
	child.failed = false;
        
        child.stdout.on("data", (data) => {
		if(config.testing) console.log(`${cmd}: ${data}`);
		if(stdoutCallback) stdoutCallback(data, child);
        });
        
        child.stderr.on("data", (data) => {
		if(config.testing) console.error(`${cmd}: ${data}`);
		if(stdoutCallback) stdoutCallback(data, child);
        });
        
        child.on("close", (code) => {
		if((code || child.failed) && errorCallback) errorCallback(`${cmd} exit status: ${code}`);
		else if(callback) callback(errorCallback);
        });
}

// make sure a directory exists in file system
function assertPath(path, callback)
{
	runCommand("mkdir", ["-p", path], callback, console.error);
}

// render a midi file to a wav file with timidity
function renderMidi(inFile, outFile, callback, errorCallback)
{
	runCommand("timidity", [inFile, "-Ow", "-o", outFile], callback, errorCallback, (data, child) =>
		{
			if(data.toString().indexOf("Not a MIDI file!") != -1) child.failed = true;
		});
}

// render sheet music png and pdf with lilypond
// also use to output midi
function convertLilyPond(inFile, outFile, callback, errorCallback)
{
	runCommand("lilypond", ["-dsafe", "-fpdf", "-fpng", "-o", `${trimFileExtension(outFile)}`, inFile], () => {
		runCommand("mogrify", ["-trim", outFile], callback, errorCallback);
	}, errorCallback);
}

/* BOT UTILITY FUNCTIONS */

// save the lilypond code into the scratch lilypond file
function saveLilyPondFile(code, user, guild, callback, errorCallback)
{
	if(code)
	{
		if(guild)
		{
			getGuildScratchFile(guild, "ly", (file) => {
				fs.writeFile(file, makeLilyPondScore(code), "utf8", (error) => {
					if(error) errorCallback(error);
					else callback(errorCallback);
				});
			});
		}
		else
		{
			getUserScratchFile(user, "ly", (file) => {
				fs.writeFile(file, makeLilyPondScore(code), "utf8", (error) => {
					if(error) errorCallback(error);
					else callback(errorCallback);
				});
			});
		}
	}
	else callback();
}

// download the scratch midi file from the attachment url
function saveScratchMidi(attachment, user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "midi", (file) => {
		downloadFile(attachment.url, file, callback, errorCallback);
	});
}

// render the scratch lilypond file to the scratch midi file with lilypond
function convertToScratchMidi(user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "ly", (lilyFile) => {
		// doing this so mogrify sees png
		// lily pond doesnt care
		getGuildScratchFile(guild, "png", (imageFile) => {
			convertLilyPond(lilyFile, imageFile, callback, errorCallback);
		});
	});
}

// render the scratch midi file to the scratch wav file with timidity
function renderScratchMidi(user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "midi", (midiFile) => {
		getGuildScratchFile(guild, "wav", (waveFile) => {
			renderMidi(midiFile, waveFile, callback, errorCallback);
		});
	});
}

// render the scratch lilypond file to scratch sheet music file with lilypond
function renderScratchSheetMusic(user, guild, callback, errorCallback)
{
	if(guild)
	{
		getGuildScratchFile(guild, "ly", (lilyFile) => {
			getGuildScratchFile(guild, "png", (imageFile) => {
				convertLilyPond(lilyFile, imageFile, callback, errorCallback);
			});
		});
	}
	else
	{
		getUserScratchFile(user, "ly", (lilyFile) => {
			getUserScratchFile(user, "png", (imageFile) => {
				convertLilyPond(lilyFile, imageFile, callback, errorCallback);
			});
		});
	}
}

// download a file from a url
function downloadFile(url, path, callback, errorCallback)
{
	const file = fs.createWriteStream(path);
	const request = https.get(url, (response) => {
		response.pipe(file);
		file.on("finish", () => {
			file.close(() => {
				callback(errorCallback);
			});
		});
	}).on("error", (error) => {
		fs.unlink(path);
		if(errorCallback) errorCallback(error.message);
	});
}

// trim the file extension off a filename
function trimFileExtension(filename)
{
	return filename.replace(/\.[^/.]+$/, "");
}

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
function getUserScratchFile(user, extension, callback)
{
	const path = getUserScratchPath(user);
	assertPath(path, () => {
		callback(`${path}/scratch.${extension}`);
	});
}

// get the scratch file of an extension for a guild
function getGuildScratchFile(guild, extension, callback)
{
	const path = getGuildScratchPath(guild);
	assertPath(path, () => {
		callback(`${path}/scratch.${extension}`);
	});
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
function safeSend(msg, callback, callbackTail, chunkDelimiter="\n", charLimit=1800, doneCallback)
{
	if(!msg.trim().length)
	{
		if(doneCallback) doneCallback();
		return;
	}
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
	safeSend(rest, callbackTail, callbackTail, chunkDelimiter, charLimit, doneCallback);
}

// send a bot string from config file
// with optional stuff after it (arg)
function sendBotString(string, headSendFunction, tailSendFunction, arg="", chunkDelimiter, charLimit, doneCallback)
{
	const stringObj = config.botStrings[string];
	const msg = stringObj.string + arg;
	if(stringObj.enabled) safeSend(msg, headSendFunction, tailSendFunction, chunkDelimiter, charLimit, doneCallback);
}

// reply to a message with msg
// mentions the user unless its private
function reply(message, msg)
{
	if(message.guild) message.reply(msg);
	else message.channel.send(msg);
}

/* COMMAND FUNCTIONS AND INFRASTRUCTURE */

// send a file in response to message
function doSend(file, message, callback)
{
	fs.access(file, fs.constants.R_OK, (error) => {
		if(error)
		{
			console.log(error);
			sendBotString("onSendFail", (msg) => reply(message, msg));
		}
		else
		{
			const movedFile = file.replace(/(.*)\/.*(\..*$)/, "$1/" + config.fileSendName + "$2");
			fs.rename(file, movedFile, () => {
				sendBotString("onSendFile", (msg) => {
					message.reply(msg, {
						files: [movedFile]
					}).then(() => {
						fs.rename(movedFile, file, callback);
					}).catch(console.error);
				});
			});
		}
	});
}

// subcommand to post the pdf sheet music scratch file
function giveSheets(message, callback)
{
	if(message.guild) getGuildScratchFile(message.guild, "png", (file) => doSend(file, message, callback));
	else getUserScratchFile(message.author, "png", (file) => doSend(file, message, callback));
}

// subcommand to post the png sheet music scratch file
function givePdf(message, callback)
{
	if(message.guild) getGuildScratchFile(message.guild, "pdf", (file) => doSend(file, message, callback));
	else getUserScratchFile(message.author, "pdf", (file) => doSend(file, message, callback));
}

// subcommand to post the sheet music scratch file
function giveMidiFile(message, callback)
{
	if(message.guild) getGuildScratchFile(message.guild, "midi", (file) => doSend(file, message, callback));
	else getUserScratchFile(message.author, "midi", (file) => doSend(file, message, callback));
}

// subcommand to play the resulting wav file
// complains if nothing to play
function doPlay(message, successCallback)
{
	requestToPlay(message, () => {
		getGuildScratchFile(message.guild, "wav", (file) => {
			fs.access(file, fs.constants.R_OK, (error) => {
				if(error)
				{
					console.log(error);
					sendBotString("onPlayFail", (msg) => reply(message, msg));
				}
				else
				{
					playSound(file, message.guild);
					voiceEvent(message.guild);
					if(successCallback) successCallback();
				}
			});


		});
	});
}

// subcommand just to perform the join of the voice channel of the member of the message
function doJoin(message, callback, verbose=true)
{
	message.member.voiceChannel.join().then(connection => {
		if(verbose) sendBotString("onJoinVoiceChannel", (msg) => reply(message, msg));
		voiceEvent(message.guild);
		if(callback) callback();
	}).catch(console.log);
}

// a "subcommand" to try to auto join a channel if set in config , if not already in there
// return whether in or getting in
function tryAutoJoin(message, callback)
{
	if(getVoiceConnection(message.guild))
	{
		callback();
		return true;
	}
	else if(config.autoJoin && message.member.voiceChannel)
	{
		doJoin(message, callback, false);
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
// success callback when can play, fail callback when can't
function requestToPlay(message, successCallback, failCallback)
{
	if(!message.guild) sendBotString("onPrivatePlayFail", (msg) => reply(message, msg));
	else if(!tryAutoStop(message)) sendBotString("onAlreadyPlayingTune", (msg) => reply(message, msg));
	else if(!tryAutoJoin(message, successCallback)) sendBotString("onNotInVoiceChannel", (msg) => reply(message, msg));
	else return;
	if(failCallback) failCallback();
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

// the "auto" command to auto decide whether you want sheets or to hear
// the command that is assumed when you don't give a command at all
// if you are in voice then it'll play it for you
// or if you send a file (expected to be midi)
// otherwise it'll give you sheets
function autoCommand(code, message)
{
	const attachment = message.attachments.first();
	if(attachment || (message.guild && message.member.voiceChannel)) playTune(code, message);
	else requestSheets(code, message);
}

// respond with the pdf of the tune!
function requestPdfFile(code, message)
{
	// two versions of this command:
	// no args: render sheets of the last input ly code and show it
	// lilypond code: save lilypond, render it then show it
	if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
				givePdf(message);
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else givePdf(message);
}

// respond with sheet music to the tune!
function requestSheets(code, message)
{
	// two versions of this command:
	// no args: render sheets of the last input ly code and show it
	// lilypond code: save lilypond, render it then show it
	if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
				giveSheets(message);
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else giveSheets(message);
}

// respond with midi file
function requestMidiFile(code, message)
{
	// two versions of this command:
	// no args: send existing midi file if there is one
	// lilypond code: save lilypond, convert to midi, then send it
	if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			convertToScratchMidi(message.author, message.guild, (errorCallback) => {
				giveMidiFile(message);
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else giveMidiFile(message);
}

// respond with playing the tune
function playTune(code, message)
{
	// three versions of this command:
	// no args: play last file (just like encore)
	// file arg: receive midi and render and play it
	// lilypond code: save lilypond, convert to midi, render, play
	if(message.guild)
	{
		const attachment = message.attachments.first();
		if(attachment)
		{
			saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
				renderScratchMidi(message.author, message.guild, (errorCallback) => {
					doPlay(message);
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
		else if(code)
		{
			saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
				convertToScratchMidi(message.author, message.guild, (errorCallback) => {
					renderScratchMidi(message.author, message.guild, (errorCallback) => {
						doPlay(message);
					}, errorCallback);
				}, (error) => {
					console.error(error);
					sendBotString("onTuneError", (msg) => reply(message, msg));
				});
			});
		}
		else
		{
			renderScratchMidi(message.author, message.guild, (errorCallback) => {
				doPlay(message);
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
	}
	else sendBotString("onPrivatePlayFail", (msg) => reply(message, msg));
}

// repeat the last tune
function repeatTune(message)
{
	doPlay(message, () => {
		sendBotString("onEncore", (msg) => reply(message, msg));
	});
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
registerCommand(["auto"], (arg, args, message) => autoCommand(arg, message));
registerCommand(["sheets", "sheet", "sheetmusic", "notation", "png", "render", "look", "see", "draw", "type", "score"], (arg, args, message) => requestSheets(arg, message));
registerCommand(["midi", "download", "file", "save", "request", "mid", "get"], (arg, args, message) => requestMidiFile(arg, message));
registerCommand(["pdf", "document", "downloadsheet", "downloadsheets", "print", "printsheet", "printsheets"], (arg, args, message) => requestPdfFile(arg, message));
registerCommand(["play", "tune", "listen", "hear", "sound", "audio", "wav"], (arg, args, message) => playTune(arg, message));
registerCommand(["again", "repeat", "encore"], (arg, args, message) => repeatTune(message));
registerCommand(["stop", "quit", "quiet", "end"], (arg, args, message) => stopPlayingTune(message));
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
	const arg = msg.slice(msg.indexOf(cmd) + cmd.length);
	// remove empty args
	const args = words.slice(1).filter((v) => {
		return v.length;
	});

	// execute the command
	// assume "auto" command if none other found
	if(!executeCommand(cmd, arg, args, message))
		commands.auto(msg, words, message);
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
	const attachment = message.attachments.first();
        const dm = !message.guild;
        const triggered = content.startsWith(config.trigger);
	const mentioned = message.mentions.users.has(client.user.id);
	const inBotChannel = config.enableBotChannelAddressing && message.channel.name === config.botChannel;
	const blockCodeHead = "```";
	const blockCodeHeadLily = `\`\`\`${config.blockCodeAlias}\n`;
	const blockCode = content.indexOf(blockCodeHead) != -1;
	const blockCodeLily = content.indexOf(blockCodeHeadLily) != -1;
	const clean = mentioned ? removeMentions(content).trim() : content;
	// i don't like that this is var and not const
	var msg = triggered ? clean.slice(config.trigger.length).trim() : clean;

	// care only if it isn't empty or has an attachment
	// that and must be addressing the bot in some way
	if((msg.length || attachment) && (dm || triggered || mentioned || inBotChannel || blockCodeLily))
	{
		// first check to see if it was addressed by code block
		// if so, extract the intended command from the message
		if(blockCode)
		{
			// if it was given code blocks, the first block is the arg string
			// and the command is the first word (if any)
			// i find this ugly parsing, allowing for unclosed blocks and all, w/e
			const parts = msg.split(blockCodeLily ? blockCodeHeadLily : blockCodeHead);
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
	// this is sync but i suppose its fine here at the beginning
	if(fs.existsSync(config.tokenFile))
	{
		const token = fs.readFileSync(config.tokenFile, "ascii").trim();
		client.login(token);
	}
	else console.error(`Please create the file "${config.tokenFile}" and put your Discord token inside.`);
}

// run the bot!
main();
