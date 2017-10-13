// todo:
// make a github.io page :3
// percussion support
// update examples... make them sheet worthy
// proper commands listing with descriptions and stuff
// command args
//   invite and github for others
//   join specific channels
// add tune bot specific error messages to help people know whats wrong!!
// different language options OVERHAUL!!!
//   actually just make a tunebot2ly compiler????????
//   and encorporate all kinds of xxx2ly things????
//   tunebots language
//   different lilypond templates
//   clean up all that duplicate code in the requesting different things back.. with attachments esp.
//   make the sheet out better while ur at it
//   make files only be converted as they are needed..........
//     have a web of conversion paths based on the compilers available...
//   redo the CONVERSION system alltogethr.......
//     inputs: file, in chat code
//     outputs: file, in chat (text voice or file)
//     input formats...... various frontends
//     output formats....... various backends
// server specific config
//   permissions based on server roles?
//   save tunes from users
// more elegant javascript in general :3 async ?? promises? ? i got lot to learn
//   style
//   fix those file rename callbacks?
//   more elegant logging system?? use console objects features??
//   figure out why sometimes playing doesnt work???????
//   it outputs pdf, png, and midi all at once.. so get rid of duplicate code for that
// redo help, tutorial, examples, and personality
//   use discord emoji yo
// merge lambot into lilybot?? with lilypond scheme??
// give mogrify out a small border ?? ?
// cache???
// play/request wavs/mp3s?
// watch out for dos'ing somehow?
// tuner?? jam sessions? record from voice and convert to midi/sheets?
// lyrics????? and speech synth??????
// multi page out support ? ? 
// soundfont selection??
// pretty things up with embeds??

// libraries
const { spawn } = require("child_process");
const fs = require("fs");
const https = require("https");
const discord = require("discord.js");
const snekfetch = require("snekfetch")

// config
const config = require("./config");

// timers are for leaving voice channels when not used for a while
const playingStatus = {};
const dispatchers = {};
const timers = {};

/* LANGUAGE INTERFACES */

// lilypond templates...
// template to output score and midi both
function makeLilyPondScore(code, sheetTitle, composer)
{
	return `
\\version "2.18.2"
\\header { 
  tagline = ""
  title = "${sheetTitle}"
  composer = "${composer}"
} 
\\paper {
  page-count = 1
}
\\score {
${code}
\\layout { }
\\midi { \\tempo 4 = 90 }
}`
}

// make a lilypond score from tune bot code!!
function tuneBotExpression2LilyPondScore(expression)
{
	// might wanna add a relative mode sometime
	var output = "<<\n";

	// start a staff
	output += "\\new Staff { ";
	var newStaffPending = false;

	// default values
	var unitValue = 16;
	var instrument = "acoustic piano";
	var tempo = "tempo 4 = 90";

	// title stuff
	var sheetTitle = "";
	var composer = "";

	// split the parts
	const parts = expression.split(":");
	for(var part of parts)
	{
		const p = part.trim();
		if(!p) continue;

		// make a new staff if requested
		if(newStaffPending) output += `}\n\\new Staff { \\set Staff.midiInstrument = #"${instrument}" \\${tempo} `;
		newStaffPending = false;

		if(p in config.programs)
		{
			const i = config.instrumentNames[config.programs[p]];
			output += `\\set Staff.midiInstrument = #"${i}" `;
			instrument = i;
		}
		else if(p.startsWith("by"))
		{
			const words = p.split(" ");
			composer = words.slice(1).join(" ");
		}
		else if(p.startsWith("title"))
		{
			const words = p.split(" ");
			sheetTitle = words.slice(1).join(" ");
		}
		else if(p.startsWith("key"))
		{
			const args = p.split(" ").filter((v) => {
				return v.length;
			});
			const key = args[1].replace(/\#/g, "is").replace(/\&/g, "es");

			output += `\\${args[0]} ${key} \\${args[2]} `;
		}
		else if(p.startsWith("tempo"))
		{
			output += `\\${p} `;
			tempo = p;
		}
		else if(p.startsWith("time"))
		{
			output += `\\${p} `;
		}
		else if(p === "loud")
		{
			output += `\\set Staff.midiMinimumVolume = #0.7 `;
			output += `\\set Staff.midiMaximumVolume = #0.9 `;
		}
		else if(p === "quiet")
		{
			output += `\\set Staff.midiMinimumVolume = #0.1 `;
			output += `\\set Staff.midiMaximumVolume = #0.3 `;
		}
		else if(p === "half")
		{
			unitValue /= 2;
		}
		else if(p === "double")
		{
			unitValue *= 2;
		}
		else if(p in config.tempos)
		{
			const t = config.tempos[p];
			tempo = `tempo 4 = ${t}`;
			output += `\\${tempo} `;
		}
		else if(p in config.clefs)
		{
			output += `\\clef ${config.clefs[p]} `;
		}
		else if(p in config.values)
		{
			unitValue = config.values[p];
		}
		else
		{
			var noteBuffer = "";
			var lengthBuffer = 1;
			var octaveBuffer = 4;
			var last = {};
			last.chord = false;
			last.buffer = "";
			var chordBuffer = "";
			var inChord = false;
			var pendingChord = false;
			var dynamic = "";
			var suffix = "";

			// logarithmic floor
			function floorLog(n, e=2)
			{
				return Math.pow(e, Math.floor(Math.log(n) / Math.log(e)));
			}

			// convert tunebot length to lilypond length
			function convertLength(len, buffer)
			{
				// basic length value
				const baseValue = floorLog(len);
				var remainder = len % baseValue;
				var base = baseValue;
				var dots = 0;
				while(remainder && remainder >= base / 2)
				{
					base = floorLog(remainder);
					remainder %= base;
					dots++;
				}
				// whole number 
				var converted = unitValue / baseValue;
				if(converted == 0.5) converted = "\\breve";
				else if(converted == 0.25) converted = "\\longa";
				return converted.toString() + ".".repeat(dots) + (remainder ? ("~ " + buffer) + convertLength(remainder, buffer) : "");
			}

			// convert tunebot octave to lilypond octave
			function convertOctave(noteBuffer, octave)
			{
				if(noteBuffer.startsWith("r")) return "";
				const count = octave - 3;
				if(count > 0) return "'".repeat(count);
				else if(count < 0) return ",".repeat(-count);
				return "";
			}

			// add the note buffer to the lilypond output
			function flush()
			{
				if(pendingChord)
				{
					const appendage = `${chordBuffer}${convertLength(lengthBuffer, chordBuffer)}${suffix}`;
					last.chord = true;
					last.buffer = chordBuffer;
					output += appendage;
					pendingChord = false;
					if(dynamic) output += `\\${dynamic}`;
					output += " ";
					dynamic = "";
					suffix = "";
				}
				else if(noteBuffer)
				{
					const preAppendage = `${noteBuffer}${convertOctave(noteBuffer, octaveBuffer)}`;
					const appendage = `${preAppendage}${inChord ? "" : convertLength(lengthBuffer, preAppendage)}${suffix}`;
					if(!noteBuffer.startsWith("r"))
					{
						last.chord = false;
						last.buffer = noteBuffer;
					}
					noteBuffer = "";
					if(inChord)
					{
						chordBuffer += appendage;
						if(dynamic) chordBuffer += `\\${dynamic}`;
						chordBuffer += " ";
					}
					else
					{
						output += appendage;
						if(dynamic) output += `\\${dynamic}`;
						output += " ";
					}
					dynamic = "";
					suffix = "";
				}
			}

			// go through each input char
			for(var c of p.toLowerCase())
			{
				if("abcdefg".indexOf(c) != -1)
				{
					flush();
					noteBuffer = c;
					lengthBuffer = 1;
				}
				else if(c == '~')
				{
					suffix += "~";
				}
				else if(c == '#')
				{
					noteBuffer += "is";
				}
				else if(c == '&')
				{
					noteBuffer += "es";
				}
				else if(c == ',')
				{
					flush();
					pendingChord = last.chord;
					if(last.chord) chordBuffer = last.buffer;
					else noteBuffer = last.buffer;
					lengthBuffer = 1;
				}
				else if(c == '{')
				{
					flush();
					output += "\\repeat unfold 2 { ";
				}
				else if(c == '}')
				{
					flush();
					output += "} ";
				}
				else if(c == '(')
				{
					flush();
					output += "\\tuplet 3/2 { ";
				}
				else if(c == ')')
				{
					flush();
					output += "} ";
				}
				else if(c == '[')
				{
					flush();
					chordBuffer = "<";
					inChord = true;
				}
				else if(c == ']')
				{
					flush();
					chordBuffer += ">";
					inChord = false;
					pendingChord = true;
					lengthBuffer = 1;
				}
				else if(c == '-')
				{
					if(!inChord) lengthBuffer++;
				}
				else if(c == '.')
				{
					if(inChord) continue;
					if(!pendingChord && noteBuffer.startsWith("r")) lengthBuffer++;
					else
					{
						flush();
						noteBuffer = "r";
						lengthBuffer = 1;
					}
				}
				else if(c == '|')
				{
					flush();
					output += "| ";
				}
				else if(c == '^')
				{
					flush();
					suffix += "->";
				}
				else if(c == 'p')
				{
					flush();
					dynamic += "p";
				}
				else if(c == 'l')
				{
					flush();
					dynamic += "f";
				}
				else if(c == 'm')
				{
					flush();
					dynamic = "mp";
				}
				else if(c == '>')
				{
					flush();
					octaveBuffer++;
				}
				else if(c == '<')
				{
					flush();
					octaveBuffer--;
				}
				else if("0123456789".indexOf(c) != -1)
				{
					flush();
					octaveBuffer = c;
				}
			}
			// flush
			flush();

			// request new staff
			newStaffPending = true;
		}
	}

	// finish up
	output += "}\n>>";
	const lily = makeLilyPondScore(output, sheetTitle, composer);
	if(config.testing) console.log(lily);
	return lily;
}

/* EXTERNAL COMMANDS */

// run an external command
function runCommand(cmd, args, callback, errorCallback, stdoutCallback)
{
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

// convert midi to lilypond
function midi2ly(inFile, outFile, callback, errorCallback)
{
	runCommand("which", ["midi2ly"], undefined, errorCallback, (path, child) => {
		runCommand("python2.6", [path.toString().trim(), "-i", "header.ly", inFile, "-o", outFile], callback, errorCallback);
	}, errorCallback);
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

// post server count and stuff to discordbots.org
function postStats()
{
	// ignore for test bot
	if(!config.testing) snekfetch.post(`https://discordbots.org/api/bots/${client.user.id}/stats`)
		.set("Authorization", config.discordBotsToken)
		.send({ server_count: client.guilds.size })
		.then(() => console.log("Updated discordbots.org stats."))
		.catch(err => console.error(`Error updating stats: ${err.body}`));
}

// take TUNEBOT code and convert it to LILYPOND code and then save the lilypond scratch file
function saveLilyPondFile(code, user, guild, callback, errorCallback)
{
	if(code)
	{
		if(guild)
		{
			getGuildScratchFile(guild, "ly", (file) => {
				fs.writeFile(file, tuneBotExpression2LilyPondScore(code), "utf8", (error) => {
					if(error) errorCallback(error);
					else callback(errorCallback);
				});
			});
		}
		else
		{
			getUserScratchFile(user, "ly", (file) => {
				fs.writeFile(file, tuneBotExpression2LilyPondScore(code), "utf8", (error) => {
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

// download the scratch lilypond file from the attachment url
function saveAttachedLilyPondFile(attachment, user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "ly", (file) => {
		downloadFile(attachment.url, file, callback, errorCallback);
	});
}

// convert a scratch midi to lilypond file
function convertScratchMidiToLilyPondFile(user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "ly", (lilyFile) => {
		getGuildScratchFile(guild, "midi", (midiFile) => {
			midi2ly(midiFile, lilyFile, callback, errorCallback);
		});
	});
}

// render the scratch lilypond file to the scratch midi file with lilypond
function convertToScratchMidi(user, guild, callback, errorCallback)
{
	getGuildScratchFile(guild, "ly", (lilyFile) => {
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

// does this filename have any of these extensions?
function hasExtension(filename, extensions)
{
	return extensions.indexOf(getFileExtension(filename)) != -1;
}

// get the file extension of a filename
function getFileExtension(filename)
{
	const re = /(?:\.([^.]+))?$/;
	return re.exec(filename)[1];
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
			sendBotString("onAutoLeaveVoiceChannel", (msg) => {
				const botChannel = getBotChannel(guild);
				if(botChannel) botChannel.send(msg);
			});
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
	safeSend(rest, callbackTail || callback, callbackTail || callback, chunkDelimiter, charLimit, doneCallback);
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
function reply(message, msg, options)
{
	if(config.replyMention && message.guild) return message.reply(msg, options);
	else return message.channel.send(msg, options);
}

/* BOT SUBCOMMANDS */

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
					reply(message, msg, {
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

// subcommand to post the midi scratch file
function giveMidiFile(message, callback)
{
	if(message.guild) getGuildScratchFile(message.guild, "midi", (file) => doSend(file, message, callback));
	else getUserScratchFile(message.author, "midi", (file) => doSend(file, message, callback));
}

// subcommand to post the lilypond scratch file
function giveLilyPondFile(message, callback)
{
	if(message.guild) getGuildScratchFile(message.guild, "ly", (file) => doSend(file, message, callback));
	else getUserScratchFile(message.author, "ly", (file) => doSend(file, message, callback));
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

/* BOT COMMAND FUNCTIONS */

// join the voice channel of the author
function joinVoiceChannel(arg, args, message)
{
	if(!message.guild) sendBotString("onPrivateJoinVoiceChannelFail", (msg) => reply(message, msg));
	else if(message.member.voiceChannel) doJoin(message);
	else sendBotString("onJoinVoiceChannelFail", (msg) => reply(message, msg));
}

// leave the voice channel its in
function leaveVoiceChannel(arg, args, message)
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
function autoCommand(code, args, message)
{
	const attachment = message.attachments.first();
	if(message.guild && message.member.voiceChannel) playTune(code, args, message);
	else requestSheets(code, args, message);
}

// respond with the pdf of the tune!
function requestPdfFile(code, args, message)
{
	// two versions of this command:
	// no args: render sheets of the last input ly code and show it
	// lilypond code: save lilypond, render it then show it
	const attachment = message.attachments.first();
	if(attachment)
	{
		if(hasExtension(attachment.filename, ["mid", "midi"]))
		{
			saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
				convertScratchMidiToLilyPondFile(message.author, message.guild, (errorCallback) => {
					renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
						givePdf(message, () => {});
					}, errorCallback);
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
		else if(hasExtension(attachment.filename, ["ly"]))
		{
			saveAttachedLilyPondFile(attachment, message.author, message.guild, (errorCallback) => {
				renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
					givePdf(message, () => {});
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onTuneError", (msg) => reply(message, msg));
			});
		}
		else sendBotString("onNeedLilyPondFile", (msg) => reply(message, msg));
	}
	else if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
				givePdf(message, () => {});
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else givePdf(message, () => {});
}

// respond with sheet music to the tune!
function requestSheets(code, args, message)
{
	// two versions of this command:
	// no args: render sheets of the last input ly code and show it
	// lilypond code: save lilypond, render it then show it
	const attachment = message.attachments.first();
	if(attachment)
	{
		if(hasExtension(attachment.filename, ["mid", "midi"]))
		{
			saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
				convertScratchMidiToLilyPondFile(message.author, message.guild, (errorCallback) => {
					renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
						giveSheets(message, () => {});
					}, errorCallback);
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
		else if(hasExtension(attachment.filename, ["ly"]))
		{
			saveAttachedLilyPondFile(attachment, message.author, message.guild, (errorCallback) => {
				renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
					giveSheets(message, () => {});
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onTuneError", (msg) => reply(message, msg));
			});
		}
		else sendBotString("onNeedLilyPondFile", (msg) => reply(message, msg));
	}
	else if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {
				giveSheets(message, () => {});
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else giveSheets(message, () => {});
}

// respond with lilypond file
function requestLilyPondFile(code, args, message)
{
	// two versions of this command:
	// no args: send existing lily file if there is one
	// lilypond code: save lilypond, then send it back
	const attachment = message.attachments.first();
	if(attachment)
	{
		if(hasExtension(attachment.filename, ["mid", "midi"]))
		{
			saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
				convertScratchMidiToLilyPondFile(message.author, message.guild, (errorCallback) => {
					giveLilyPondFile(message, () => {});
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
		else if(hasExtension(attachment.filename, ["ly"]))
		{
			saveAttachedLilyPondFile(attachment, message.author, message.guild, (errorCallback) => {
				convertToScratchMidi(message.author, message.guild, (errorCallback) => {
					giveLilyPondFile(message, () => {});
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onTuneError", (msg) => reply(message, msg));
			});
		}
		else sendBotString("onNeedMidiOrLilyPondFile", (msg) => reply(message, msg));
	}
	else if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			giveLilyPondFile(message, () => {});
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else giveLilyPondFile(message, () => {});
}

// respond with midi file
function requestMidiFile(code, args, message)
{
	// two versions of this command:
	// no args: send existing midi file if there is one
	// lilypond code: save lilypond, convert to midi, then send it
	const attachment = message.attachments.first();
	if(attachment)
	{
		if(hasExtension(attachment.filename, ["mid", "midi"]))
		{
			saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
				giveMidiFile(message, () => {});
			}, (error) => {
				console.error(error);
				sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
			});
		}
		else if(hasExtension(attachment.filename, ["ly"]))
		{
			saveAttachedLilyPondFile(attachment, message.author, message.guild, (errorCallback) => {
				convertToScratchMidi(message.author, message.guild, (errorCallback) => {
					giveMidiFile(message, () => {});
				}, errorCallback);
			}, (error) => {
				console.error(error);
				sendBotString("onTuneError", (msg) => reply(message, msg));
			});
		}
		else sendBotString("onNeedMidiOrLilyPondFile", (msg) => reply(message, msg));
	}
	else if(code)
	{
		saveLilyPondFile(code, message.author, message.guild, (errorCallback) => {
			convertToScratchMidi(message.author, message.guild, (errorCallback) => {
				giveMidiFile(message, () => {});
			}, errorCallback);
		}, (error) => {
			console.error(error);
			sendBotString("onTuneError", (msg) => reply(message, msg));
		});
	}
	else giveMidiFile(message, () => {});
}

// respond with playing the tune
function playTune(code, args, message)
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
			if(hasExtension(attachment.filename, ["mid", "midi"]))
			{
				saveScratchMidi(attachment, message.author, message.guild, (errorCallback) => {
					renderScratchMidi(message.author, message.guild, (errorCallback) => {
						doPlay(message);
					}, errorCallback);
					// then convert it to sheets incase someone wants it
					convertScratchMidiToLilyPondFile(message.author, message.guild, (errorCallback) => {
						renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {}, errorCallback);
					}, errorCallback);
				}, (error) => {
					console.error(error);
					sendBotString("onCorruptMidiFile", (msg) => reply(message, msg));
				});
			}
			else if(hasExtension(attachment.filename, ["ly"]))
			{
				saveAttachedLilyPondFile(attachment, message.author, message.guild, (errorCallback) => {
					convertToScratchMidi(message.author, message.guild, (errorCallback) => {
						renderScratchMidi(message.author, message.guild, (errorCallback) => {
							doPlay(message);
						}, errorCallback);
					}, errorCallback);
				}, (error) => {
					console.error(error);
					sendBotString("onTuneError", (msg) => reply(message, msg));
				});
			}
			else sendBotString("onNeedMidiOrLilyPondFile", (msg) => reply(message, msg));
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
function repeatTune(arg, args, message)
{
	doPlay(message, () => {
		sendBotString("onEncore", (msg) => reply(message, msg));
	});
}

// stop playing in the channel of the guild the message is from
function stopPlayingTune(arg, args, message)
{
	if(message.guild && stopSound(message.guild))
	{
		sendBotString("onStopTune", (msg) => reply(message, msg));
		voiceEvent(message.guild);
	}
	else sendBotString("onNotPlayingTune", (msg) => reply(message, msg));
}

// respond to the message with examples
function requestExamples(arg, args, message)
{
	// get the list of example strings
	const ls = Object.keys(config.examples).map((key) => {
		const example = config.examples[key];
		return `**${key}**:${ example.credit ? ` _(sequenced by ${example.credit})_` : " " }\`\`\`${config.trigger}${example.example}\`\`\``;
	});
	sendBotString("onExampleRequest", (msg) => message.author.send(msg), (msg) => message.author.send(msg), `\n\n${ls.join("\n\n")}`, "\n\n");
}

// see what known instruments there are
function requestInstruments(arg, args, message)
{
        // get the list of instrument strings
        const ls = Array(128).fill().map((v, i) => {
                const aliases = Object.keys(config.programs).filter((key) => {
                        return config.programs[key] == i;
                }).map((alias) => {
                        return `\`${alias}\``;
                }).join(" ");
                return `• \`p${parseInt(i) + 1}\`\t${aliases}`;
        });
        sendBotString("onInstrumentRequest", (msg) => message.author.send(msg), (msg) => message.author.send(msg), `\n${ls.join("\n")}`);
}

// respond with help message
function requestHelp(arg, args, message)
{
	sendBotString("onHelpRequest", (msg) => reply(message, msg), (msg) => message.channel.send(msg));
}

// respond with tutorial message
function requestTutorial(arg, args, message)
{
	sendBotString("onTutorialRequest", (msg) => message.author.send(msg), (msg) => message.author.send(msg));
}

// respond with discord server invite link in private messages
function requestInviteLink(arg, args, message)
{
	sendBotString("onInviteLinkRequest", (msg) => message.author.send(msg));
}

// respond with github link in private messages
function requestGithubLink(arg, args, message)
{
	sendBotString("onGithubLinkRequest", (msg) => message.author.send(msg));
}

// respond with support invite
function requestSupport(arg, args, message)
{
	sendBotString("onSupportRequest", (msg) => message.author.send(msg));
}

// respond with info message
function requestInfo(arg, args, message)
{
	sendBotString("onInfoRequest", (msg) => reply(message, msg), (msg) => message.channel.send(msg));
}

// respond with list of commands
function requestCommandListing(arg, args, message)
{
        // get the list of command strings
        const ls = Object.keys(config.commands).sort().map((key) => {
		const aliases = config.commands[key].aliases.map((v, i) =>
			(i ? `\`${config.trigger}${v}\`` : `**\`${config.trigger}${v}\`**`));
		const description = config.commands[key].description;
		const aliasString = aliases.join(", ");
		return `• ${aliasString}:\n\t\t**->** ${description}`;
	});
        sendBotString("onCommandListingRequest", (msg) => message.author.send(msg), (msg) => message.author.send(msg), `\n${ls.join("\n")}`);
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
registerCommand(config.commands.joinVoiceChannel.aliases, joinVoiceChannel);
registerCommand(config.commands.leaveVoiceChannel.aliases, leaveVoiceChannel);
registerCommand(config.commands.autoCommand.aliases, autoCommand);
registerCommand(config.commands.requestSheets.aliases, requestSheets);
registerCommand(config.commands.requestMidiFile.aliases, requestMidiFile);
registerCommand(config.commands.requestLilyPondFile.aliases, requestLilyPondFile);
registerCommand(config.commands.requestPdfFile.aliases, requestPdfFile);
registerCommand(config.commands.playTune.aliases, playTune);
registerCommand(config.commands.repeatTune.aliases, repeatTune);
registerCommand(config.commands.stopPlayingTune.aliases, stopPlayingTune);
registerCommand(config.commands.requestHelp.aliases, requestHelp);
registerCommand(config.commands.requestTutorial.aliases, requestTutorial);
registerCommand(config.commands.requestInstruments.aliases, requestInstruments);
registerCommand(config.commands.requestExamples.aliases, requestExamples);
registerCommand(config.commands.requestInviteLink.aliases, requestInviteLink);
registerCommand(config.commands.requestGithubLink.aliases, requestGithubLink);
registerCommand(config.commands.requestInfo.aliases, requestInfo);
registerCommand(config.commands.requestSupport.aliases, requestSupport);
registerCommand(config.commands.requestCommandListing.aliases, requestCommandListing);

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
	console.log(`Currently a part of ${client.guilds.size} guilds:\n${client.guilds.map(guild => {
		return `-> ${guild.name}`;
	}).join("\n")}`);

	// set the discord presence to show how to get help
	client.user.setGame(`${config.trigger}help`);

	// update discordbots.org stats
	postStats();
});

// when bot is added to a guild
client.on("guildCreate", guild => {
	console.log(`Added to guild ${guild.name} <${guild.id}>!`);	
	console.log(`Now a part of ${client.guilds.size} guilds!`);

	// update discordbots.org stats
	postStats();
});

// when bot is removed from a guild
client.on("guildDelete", guild => {
	console.log(`Removed from guild ${guild.name} <${guild.id}>!`);	
	console.log(`Now a part of ${client.guilds.size} guilds!`);

	// update discordbots.org stats
	postStats();
});

// on message recieve
client.on("message", message => {
	// ignore messages from self
	if(client.user.id === message.author.id) return;
	// ignore messages from bots
	if(message.author.bot) return;

	// figure out if a message is directed at the bot or not
	// and extract the intended message to the bot
        const content = message.content.trim();
	const attachment = message.attachments.first();
        const dm = !message.guild;
	// is it safe to use arbitrary string as regex ? ?
	const triggerCount = (content.match(new RegExp(config.trigger, "g")) || []).length;
        const triggered = content.startsWith(config.trigger) && (!config.singleTrigger || triggerCount == 1);
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
		const loggedMsg = msg.split("\n").map((line, i) => {
			return i ? `\t${line}` : line;
		}).join("\n");
		if(dm) console.log(`${message.author.tag}> ${loggedMsg}`);
		else console.log(`${message.guild.name}> #${message.channel.name}> ${message.author.tag}> ${loggedMsg}`);

		// go handle the message to the bot
		processBotMessage(msg, message);
	}
});

// run the bot!
client.login(config.token);
