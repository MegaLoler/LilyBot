/* gateway to the command line user interface */

const os = require('os');
const fs = require('fs');
const readline = require('readline');
const player = require('play-sound')();
const Gateway = require('./gateway');

class CLI extends Gateway {
	constructor(inPrompt='> ', outPrompt = '< ') {
		const username = os.userInfo().username;
		const hostname = os.hostname();
		super('cli', username, `${username}@${hostname}`);
		this.inPrompt = inPrompt;
		this.outPrompt = outPrompt;
	}

	ready() {
		process.stdout.clearLine();
		process.stdout.write(this.outPrompt);
	}

	send(message) {
		console.log(`${this.outPrompt}${message}`);
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
	}
}

module.exports = CLI;
