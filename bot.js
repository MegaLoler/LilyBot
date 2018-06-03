/* the main bot entry point connecting to discord
 * temporary, just based on old code for now
 */

const config = require('./config');
const Discord = require('./gateways/discord');
const Attachment = require('./gateways/gateway').Attachment;
const shell = require('./shell');
const child = require('child_process');
const discord = require('discord.js');

// make the discord connection
const client = new discord.Client();

// empty for now
function postStats() {}

// synchronously download data from url and return the data
// cheap solution for downloading attachments
// i hope sync is okay, since we have to wait for the attachments to download in that thread before being able to handle the users request with them
function downloadFileSync(url) {
	return child.execFileSync('curl', ['--silent', '-L', url], {encoding: 'utf8'});
}

// process a message to the bot
// the message string, and the originating discord message object
function processBotMessage(msg, message)
{
	// create the gateway object to pass to the shell
	const gateway = new Discord(message.author, message.channel);
	const attachments = message.attachments.map(x => {
		return new Attachment(x.filename, downloadFileSync(x.url));
	});
	shell(msg, attachments, gateway);
}

// remove mentions of the bot from a message
function removeMentions(msg)
{
	const mention = `<@${client.user.id}>`;
	return msg.replace(new RegExp(mention, "g"), "");
}

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
