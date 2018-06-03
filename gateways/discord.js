/* gateway to a discord channel using discord.js */

const fs = require('fs');
const gateway = require('./gateway');

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

class Discord extends gateway.Gateway {
	constructor(user, channel) {
		super('discord', user.username, user.id, channel.id);
		this.user = user;
		this.channel = channel;
	}

	send(message, attachments=[]) {
		safeSend(message, message => {
			const files = attachments.map(x => {
				const name = `/tmp/attachment-${x.name}`;
				fs.writeFile(name, x.data, console.error);
				return name;
			});
			this.channel.send(message, {
				files: files.map(file => {
					return { attachment: file };
				}),
			});
		}, message => this.channel.send(message));
	}

	play(audio) {
		// todo
	}
}

module.exports = Discord;
