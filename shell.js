// config
const config = require("./config");

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
					// then convert it to sheets incase someone wants it
					renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {}, errorCallback);
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
				// then convert it to sheets incase someone wants it
				renderScratchSheetMusic(message.author, message.guild, (errorCallback) => {}, errorCallback);
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
