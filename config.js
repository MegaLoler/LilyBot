// store the configuration in this object
const config = {};

// set testing to true if this is being used on a testing bot (more debug output)
// pass command line argument "test" to start in testing mode
// trigger is what is to precede messages to the bot
// auto leave voice channels after specified seconds
// bot channel is a channel where the bot will respond to all messages without needing triggers
// scratch directory is the directory where scratch files generated will be kept
// auto join when asked to play and not in voice yet
// auto stop playing tune when asked to play and already playing one
config.testing = process.argv[2] == "test";
config.trigger = config.testing ? "t##" : "##";
config.autoLeaveTimout = 300; // 5 minutes
config.botChannel = "lilybot";
config.scratchDirectory = "scratch";
config.autoJoin = true;
config.autoStop = true;

// links
const inviteLink = "https://discordapp.com/oauth2/authorize?client_id=366712156898590720&scope=bot&permissions=0";
const githubLink = "https://github.com/MegaLoler/LilyBot";

// tutorial message
const tutorialString = `**How to compose your own tunes!**
_Basics:_
After getting my attention by starting your message with \`${config.trigger}\`, just tell me what notes you'd like to play! (\`c d e f g a b\`) (Add a \`#\` after the letter name to raise it a half step.) I don't care about whitespace, so feel free to space out your musical typing however you like~  If you want to include a musical rest, use \`.\` and if you'd like to hold out a note a little longer, use \`-\`.  Just tell me a number if you want to tell me what octave to play the following notes in (\`1 2 3 4 5 6 7\`), or if you'd just like to move up or down an octave just put a \`<\` to go down or a \`>\` to go up. (It'll take affect for the following notes.) You can play chords by putting notes in \`[]\` like this simple C major triad chord here: \`[c e g]\`  If you'd like to really emphasize a note or a chord, just put \`^\` right before it, and I'll know to play it a little louder than all the rest. :3 And if you want to make it even louder than that, you can add more, like this: \`^^\` or even \`^^^\`. Likewise, to deemphasize a note or chord, use \`v\` right before it, and you can double or triple those, too! If you want to set dynamics, put a \`p\` (piano) to make the following notes softer, a \`m\` (mezzo piano) to make them normal, and \`l\` (loud) to make them louder. And finally, if you just want to repeat a note you already typed, just put a \`,\` instead of going to all the trouble of typing it all again. :3

_Multiple Parts:_
You can also tell me to play multiple parts at once by simply separating them with \`:\`!  You can even tell me what instrument to play by preceding a part with the instrument name + \`:\` like this example which plays two parts, one for trumpet and one for tuba: \`\`\`${config.trigger}trumpet: 4efgc-- : tuba: 2cdgc--\`\`\`
Just let me know if you'd like to know which \`${config.trigger}instruments\` I can play for you!
Lastly, you can tell me to play different parts at different speeds by preceding a part with the speed + \`:\` like this example: \`\`\`${config.trigger}fast: piano: c c# d d# e f f# g g# a a# b >^c ... <. c\`\`\`
These are the speeds I can do: \`slowest slower slow normal fast faster fastest half double\` (\`half\` plays at half of whatever speed you already specified, and \`double\` does twice instead!)
And as a little bonus, if you want to play one part quieter than the rest, you can just put \`quiet:\` before the part! (That's useful for adding in background harmonies and suchlike that you don't want to overpower the rest for example.)
If you don't tell me which speed to play at, I'll go at a \`normal\` speed, and if you don't tell me which instrument to play, I'll play the \`piano\` for you. :3

_Happy Composing!~~_`;

// help message
const helpString = `Hi! I'm **Tune Bot**!  I will play tunes for you that you can compose yourself and share with others! ^^

**Here's some stuff I can do:** _(Commands)_
• \`${config.trigger}join\` — I'll join the voice channel you're in. :3
• \`${config.trigger}leave\` — I'll leave the voice channel if you'd really prefer, though I like being in there. :c
• \`${config.trigger}stop\` — I'll stop playing the tune I'm playing.
• \`${config.trigger}encore\` — If you really liked it, I'll play it for you again! :D
• \`${config.trigger}help\` — I'll tell you about myself and what I can do for you~ ^^
• \`${config.trigger}tutorial\` — I'll teach you how to make your very own tunes!
• \`${config.trigger}instruments\` — I'll show you the list of instruments I can play.
• \`${config.trigger}examples\` — I'll show you some examples of some tunes I can play for you. o:

**How to play tunes!** _(Quick Start)_
First, make sure I'm in a voice channel (if I'm not, you can invite be to one by going into one yourself and then telling me to \`${config.trigger}join\` you.
Once I'm in there, ask me to play _Bad Apple_ like this: \`\`\`${config.trigger}defg a- >dc <a-d- agfe defg a-gf edef edc#e defg a- >dc <a-d- agfe defg a-gf e.f.g.a.\`\`\`
See my \`${config.trigger}examples\` for some more examples of tunes I can play for you!
If you're interested in composing your own tunes, ask me about my \`${config.trigger}tutorial\`! :D`;

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
	// when you tell it to play in private messages and it can't
	"onPrivatePlayFail": {
		string: "If you want me to play for you, you should ask me in a server! Sadly I'm not allowed to play for people privately. :c",
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
};

// example tunes from various people
config.examples = {
        "Something": {
		example: "normal: guitar: 2^c.c.3^c.2c.^c.c.3^c...1^a.a.2^a.1a.^a.a.2^a...1^f.f.2^f.1f.^f.f.2^f...1^g.g.2^g.1g.^g.g.2^g... :\n4^[c<g>]--[c<g>].[c<g>]de^[c<g>]--^[c<g>]....^[c<g>]--[c<g>].[c<g>]de^[fc<g>].[ec<g>].^[c<g>]...^[c<g>]--[c<g>].[c<g>]de^[c<g>]--^[c<g>]....^[c<g>]--[c<g>].[c<g>]de^[fc<g>].[ec<g>].^[c<g>].[d<g>].",
	},
        "Nyan Cat": {
		example: "fast: 2e.3e.2f#.3f#.2d#.3d#.2g#.3g#.2c#.3c#.2f#.3f#.1b>b<b.>c#.d#. 2e.3e.2f#.3f#.2d#.3d#.2g#.3g#.2c#.3c#.2f#.3f#.1b>b<b.>c#.d#. :\n5f#.g#.dd#.c#dc#<b.b.>c#.d.dc#<b>c#d#f#g#d#f#c#d#<b>c#<b>d#.f#.g#d#f#c#d#<b>dd#dc#<b>c#d.<b>c#d#f#c#dc#<b>c#.<b.b.",
	},
        "Bad Apple": {
		example: "fast: tuba: 2d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#->d#f#<g#->f#g# 1b-->b.ba#b< 1b-->b.ba#b 2c#-->c#.c#<b>c# <d-->d.dcd  2d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#-->d#.d#c#d#< d#->d#f#<g#->f#g# 1b-->b.ba#b< 1b-->b.ba#b 2c#-->c#.c#<b>c# <d-->d.dcd :\nhalf: trumpet: 4d#e#f#g#a#->d#c#<a#-d#-a#g#f#e# d#e#f#g#a#-g#f#e#d#e#f#e#d#de#  4d#e#f#g#a#->d#c#<a#-d#-a#g#f#e# d#e#f#g#a#-g#f#e#.f#.g#.a#. :\nquiet: trombone: 3a#>c#d#e#f#-a#g#f#-<a#->f#e#d#c# 3a#>c#d#e#f#-e#d#c#<a#>c#d#<a#a#g#g# f#g#a#>e#f#-a#g#f#-<a#->f#e#d#c# 3a#>c#d#e#f#-e#d#c#.d#.e#.e#.",
	},
        "Something Else": {
		example: "flute:[3a#>dfa]-----[cfg]---------[<a>ceg]-----[<aa#>df]-----[<ga#>df]--- :\npiano:double: 5^f-f-d-..^c---d-^c---c-<a-..^g---a-..^g-----f-....^f-------c-d.^f--g#a....... :\nsynth: half: 1^a#--a#..^a---......^a--a..^g---^g.......",
	},
        "Hello, How Are You": {
		example: "5e[f#b]..e..[ef#].........[d#b]..f#..[eb]........\n5e[f#b]..e..[ef#].........[d#b]..f#..[eb]........\n5e[f#b]..e..[ef#].........[f#b]..e..[ef#]........ :\ng#4g#.....a.........b.....>c#.........\n4g#.....a.........b.....>c#.........\n4g#.....a.........b.....>c#......... :\nflute: 5e............................>c#---\n<b..ee.<b.b.>e.e...f#ef#ef#-g#ag#...e->c#-<b..ee.<b.b.>e.e.e.f#-e.d#.e-........",
	},
        "Nightmare in Dreamland": {
		example: "flute:double:5g-------f---d#---d---<a#---g------->c---d---d#---f---d---.........gab>c-..............................c-......<g-......d#-..d-..c-......c-..d-..d#-..c-..<a#-..>c-..<g-...... :\nhalf:piano: [2f>a#>c]-------[2g>a#>d]-------[2g#>g>d#]-------[2b>g>f]-------\n3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]\n3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]\n3f[4cf]c[4cf]3f[4cf]2g[4cf]3c[4cd#]2g[4cd#]3c[4cd#]2g[4cd#]",
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
	}
};

module.exports = config;
