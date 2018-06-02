/* THIS IS THE LEGACY SHELL
 * i'll replace it later
 * but right now its taken from old lilybot
 * and simplified a bit
 */

// config
const config = require("./config");

/* BOT COMMAND FUNCTIONS */

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

// on message recieve
// the message (string), any attachments, and the source gateway
function handleMessage(message, attachments, gateway) => {
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

module.exports = handleMessage;
