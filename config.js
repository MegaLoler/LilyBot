const fs = require("fs");
const discord = require("discord.js");

// store the configuration in this object
const config = {};

// set testing to true if this is being used on a testing bot (more debug output)
// pass command line argument "test" to start in testing mode
// trigger is what is to precede messages to the bot
// if singleTrigger is false, the message @ the bot is allowed to contain the trigger in the body of message, (useful for ignoring strikeout messaged if the trigger is ~~)
// alsways mention the user being replied to or not
// auto leave voice channels after specified seconds
// bot channel is a channel where the bot will respond to all messages without needing triggers
// scratch directory is the directory where scratch files generated will be kept
// auto join when asked to play and not in voice yet
// auto stop playing tune when asked to play and already playing one
// code block alias is what to put after ``` to give block code to the bot
// scratch file name is the name of the scratch files in the scratch directory, also what people see when sent files
// token file is the file to read the login token from
// discord bots token file is file to read the discordbots.org api token from
// support link is invite to support server support channel
// delay is how many miliseconds to wait before calling back after mogrify and after lilypond
config.testing = process.argv[2] == "test";
config.trigger = config.testing ? "t--" : "~~";
config.singleTrigger = true;
config.replyMention = false;
config.botChannel = "lilybot";
config.enableBotChannelAddressing = false;
config.blockCodeAlias = "lily";
config.autoLeaveTimout = 600; // 10 minutes
config.autoJoin = true;
config.autoStop = true;
config.scratchDirectory = "scratch";
config.scratchFileName = "lilybot";
config.tokenFile = "token.txt";
config.discordBotsTokenFile = "discordBotsToken.txt";
config.author = "Mego#8517";
config.framework = `discord.js ${discord.version}`;
config.delay = 500;

// links
const inviteLink = "https://discordapp.com/oauth2/authorize?client_id=366712156898590720&scope=bot&permissions=0";
const githubLink = "https://github.com/MegaLoler/LilyBot";
const supportLink = "https://discord.gg/uufzzPg";

// load the login token from the file
// probably make this better, use fs.access instead
if(fs.existsSync(config.tokenFile)) config.token = fs.readFileSync(config.tokenFile, "ascii").trim();
else
{
	console.error(`Please create the file "${config.tokenFile}" and put your Discord token inside.`);
	process.exit(1);
}
// now discord bots token
if(fs.existsSync(config.discordBotsTokenFile)) config.discordBotsToken = fs.readFileSync(config.discordBotsTokenFile, "ascii").trim();
else
{
	console.error(`Please create the file "${config.discordBotsTokenFile}" and put your Discord token inside.`);
	process.exit(1);
}

// bot command aliases and descriptions
// these are what the users type in to interact with the bot
config.commands = {};
config.commands.joinVoiceChannel = {
	aliases: ["join", "voice", "enter", "hello", "come", "comeon", "here"],
	description: "I'll join you in the voice channel you are in!",
};
config.commands.leaveVoiceChannel = {
	aliases: ["leave", "exit", "part", "bye", "get", "shoo", "goaway", "nasty"],
	description: "I'll leave the voice channel I'm in...",
};
config.commands.autoCommand = {
	aliases: ["auto"],
	description: "I'll play tunes you give me if you're in a voice channel or else I'll send you sheet music instead!",
};
config.commands.requestSheets = {
	aliases: ["sheets", "sheet", "sheetmusic", "notation", "png", "render", "look", "see", "draw", "type", "score"],
	description: "I'll send you some sheet music of the music you sent me!",
};
config.commands.requestMidiFile = {
	aliases: ["midi", "download", "file", "save", "request", "mid", "get"],
	description: "I'll send you a midi file of the music you gave me!",
};
config.commands.requestLilyPondFile = {
	aliases: ["lily", "ly", "lilypond", "lyfile", "lilyfile", "lilypondfile", "getly", "getlily", "getlilypondfile"],
	description: "I'll send you the Lilypond file of the music you gave me.",
};
config.commands.requestPdfFile = {
	aliases: ["pdf", "document", "downloadsheet", "downloadsheets", "print", "printsheet", "printsheets"],
	description: "I'll send you a PDF file of the sheets I made for you~",
};
config.commands.playTune = {
	aliases: ["play", "tune", "listen", "hear", "sound", "audio", "wav"],
	description: "I'll play the tune you sent me in a voice channel!",
};
config.commands.repeatTune = {
	aliases: ["again", "repeat", "encore"],
	description: "I'll play whatever I just played again!",
};
config.commands.stopPlayingTune = {
	aliases: ["stop", "quit", "quiet", "end"],
	description: "I'll stop playing any tunes I'm currently playing.",
};
config.commands.requestHelp = {
	aliases: ["help", "commands", "about", "info"],
	description: "I'll give you some general help with me and tell you how to get started quickly!",
};
config.commands.requestTutorial = {
	aliases: ["tutorial", "composing", "how", "howto"],
	description: "I'll send you a more in depth tutorial on how to use me.",
};
config.commands.requestInstruments = {
	aliases: ["instruments", "sounds", "programs", "patches", "instrument"],
	description: "I'll send you a listing of all the instrument names I recognize.",
};
config.commands.requestExamples = {
	aliases: ["examples", "example", "tunes", "songs", "list", "songlist", "tunelist", "sample", "samples", "juke", "jukebox"],
	description: "I'll send you lots of examples from various users so you can get some ideas of things you can make with me!",
};
config.commands.requestInviteLink = {
	aliases: ["invite", "link", "server", "discord"],
	description: "I'll send you the link to invite me to your own Discord server!",
};
config.commands.requestGithubLink = {
	aliases: ["github", "git", "code", "dev", "developer", "creator", "writer", "author", "owner"],
	description: "I'll send you a link to my Github repository!",
};
config.commands.requestInfo = {
	aliases: ["info", "about", "information"],
	description: "See who made me, and what I was made with, and see how to get some useful links!",
};
config.commands.requestSupport = {
	aliases: ["support", "supportserver", "question", "comment", "concern", "report"],
	description: "I'll invite you to my support server and you can ask for help or leave comments!",
};
config.commands.requestCommandListing = {
	aliases: ["commands", "command", "commandlist", "commandlisting"],
	description: "Get a complete listing of all the commands I recognize and a description of what they do~",
};

// tutorial message
const tutorialString = `**How to compose your own tunes!**
_Basics:_
After getting my attention by starting your message with \`${config.trigger}\`, just tell me what notes you'd like to play! (\`c d e f g a b\`) (Add a \`#\` after the letter name to raise it a half step, and add a \`&\` after it to lower it a half step.) I don't care about whitespace, so feel free to space out your musical typing however you like~  If you want to include a musical rest, use \`.\` and if you'd like to hold out a note a little longer, use \`-\`.  Just tell me a number if you want to tell me what octave to play the following notes in (\`1 2 3 4 5 6 7\`), or if you'd just like to move up or down an octave just put a \`<\` to go down or a \`>\` to go up. (It'll take affect for the following notes.) You can play chords by putting notes in \`[]\` like this simple C major triad chord here: \`[c e g]\`  If you'd like to really emphasize a note or a chord, just put \`^\` right before it, and I'll know to play it a little louder than all the rest. :3 And if you want to make it even louder than that, you can add more, like this: \`^^\` or even \`^^^\`. Likewise, to deemphasize a note or chord, use \`v\` right before it, and you can double or triple those, too! If you want to set dynamics, put a \`p\` (piano) to make the following notes softer, a \`m\` (mezzo piano) to make them normal, and \`l\` (loud) to make them louder. And finally, if you just want to repeat a note you already typed, just put a \`,\` instead of going to all the trouble of typing it all again. :3 I almost forgot! If you want to make triplets, just put them inside parentheses like this: \`(e f g)\` And you can tie a note with the last one by putting a \`~\` right before it like this: \`c d ~d e\` (Or this, if you prefer: \`c d ~, e\`)
Put stuff in between \`{\` and \`}\` and I'll do it twice for you! Or four times if you do something like this: \`{{ c g e g }}\` Or eight times, or sixteen times!

_Multiple Parts:_
You can also tell me to play multiple parts at once by simply separating them with \`:\`!  You can even tell me what instrument to play by preceding a part with the instrument name + \`:\` like this example which plays two parts, one for trumpet and one for tuba: \`\`\`${config.trigger}trumpet: 4efgc-- : tuba: 2cdgc--\`\`\`
Just let me know if you'd like to know which \`${config.trigger}instruments\` I can play for you!
Lastly, you can tell me to play different parts at different speeds by preceding a part with the speed + \`:\` like this example: \`\`\`${config.trigger}fast: piano: c c# d d# e f f# g g# a a# b >^c ... <. c\`\`\`
These are the speeds I can do: \`slowest slower slow normal fast faster fastest half double\` (\`half\` plays at half of whatever speed you already specified, and \`double\` does twice instead!) Or if you wannabe really specific you can tell me a BPM by putting this before a part: \`tempo 4 = 140:\`
You can change how long your typed-in notes are by putting one of these before a part: \`whole:\` \`half:\` \`quarter:\` \`eighth:\` \`sixteeth:\` \`thirty-second:\` \`sixty-fourth:\` \`hundred-twenty-eighth:\` If it's all the same to you, I'll assume sixteenths. :3
And as a little bonus, if you want to play one part quieter than the rest, you can just put \`quiet:\` before the part! (That's useful for adding in background harmonies and suchlike that you don't want to overpower the rest for example.) (There's also \`loud\` as well!)
If you don't tell me which speed to play at, I'll go at a \`normal\` speed, and if you don't tell me which instrument to play, I'll play the \`piano\` for you. :3

Don't forget to ask me to make \`${config.trigger}sheet\` music of your tunes for you!! ^^ You can add clefs to your parts by putting one of these before the part: \`treble-clef:\` \`bass-clef:\` \`tenor-clef:\` \`alto-clef\`
And you can choose a time signature by putting something along the lines of this before it: \`time 6/8:\`
And of course key signatures too! (\`key g minor:\` \`key e mixolydian:\` \`key a# ionian:\` etc.)
Add a title: \`title Good Music:\` and say who it's by: \`by Me of course:\` and you'll be on your way. ^^

_Happy Composing!~~_`;

// help message
const helpString = `Hi! I'm **LilyBot**!  I will make sheet music of tunes you compose, and I'll play them for you too in the voice channels! And you can and share them with others! ^^

**Here's some stuff I can do:** _(Commands)_
• \`${config.trigger}join\` — I'll join the voice channel you're in. :3
• \`${config.trigger}leave\` — I'll leave the voice channel if you'd really prefer, though I like being in there. :c
• \`${config.trigger}sheets\` — I'll make you up some sheets of the tune you give me, or one you already gave me. :3
• \`${config.trigger}midi\` — I'll send you a midi file of the tune you give me, or one you already did!
• \`${config.trigger}play\` — I'll play a tune you give me, or one you already gave me.
• \`${config.trigger}stop\` — I'll stop playing the tune I'm playing.
• \`${config.trigger}encore\` — If you really liked it, I'll play it for you again! :D
• \`${config.trigger}help\` — I'll tell you about myself and what I can do for you~ ^^
• \`${config.trigger}tutorial\` — I'll teach you how to make your very own tunes!
• \`${config.trigger}instruments\` — I'll show you the list of instruments I can play.
• \`${config.trigger}examples\` — I'll show you some examples of some tunes I can play for you. o:
• \`${config.trigger}invite\` — If you like me a lot, you can invite me to your own Discord server!
• \`${config.trigger}github\` — Visit my Github repository!
• \`${config.trigger}info\` — Get some technical information about me~
• \`${config.trigger}commands\` — Have a full listing of all the commands I recognize!
• \`${config.trigger}support\` — If you have questions, comments, suggestions, or concerns, I'll invite you to my support channel so we can talk about it!

**How to make tunes!** _(Quick Start)_
First, meet me in a voice channel. (I'll join you automatically when you ask me to play.) Then ask me to play _Bad Apple_ like this: \`\`\`${config.trigger}defg a- >dc <a-d- agfe defg a-gf edef edc#e defg a- >dc <a-d- agfe defg a-gf e.f.g.a.\`\`\`
While you're at it, ask me for some \`${config.trigger}sheets\` of the tune! If you leave the voice channel I'll give you sheets automatically when you give me tunes.
See my \`${config.trigger}examples\` for some more examples of tunes I can play for you!
If you're interested in composing your own tunes, ask me about my \`${config.trigger}tutorial\`! :D

**Send me some files!**
Send me a _midi file_ (\`.mid\` \`.midi\`) or a _LilyPond file_ (\`.ly\`) and I'll play it for you in the voice channel or make you sheet music out of it! ^^ (Just @mention me with your file!)

**How to talk to me:**
There are a few different ways you can get my attention. The first way is to start your message with \`${config.trigger}\` so I know you are addressing me. Another way is to simply @mention me with your message to me. You can also simply send me a DM! One final way you can address me is to send me music code contained inside code blocks that start like this: \`\`\`\`lily\``;

// info message
const infoString = `**LilyBot**
Made with :heart: by **${config.author}** with **${config.framework}**

Ask me to visit my \`${config.trigger}github\` repository!
Ask me if you'd like to \`${config.trigger}invite\` me to your Discord server!

Ask me for \`${config.trigger}help\` to get started!
Ask to see my \`${config.trigger}tutorial\` to learn how to compose tunes!
And ask me for some \`${config.trigger}examples\` to get some ideas!

Visit my \`${config.trigger}support\` server if you have any questions, comments, suggestions, concerns, or just need general help with me!`;

// strings the bot uses
config.botStrings = {
	// when it joins a voice channel
	"onJoinVoiceChannel": {
		string: "I'm in there! ^^",
		enabled: true,
	},
	// when you invite it to a voice channel but you aren't in one
	"onJoinVoiceChannelFail": {
		string: "You should go into a voice channel first, silly! :3",
		enabled: true,
	},
	// when someone tries to get it to join a private call
	"onPrivateJoinVoiceChannelFail": {
		string: "I'm not allowed to join private calls, I'm really sorry!! ><",
		enabled: true,
	},
	// when it leaves the voice channel
	"onLeaveVoiceChannel": {
		string: "Okay, I left... :c",
		enabled: true,
	},
	// when you tell it to leave a voice channel but it's not in one
	"onLeaveVoiceChannelFail": {
		string: "I'm not in a voice channel though, silly. :3",
		enabled: true,
	},
	// when you tell it to leave a private call its not in
	"onPrivateLeaveVoiceChannelFail": {
		string: "We're not in a voice call, you silly goose. XD",
		enabled: true,
	},
	// when it leaves the voice channel automatically
	"onAutoLeaveVoiceChannel": {
		string: "I left the voice channel because it was lonely in there...",
		enabled: true,
	},
	// when it sends you back sheet music
	"onSendFile": {
		string: "Here you go!",
		enabled: true,
	},
	// when you ask for a file it doesn't have
	"onSendFail": {
		string: "I don't have anything to give you just yet! See `" + config.trigger + "help` to see how you can get something from me! :3",
		enabled: true,
	},
	// when you tell it to play something but it doesnt have anything to play
	"onPlayFail": {
		string: "I don't have anything to play yet! See `" + config.trigger + "help` to see how to give me things to play!",
		enabled: true,
	},
	// when you tell it to play in private messages and it can't
	"onPrivatePlayFail": {
		string: "If you want me to play for you, you should ask me in a server! Sadly I'm not allowed to play for people privately. :c\n(If you like, you can still ask me for a `" + config.trigger + "midi` file instead!)",
		enabled: true,
	},
	// when you ask it to play the tune again
	"onEncore": {
		string: "I'd love to play it for you again! ^-^",
		enabled: true,
	},
	// when it fails to evaluate a musical expression
	"onTuneError": {
		string: "Mmm, I'm sorry, I couldn't figure that one out! ><",
		enabled: true,
	},
	// when you send it something other than an .ly or .mid/.midi file when that's what it needs
	"onNeedMidiOrLilyPondFile": {
		string: "I need a midi file (`.mid` `.midi`) or a LilyPond file (`.ly`) to do anything! :c",
		enabled: true,
	},
	// when you send it something other than an .ly file when that's what it needs
	"onNeedLilyPondFile": {
		string: "I need a LilyPond file (`.ly`) to do that! :c",
		enabled: true,
	},
	// when you send it an invalid midi file
	"onCorruptMidiFile": {
		string: "I had trouble reading that midi file, I'm sorry... o~o",
		enabled: true,
	},
	// when you tell it to play something but it's not in a voice channel
	"onNotInVoiceChannel": {
		string: "You should invite me to a voice channel first! ^^ (Try this: `" + config.trigger + "join`)",
		enabled: true,
	},
	// when you tell it to play somethnig but it's busy already playing something else
	"onAlreadyPlayingTune": {
		string: "Please wait until I'm finished playing the current tune~ (or stop it with `" + config.trigger + "stop`)",
		enabled: true,
	},
	// when it stops playing a tune
	"onStopTune": {
		string: "I stopped playing the tune~",
		enabled: true,
	},
	// when you tell it to stop playing a tune but it's not playing one
	"onNotPlayingTune": {
		string: "But I'm not playing anything right now! :o",
		enabled: true,
	},
	// when you ask for the instruments it recognizes
	"onInstrumentRequest": {
		string: "These are the instruments that I know how to play:",
		enabled: true,
	},
	// when you ask to see examples of tunes to play
	"onExampleRequest": {
		string: "Here's some examples of tunes you can have me play for you:",
		enabled: true,
	},
	// when you ask for general help
	"onHelpRequest": {
		string: helpString,
		enabled: true,
	},
	// when you ask for the tutorial on how to compose tunes
	"onTutorialRequest": {
		string: tutorialString,
		enabled: true,
	},
	// when you ask for the server invite link for the bot
	"onInviteLinkRequest": {
		string: `Thank you for inviting me to your server! ^^\n${inviteLink}`,
		enabled: true,
	},
	// when you ask for the github link for the bot
	"onGithubLinkRequest": {
		string: `Here's my code on Github!\n${githubLink}`,
		enabled: true,
	},
	// when you ask for support
	"onSupportRequest": {
		string: `For questions and concerns and comments and suggestions and asking for help, here's a link to my support server! :D\n${supportLink}`,
		enabled: true,
	},
	// when you ask for info on the bot
	"onInfoRequest": {
		string: infoString,
		enabled: true,
	},
	// when you ask for listing of commands
	"onCommandListingRequest": {
		string: "Here's all the commands you can use with me and all the aliases I will respond to:",
		enabled: true,
	},
};

// example tunes from various people
config.examples = {
        "Nyan Cat": {
		example: `title Nyan Nyan: by Internet:
fast: treble-clef: key b major: flute:
5f#.g#.dd#.c#dc#<b.b.>c#.d.dc#<b>c#d#f#g#d#f#c#d#<b>c#<b>d#.f#.g#d#f#c#d#<b>dd#dc#<b>c#d.<b>c#d#f#c#dc#<b>c#.<b.>c#.
5f#.g#.dd#.c#dc#<b.b.>c#.d.dc#<b>c#d#f#g#d#f#c#d#<b>c#<b>d#.f#.g#d#f#c#d#<b>dd#dc#<b>c#d.<b>c#d#f#c#dc#<b>c#.<b.b.
b-f#g#b-f#g#b>c#d#<b>ed#ef#<b.b-f#g#bf#>ed#c#<bed#ef#   b-f#g#b-f#g#bb>c#d#<bf#g#f#b.ba#bf#g#b>ed#ef#<b-a#-
b-f#g#b-f#g#b>c#d#<b>ed#ef#<b.b-f#g#bf#>ed#c#<bed#ef#   b-f#g#b-f#g#bb>c#d#<bf#g#f#b.ba#bf#g#b>ed#ef#<b.>c#.
:
bass-clef: key b major: synth2:
{{{ 2e.3e.2f#.3f#.2d#.3d#.2g#.3g#.2c#.3c#.2f#.3f#.1b>b<b.>c#.d#. }}}`,
	},
        "Bad Apple": {
		example: `fast: 
trumpet: eighth: 4d#e#f#g#a#->d#c#<a#-d#-a#g#f#e# d#e#f#g#a#-g#f#e#d#e#f#e#d#de#  4d#e#f#g#a#->d#c#<a#-d#-a#g#f#e# d#e#f#g#a#-g#f#e#.f#.g#.a#. :
quiet: trombone: 3a#>c#d#e#f#-a#g#f#-<a#->f#e#d#c# 3a#>c#d#e#f#-e#d#c#<a#>c#d#<a#a#g#g# f#g#a#>e#f#-a#g#f#-<a#->f#e#d#c# 3a#>c#d#e#f#-e#d#c#.d#.e#.e#. :
double: bass-clef: tuba: 2d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#->d#f#<g#->f#g# 1b-->b.ba#b< 1b-->b.ba#b 2c#-->c#.c#<b>c# <d-->d.dcd  2d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#->d#f#<g#->f#g# 1b-->b.ba#b< 1b-->b.ba#b 2c#-->c#.c#<b>c# <d-->d.dcd`,
	},
        "Hello, How Are You": {
		example: `flute: 5............................................>c#---
<b..ee.<b.b.>e.e...f#ef#ef#-g#ag#...e->c#-<b..ee.<b.b.>e.e.e.f#-e.d#.e-........ :
piano: ...............e[f#b]..e..[ef#].........[d#b]..f#..[eb]........
5e[f#b]..e..[ef#].........[d#b]..f#..[eb]........
5e[f#b]..e..[ef#].........[f#b]..e..[ef#]........ :
4...............g#4g#.....a.........b.....>c#.........
4g#.....a.........b.....>c#.........
4g#.....a.........b.....>c#.........
--flute: ............................................5>c#---
<b..ee.<b.b.>e.e...f#ef#ef#-g#ag#...e->c#-<b..ee.<b.b.>e.e.e.f#-e.d#.e-........ :
piano: ...............5e[f#b]..e..[ef#].........[d#b]..f#..[eb]........
5e[f#b]..e..[ef#].........[d#b]..f#..[eb]........
5e[f#b]..e..[ef#].........[f#b]..e..[ef#]........ :
................4g#.....a.........b.....>c#.........
4g#.....a.........b.....>c#.........
4g#.....a.........b.....>c#.........`,
	},
        "Nightmare in Dreamland": {
		example: `flute: double:
m5g-------f---e&---d---<b&---g------->c---d---e&---f---d--...........l(gab)>^c...............................^c--.....<g-......e&--.d-..c-......c--.d-..e&-..c-..<b&--.>c-..<g-...... :
half: piano: bass-clef:
m[2f>b&>c]-------[2g>b&>d]-------[2a&>g>e&]-------[2b>g>f]-------
l3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]
3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]
3f[4cf]3c[4cf]3f[4cf]2g[4cf]3c[4ce&]2g[4ce&]3c[4ce&]2g[4ce&]`,
	},
        "Something": {
		example: "normal: guitar: 2^c.c.3^c.2c.^c.c.3^c...1^a.a.2^a.1a.^a.a.2^a...1^f.f.2^f.1f.^f.f.2^f...1^g.g.2^g.1g.^g.g.2^g... :\n4^[c<g>]--[c<g>].[c<g>]de^[c<g>]--^[c<g>]....^[c<g>]--[c<g>].[c<g>]de^[fc<g>].[ec<g>].^[c<g>]...^[c<g>]--[c<g>].[c<g>]de^[c<g>]--^[c<g>]....^[c<g>]--[c<g>].[c<g>]de^[fc<g>].[ec<g>].^[c<g>].[d<g>].",
	},
        "Something Else": {
		example: "flute:[3a#>dfa]-----[cfg]---------[<a>ceg]-----[<aa#>df]-----[<ga#>df]--- :\npiano:double: 5^f-f-d-..^c---d-^c---c-<a-..^g---a-..^g-----f-....^f-------c-d.^f--g#a....... :\nsynth: half: 1^a#--a#..^a---......^a--a..^g---^g.......",
	},
        "Kirby": {
		example: "faster: 4a...>d..ef#.e.f#.g.a...f#..ad...e...<a...>d..ef#.e.f#.g.a...b..ag.f#.e.f#.g...e.f#ga.g.f#.a.f#...d..ef#...<b...>e...e..f#e.d.c#.d.c#...d..d#e.c#.<b.a#. : 2d-3d-2d-3d-2c#-3c#-2c#-3c#-1b-2b-1b-2b-1g-2g-1a-2a- 2d-3d-2d-3d-2c#-3c#-2c#-3c#-2c-3c-2c-3c-1b-2b-1b-2b-1g-2g-1g-2g-1a-2a-1a-2a-2d-3d-2d-3d-1b-2b-1b-2b-1g-2g-1g-2g-1g#-2g#-1g#-2g#-1a-2a-1a-2a-1a-2a-1a-2a-",
	},
        "Deku Palace": {
		example: "2^e.<bbb.b.^>e.<b.b...^>e.<bbb.>e.^e.<b.b... :\ntrumpet: 4^e-b>c<^b-a-^gagf#^e-e-^e-ga^g-f#-^ef#ed^e-..",
	},
        "Twinkle": {
		example: "slowest: flute: ccggaag-ffeeddc- : piano: 2c>cecfcecd<b>c<afg>c<c",
	},
        "Mario": {
		example: "3dd.d.dd.g...g... : 4f#f#.f#.f#f#.[gb]...g... : 5ee.e.ce.g.......",
	},
        "Magical Sound Shower": {
		example: "slow: double: bass: 2a-- >e- <g- f#-- >d- d <f# g- a-- >e- <g- f# .... .... 2a-- >e- <g- f#-- >d- d <f# g- a-- >e- <g- f# : \npiano: 4a- >c- . <g- f#- a- . f#f#g- a- >c- . <g- f# .... .... 4a- >c- . <g- f#- a- . f#f#g- a- >c e . <g- f# :\npiano: 4e- a- . e- d- f#- . ddd- e- a- . e- d .... .... 4e- a- . e- d- f#- . ddd- e- a- . e- d",
		credit: "MastaGambit",
	},
        "Something Else Else": {
		example: "fast: piano: [4a#4f#][4a#4f#][4a#4f#][4a#4f#][4d#4g#].[4d#4g#].[4c#4f#].[4c#4f#].[4d#4g#]",
		credit: "MasterFoxify",
	},
        "Saria's Song": {
		example: "harp: 4f4a4b-4f4a4b-4f4a4b45e5d-4b5c4b4g4e-..4d4e4g4e-..4f4a4b-4f4a4b-4f4a4b5e5d-4b5c5e4b4g-..4b4g4d4e-..4c4d4e-4f4g4a-4b4a4e-...4c4d4e-4f4g4a-4b5c5d-...4c4d4e-4f4g4a-4b4a4e-...4f4e4g4f4a4g4b4a5c4b5d5c5d5e4b5c--....5d",
		credit: "MasterFoxify",
	},
        "Cello Suite III Bourée II": {
		example: "cello: cd d#-dcb.c. dc<bagfd#d d#gfd#fg#gf c<b>cdd#fga a#-g#gf-d#- dd#fgg#a#>cd d#-dc<a#g#gf d#----",
		credit: "Espio",
	},
        "All Star": {
		example: "slow:3f-4c3a3a-3g3f3f3a#-a3a3g3g3f.3f4c3a3a3g3g3f3f3d.3c-.3f3f4c3a3a3g3g3f3f3a#-3a3a3g3g3f3f-4c3a3a3g-3f3f3g-3d-",
		credit: "AMD Shill",
	},
	"Jaws Theme": {
		example: "bass:2c--------2c#........2c--------2c#........2c------2c#......2c------2c#......2c----2c#....2c----2c#....2c--2c#..2c--2c#..2c--2c#..2c--2c#..2c.2c#.2c.2c#.2c.2c#.2c.2c#.:tuba:2c--------2c#........2c--------2c#........2c------2c#......2c------2c#......2c----2c#....2c----2c#....2c--2c#..2c--2c#..2c--2c#..2c--2c#..2c.2c#.2c.2c#.2c.2c#.2c.2c#.:cello:2c--------2c#........2c--------2c#........2c------2c#......2c------2c#......2c----2c#....2c----2c#....2c--2c#..2c--2c#..2c--2c#..2c--2c#..2c.2c#.2c.2c#.2c.2c#.2c.2c#.:choir:2c--------2c#........2c--------2c#........2c------2c#......2c------2c#......2c----2c#....2c----2c#....2c--2c#..2c--2c#..2c--2c#..2c--2c#..2c.2c#.2c.2c#.2c.2c#.2c.2c#.",
		credit: "MasterFoxify",
	},
	"Take On Me": {
		example: "title Take On Me: by A-ha: key a major: eighth: faster: piano: 4f#4f#4d3b.3b.4e.4e.4e4g#4g#4a4b4a4a4a4e.4d.4f#.4f#.4f#4e4e4f#4e4f#4f#4d3b.3b.4e.44e.4e4g#4g#4a4b4a4a4a4e.4d.4f#.4f#.4f#....4d--4d-4c#3b-........4c#4c#-4c#-3a...4f#.4f#4f#-4e-4d--4d4d4c#-3b--.....3e4c#-4c#4c#-3b3a3a-3b-4c#3b3b3a-..4d-4d-4d4d--........3f#3a3a3a3a3a3a3g#--3g#3f#--2a-------3g#-------3a-------4e-.4f#--4e-3a-------4e-------4f#-------4e-.4f#--4e-4c#-------4g#-------4a-------..4b5c#.4b4a---5e---------------------",
		credit: "MasterFoxify",
	},
	"LilyBot.exe has crashed": {
		example: "fastest:taiko: hundred-twenty-eighth: fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeecccccccccccccccccaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeecccccccccccccccccaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeecccccccccccccccccaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeecccccccccccccccccaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbb",
		credit: "MasterFoxify",
	},
	"LilyBot's Theme": {
		example: "piano:p{4ceg-5c---4ceg-5c---3b4d#f#-b---3b4d#f#-b---4ceg-5c---3b4d#f#-b---3a4c#e-a---3g3b4d-g---}1g---------------:piano:l{6c-----6e-6c---5g---5b-----5b-5b---5f#---6c-----6e-5b---5b---5a-----5a-5g---5d---}",
		credit: "MasterFoxify",
	},
};

module.exports = config;
