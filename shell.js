/* THIS IS THE LEGACY SHELL
 * i'll replace it later
 * but right now its taken from old lilybot
 * and simplified a bit
 */

// config
const config = require("./config");

/* BOT COMMAND FUNCTIONS */

// respond to the message with examples
function requestExamples(arg, args, gateway)
{
	// get the list of example strings
	const ls = Object.keys(config.examples).map((key) => {
		const example = config.examples[key];
		return `**${key}**:${ example.credit ? ` _(sequenced by ${example.credit})_` : " " }\`\`\`${config.trigger}${example.example}\`\`\``;
	});
	gateway.send(`${config.botStrings['onExampleRequest'].string}\n\n${ls.join("\n\n")}`);
}

// see what known instruments there are
function requestInstruments(arg, args, gateway)
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
	gateway.send(`${config.botStrings['onInstrumentRequest'].string}\n${ls.join("\n")}`);
}

// respond with help message
function requestHelp(arg, args, gateway)
{
	gateway.send(config.botStrings['onHelpRequest'].string);
}

// respond with tutorial message
function requestTutorial(arg, args, gateway)
{
	gateway.send(config.botStrings['onTutorialRequest'].string);
}

// respond with discord server invite link in private messages
function requestInviteLink(arg, args, gateway)
{
	gateway.send(config.botStrings['onInviteLinkRequest'].string);
}

// respond with github link in private messages
function requestGithubLink(arg, args, gateway)
{
	gateway.send(config.botStrings['onGithubLinkRequest'].string);
}

// respond with support invite
function requestSupport(arg, args, gateway)
{
	gateway.send(config.botStrings['onSupportRequest'].string);
}

// respond with info message
function requestInfo(arg, args, gateway)
{
	gateway.send(config.botStrings['onInfoRequest'].string);
}

// respond with list of commands
function requestCommandListing(arg, args, gateway)
{
        // get the list of command strings
        const ls = Object.keys(config.commands).sort().map((key) => {
		const aliases = config.commands[key].aliases.map((v, i) =>
			(i ? `\`${config.trigger}${v}\`` : `**\`${config.trigger}${v}\`**`));
		const description = config.commands[key].description;
		const aliasString = aliases.join(", ");
		return `• ${aliasString}:\n\t\t**->** ${description}`;
	});
	gateway.send(`${config.botStrings['onCommandListingRequest'].string}\n${ls.join("\n")}`);
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
/*registerCommand(config.commands.requestSheets.aliases, requestSheets);
registerCommand(config.commands.requestMidiFile.aliases, requestMidiFile);
registerCommand(config.commands.requestLilyPondFile.aliases, requestLilyPondFile);
registerCommand(config.commands.requestPdfFile.aliases, requestPdfFile);
registerCommand(config.commands.playTune.aliases, playTune);
registerCommand(config.commands.repeatTune.aliases, repeatTune);
registerCommand(config.commands.stopPlayingTune.aliases, stopPlayingTune);
*/
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
function executeCommand(cmd, arg, args, gateway)
{
	// get the command function and call it
	// return false if command doesn't exist
	const command = commands[cmd];
	if(command) command(arg, args, gateway);
	else return false;
	return true;
}

// process a message to the bot
// the message string, and the originating discord message object
function processBotMessage(msg, attachments, gateway)
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
	if(!executeCommand(cmd, arg, args, gateway))
		gateway.send("cmd not found lol");
}

module.exports = processBotMessage;
