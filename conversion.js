/* functions for converting objects between different formats
 * exports a mapping of source->target conversion functions
 *
 */

// TODO: have target "classes" (such as audio file formats, and image file formats) that can be dealt with in a bundle
// also !! i want to avoid file based exchanges, lets keep things in memory if possible,
// if using external commands, try piping the data via stdin????? or use /tmp, or something idk
// in the future, dont use external commands here at all, move everything out into external libs

const fs = require('fs');
const { spawn } = require('child_process');

// language related imports
const legacy = require('./languages/legacy');

// run an external command
function runCommand(cmd, args, callback, onError, onStdout) {
        const child = spawn(cmd, args);
	child.failed = false;

        child.stdout.on('data', data => {
		console.info(`${cmd}: ${data}`);
		onStdout && onStdout(data, child);
        });

        child.stderr.on('data', data => {
		console.error(`${cmd}: ${data}`);
		onStdout && onStdout(data, child);
        });

        child.on('close', code => {
		if((code || child.failed) && onError) onError(`${cmd} exit status: ${code}`);
		else callback && callback(onError);
        });

	return child;
}

// wrapper functions for conversion
// TODO: make them actually do something :p
function legacy2lilypond(object, callback, onError) {
	callback(legacy.tune2lily(object));
}

// TODO: cleanup the lilypond integration.. and in general deal with external programs that have to output files.. and when they output multiple you can go ahead and cache.. etc
// honestly, a lib for wrapping lilypond up in general would be nice
// yeah all this is duplicate code and can be much better
function lilypond2png(object, callback, onError) {
	const proc = runCommand('lilypond', ['-dsafe', '-fpng', '-o', '/tmp/lily', '-'], () => {
		runCommand('mogrify', ['-trim', '/tmp/lily.png'], () => {
			fs.readFile('/tmp/lily.png', (err, data) => {
				if(err) onError(err);
				else callback(data);
			});
		}, onError);
	}, onError);
	proc.stdin.write(object);
	proc.stdin.end();
}

function lilypond2pdf(object, callback, onError) {
	const proc = runCommand('lilypond', ['-dsafe', '-fpdf', '-o', '/tmp/lily', '-'], () => {
		fs.readFile('/tmp/lily.pdf', (err, data) => {
			if(err) onError(err);
			else callback(data);
		});
	}, onError);
	proc.stdin.write(object);
	proc.stdin.end();
}

function lilypond2midi(object, callback, onError) {
	const proc = runCommand('lilypond', ['-dsafe', '-o', '/tmp/lily', '-'], () => {
		fs.readFile('/tmp/lily.midi', (err, data) => {
			if(err) onError(err);
			else callback(data);
		});
	}, onError);
	proc.stdin.write(object);
	proc.stdin.end();
}

function midi2wave(object, callback, onError) {
	const proc = runCommand('timidity', ['-Ow', "-o", '/tmp/lily.wav', '-'], () => {
		fs.readFile('/tmp/lily.wav', (err, data) => {
			if(err) onError(err);
			else callback(data);
		});
	}, onError);
	proc.stdin.write(object);
	proc.stdin.end();
}

function wave2mp3(object, callback, onError) {
	const proc = runCommand('ffmpeg', ['-y', '-i', "-", '/tmp/lily.mp3'], () => {
		fs.readFile('/tmp/lily.mp3', (err, data) => {
			if(err) onError(err);
			else callback(data);
		});
	}, onError);
	proc.stdin.write(object);
	proc.stdin.end();
}

// export the graph of target formats and ways things can be converted
// TODO: fill it up!
module.exports = {
	legacy: {	// legacy tunebot/lilybot input language
		lilypond: legacy2lilypond,
	},
	tunelang: {	// new language based on teoria
	},
	abc: {		// abc music notation
	},
	mml: {		// a music macro language variant
	},
	musicxml: {	// music xml format
	},
	lilypond: {	// lilypond score format
		png: lilypond2png,
		pdf: lilypond2pdf,
		midi: lilypond2midi,
	},
	pdf: {		// rendered sheets as pdf
	},
	png: {		// rendered sheets as png files
	},
	xm: {		// xm tracker module
	},
	midi: {		// midi file
		wave: midi2wave,
	},
	vgm: {		// logged sound chip accesses
	},
	wave: {		// audio rendered to .wav file
		mp3: wave2mp3,
	},
	mp3: {		// audio rendered to .mp3 file
	},
};
