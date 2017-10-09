LilyBot
========

A LilyPond-powered Discord bot written for Node.js for composing and playing tunes in voice channels and rendering sheet music on the fly!

## Add it to your Discord Server

[Click here!](https://discordapp.com/oauth2/authorize?client_id=366712156898590720&scope=bot&permissions=0)

Or if you want to run the code yourself, continue reading.

## Dependencies

Node.js dependencies:
`mkdirp`
`discord.js`

Command line dependencies:
`lilypond`
`mogrify`
`timidity++`

## Run

Put the client token inside a file called `token.txt` and then do this:
`node lilybot.js`

Or if you want to run in test mode (uses alternate bot trigger by default, and has more debug output) then do this:
`node lilybot.js test`

## Configuration

If you want to configure the bot to your liking, edit `config.js`.
