/* gateway to the command line user interface */

const os = require('os');
const fs = require('fs');
const readline = require('readline');
const player = require('play-sound')();
const gateway = require('./gateway');

class CLI extends gateway.Gateway {
	constructor(inPrompt='> ', outPrompt = '< ') {
		const username = os.userInfo().username;
		const hostname = os.hostname();
		super('cli', username, `${username}@${hostname}`);
		this.inPrompt = inPrompt;
		this.outPrompt = outPrompt;
	}

	ready() {
		process.stdout.clearLine();
		process.stdout.write(this.inPrompt);
	}

	send(message, attachments=[]) {
		console.log(`${this.outPrompt}${message}`);
		// and i guess just write the attachments to tmp files? lol
		attachments.forEach(x => {
			fs.writeFile(`/tmp/attachment-${x.name}`, x.data, console.error);
		});
	}

	play(audio) {
		// i'd rather not write to a file and then play |D
		fs.writeFile('/tmp/audio', audio, err => {
			player.play('/tmp/audio');
		});
	}

	// create an interface for user input via cli
	engage() {
		readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true,
		}).on('line', line => {
			this.onMessage(line);
			this.ready();
		});
		this.ready();
	}
}

module.exports = CLI;
