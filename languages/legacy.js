/* the legacy tunelang -> lilypond compiler
 * keeping for compatibility with old tunes
 */

// lilypond templates...
// template to output score and midi both
function makeLilyPondScore(code, sheetTitle, composer)
{
	return `
\\version "2.18.2"
\\header { 
  tagline = ""
  title = "${sheetTitle}"
  composer = "${composer}"
} 
\\score {
${code}
\\layout { }
\\midi { \\tempo 4 = 90 }
}`
}

// make a lilypond score from tune bot code!!
function tune2lily(expression)
{
	// might wanna add a relative mode sometime
	var output = "<<\n";

	// start a staff
	output += "\\new Staff { ";
	var newStaffPending = false;

	// default values
	var unitValue = 16;
	var instrument = "acoustic piano";
	var tempo = "tempo 4 = 90";

	// title stuff
	var sheetTitle = "";
	var composer = "";

	// split the parts
	const parts = expression.split(":");
	for(var part of parts)
	{
		const p = part.trim();
		if(!p) continue;

		// make a new staff if requested
		if(newStaffPending) output += `}\n\\new Staff { \\set Staff.midiInstrument = #"${instrument}" \\${tempo} `;
		newStaffPending = false;

		if(p.toLowerCase() in config.programs)
		{
			const i = config.instrumentNames[config.programs[p.toLowerCase()]];
			output += `\\set Staff.midiInstrument = #"${i}" `;
			instrument = i;
		}
		else if(p.startsWith("by"))
		{
			const words = p.split(" ");
			composer = words.slice(1).join(" ");
		}
		else if(p.startsWith("title"))
		{
			const words = p.split(" ");
			sheetTitle = words.slice(1).join(" ");
		}
		else if(p.startsWith("key"))
		{
			const args = p.split(" ").filter((v) => {
				return v.length;
			});
			if(args.length > 1)
			{
				const key = args[1].replace(/\#/g, "is").replace(/\&/g, "es");
				output += `\\${args[0]} ${key} \\${args[2]} `;
			}
		}
		else if(p.startsWith("tempo"))
		{
			output += `\\${p} `;
			tempo = p;
		}
		else if(p.startsWith("time"))
		{
			output += `\\${p} `;
		}
		else if(p === "loud")
		{
			output += `\\set Staff.midiMinimumVolume = #0.7 `;
			output += `\\set Staff.midiMaximumVolume = #0.9 `;
		}
		else if(p === "quiet")
		{
			output += `\\set Staff.midiMinimumVolume = #0.1 `;
			output += `\\set Staff.midiMaximumVolume = #0.3 `;
		}
		else if(p === "half")
		{
			unitValue /= 2;
		}
		else if(p === "double")
		{
			unitValue *= 2;
		}
		else if(p in config.tempos)
		{
			const t = config.tempos[p];
			tempo = `tempo 4 = ${t}`;
			output += `\\${tempo} `;
		}
		else if(p in config.clefs)
		{
			output += `\\clef ${config.clefs[p]} `;
		}
		else if(p in config.values)
		{
			unitValue = config.values[p];
		}
		else
		{
			var noteBuffer = "";
			var lengthBuffer = 1;
			var octaveBuffer = 4;
			var last = {};
			last.chord = false;
			last.buffer = "";
			var chordBuffer = "";
			var inChord = false;
			var pendingChord = false;
			var dynamic = "";
			var suffix = "";

			// logarithmic floor
			function floorLog(n, e=2)
			{
				return Math.pow(e, Math.floor(Math.log(n) / Math.log(e)));
			}

			// convert tunebot length to lilypond length
			function convertLength(len, buffer)
			{
				// basic length value
				const baseValue = floorLog(len);
				var remainder = len % baseValue;
				var base = baseValue;
				var dots = 0;
				while(remainder && remainder >= base / 2)
				{
					base = floorLog(remainder);
					remainder %= base;
					dots++;
				}
				// whole number 
				var converted = unitValue / baseValue;
				if(converted == 0.5) converted = "\\breve";
				else if(converted == 0.25) converted = "\\longa";
				return converted.toString() + ".".repeat(dots) + (remainder ? ("~ " + buffer) + convertLength(remainder, buffer) : "");
			}

			// convert tunebot octave to lilypond octave
			function convertOctave(noteBuffer, octave)
			{
				if(noteBuffer.startsWith("r")) return "";
				const count = octave - 3;
				if(count > 0) return "'".repeat(count);
				else if(count < 0) return ",".repeat(-count);
				return "";
			}

			// add the note buffer to the lilypond output
			function flush()
			{
				if(pendingChord)
				{
					const appendage = `${chordBuffer}${convertLength(lengthBuffer, chordBuffer)}${suffix}`;
					last.chord = true;
					last.buffer = chordBuffer;
					output += appendage;
					pendingChord = false;
					if(dynamic) output += `\\${dynamic}`;
					output += " ";
					dynamic = "";
					suffix = "";
				}
				else if(noteBuffer)
				{
					const preAppendage = `${noteBuffer}${convertOctave(noteBuffer, octaveBuffer)}`;
					const appendage = `${preAppendage}${inChord ? "" : convertLength(lengthBuffer, preAppendage)}${suffix}`;
					if(!noteBuffer.startsWith("r"))
					{
						last.chord = false;
						last.buffer = noteBuffer;
					}
					noteBuffer = "";
					if(inChord)
					{
						chordBuffer += appendage;
						if(dynamic) chordBuffer += `\\${dynamic}`;
						chordBuffer += " ";
					}
					else
					{
						output += appendage;
						if(dynamic) output += `\\${dynamic}`;
						output += " ";
					}
					dynamic = "";
					suffix = "";
				}
			}

			// go through each input char
			for(var c of p)
			{
				if("abcdefg".indexOf(c.toLowerCase()) != -1)
				{
					flush();
					noteBuffer = c;
					lengthBuffer = 1;
				}
				else if(c == '~')
				{
					suffix += "~";
				}
				else if(c == '#')
				{
					noteBuffer += "is";
				}
				else if(c == '&')
				{
					noteBuffer += "es";
				}
				else if(c == ',')
				{
					flush();
					pendingChord = last.chord;
					if(last.chord) chordBuffer = last.buffer;
					else noteBuffer = last.buffer;
					lengthBuffer = 1;
				}
				else if(c == '{')
				{
					flush();
					output += "\\repeat unfold 2 { ";
				}
				else if(c == '}')
				{
					flush();
					output += "} ";
				}
				else if(c == '(')
				{
					flush();
					output += "\\tuplet 3/2 { ";
				}
				else if(c == ')')
				{
					flush();
					output += "} ";
				}
				else if(c == 'U')
				{
					flush();
					unitValue *= 2;
				}
				else if(c == 'u')
				{
					flush();
					unitValue /= 2;
				}
				else if(c == '[')
				{
					flush();
					chordBuffer = "<";
					inChord = true;
				}
				else if(c == ']')
				{
					flush();
					chordBuffer += ">";
					inChord = false;
					pendingChord = true;
					lengthBuffer = 1;
				}
				else if(c == '-')
				{
					if(!inChord) lengthBuffer++;
				}
				else if(c == 'r')
				{
					if(inChord) continue;
					if(!pendingChord && noteBuffer.startsWith("r")) lengthBuffer += 4;
					else
					{
						flush();
						noteBuffer = "r";
						lengthBuffer = 4;
					}
				}
				else if(c == '.')
				{
					if(inChord) continue;
					if(!pendingChord && noteBuffer.startsWith("r")) lengthBuffer++;
					else
					{
						flush();
						noteBuffer = "r";
						lengthBuffer = 1;
					}
				}
				else if(c == '|')
				{
					flush();
					output += "| ";
				}
				else if(c == 'z')
				{
					flush();
					suffix += "^\"pizz.\"";
				}
				else if(c == '^')
				{
					flush();
					suffix += "->";
				}
				else if(c == 'p')
				{
					flush();
					dynamic += "p";
				}
				else if(c == 'l')
				{
					flush();
					dynamic += "f";
				}
				else if(c == 'm')
				{
					flush();
					dynamic = "mp";
				}
				else if(c == '>')
				{
					flush();
					octaveBuffer++;
				}
				else if(c == '<')
				{
					flush();
					octaveBuffer--;
				}
				else if("0123456789".indexOf(c) != -1)
				{
					flush();
					octaveBuffer = c;
				}
			}
			// flush
			flush();

			// request new staff
			newStaffPending = true;
		}
	}

	// finish up
	output += "}\n>>";
	const lily = makeLilyPondScore(output, sheetTitle, composer);
	return lily;
}

// LEGACY CONFIG DATA
// store the configuration in this object
const config = {};

// the instrument names and their midi program numbers
config.programs = {
        "piano": 0,
        "bright": 1,
        "electric-grand": 2,
        "honky": 3,
        "electric": 4,
        "electric2": 5,
        "harpsi": 6,
        "clav": 7,
        "celesta": 8,
        "glocken": 9,
        "music-box": 10,
        "vibra": 11,
        "marimba": 12,
        "xylo": 13,
        "bells": 14,
        "dulcimer": 15,
        "drawbar": 16,
        "perc": 17,
        "perc-organ": 17,
        "rock": 18,
        "rock-organ": 18,
        "organ": 19,
        "church-organ": 19,
        "reed": 20,
        "reed-organ": 20,
        "accordian": 21,
        "harmonica": 22,
        "tango": 23,
        "tango-accordian": 23,
        "guitar": 24,
        "nylon-guitar": 24,
        "nylon": 24,
        "steel": 25,
        "steel-guitar": 25,
        "jazz": 26,
        "jazz-guitar": 26,
        "clean": 27,
        "clean-guitar": 27,
        "mute": 28,
        "mute-guitar": 28,
        "overdrive": 29,
        "overdrive-guitar": 29,
        "dist": 30,
        "dist-guitar": 30,
        "distortion": 30,
        "distortion-guitar": 30,
        "harmonics": 31,
        "acoustic": 32,
        "acoustic-bass": 32,
        "fingered": 33,
        "fingered-bass": 33,
        "bass": 33,
        "pick": 34,
        "pick-bass": 34,
        "fretless": 35,
        "fretless-bass": 35,
        "slap": 36,
        "slap-bass": 36,
        "slap2": 37,
        "slap-bass2": 37,
        "synth": 38,
        "synth-bass": 38,
        "synth2": 39,
        "synth-bass2": 39,
        "violin": 40,
        "viola": 41,
        "cello": 42,
        "contra": 43,
        "contrabass": 43,
        "tremolo": 44,
        "pizz": 45,
        "harp": 46,
        "timpani": 47,
        "strings": 48,
        "strings2": 49,
        "strings3": 50,
        "strings4": 51,
        "choir": 52,
        "aah": 52,
        "choir2": 53,
        "ooh": 53,
        "synth-voice": 54,
        "hit": 55,
        "orch-hit": 55,
        "orchestral-hit": 55,
        "trumpet": 56,
        "trombone": 57,
        "tuba": 58,
        "mute": 59,
        "mute-trumpet": 59,
        "french": 60,
        "french-horn": 60,
        "brass": 61,
        "brass2": 62,
        "brass3": 63,
        "sax": 64,
        "soprano": 64,
        "soprano-sax": 64,
        "alto": 65,
        "alto-sax": 65,
        "tenor": 66,
        "tenor-sax": 66,
        "baritone": 67,
        "baritone-sax": 67,
        "oboe": 68,
        "english": 69,
        "english-horn": 69,
        "horn": 69,
        "bassoon": 70,
        "clarinet": 71,
        "piccolo": 72,
        "flute": 73,
        "recorder": 74,
        "pan": 75,
        "bottle": 76,
        "shakuhachi": 77,
        "whistle": 78,
        "ocarina": 79,
        "square": 80,
        "saw": 81,
        "caliope": 82,
        "chiff": 83,
        "charang": 84,
        "voice": 85,
        "fifth": 86,
        "lead": 87,
        "bass-lead": 87,
        "new-age": 88,
        "pad": 89,
        "warm": 89,
        "poly": 90,
        "choir-pad": 91,
        "bowed": 92,
        "metal": 93,
        "halo": 94,
        "sweep": 95,
        "rain": 96,
        "soundtrack": 97,
        "crystal": 98,
        "atmosphere": 99,
        "brightness": 100,
        "goblins": 101,
        "echoes": 102,
        "scifi": 103,
        "sitar": 104,
        "banjo": 105,
        "shamisen": 106,
        "koto": 107,
        "kalimba": 108,
        "bagpipe": 109,
        "fiddle": 110,
        "shanai": 111,
        "tinkle": 112,
        "agogo": 113,
        "steel": 114,
        "steel-drum": 114,
        "wood": 115,
        "woodblock": 115,
        "taiko": 116,
        "tom": 117,
        "synth-drum": 118,
        "reverse": 119,
        "reverse-cymbal": 119,
        "fret": 120,
        "guitar-fret": 120,
        "breath": 121,
        "sea": 122,
        "shore": 122,
        "seashore": 122,
        "bird": 123,
        "tweet": 123,
        "telephone": 124,
        "phone": 124,
        "heli": 125,
        "helicopter": 125,
        "applause": 126,
        "gunshot": 127,
        "gun": 127,
};

// lilypond midi instrument names
config.instrumentNames = [
	"acoustic grand",
	"bright acoustic",
	"electric grand",
	"honkey-tonk",
	"electric piano 1",
	"electric piano 2",
	"harpsichord",
	"clav",
	"celesta",
	"glockenspiel",
	"music box",
	"vibraphone",
	"marimba",
	"xylophone",
	"tubular bells",
	"dulcimer",
	"drawbar organ",
	"percussive organ",
	"rock organ",
	"church organ",
	"reed organ",
	"accordion",
	"harmonica",
	"concertina",
	"acoustic guitar (nylon)",
	"acoustic guitar (steel)",
	"electric guitar (jazz)",
	"elecetric guitar (clean)",
	"electric guitar (muted)",
	"overdriven guitar",
	"distorted guitar",
	"guitar harmonics",
	"acoustic bass",
	"electric bass (finger)",
	"electric bass (pick)",
	"fretless bass",
	"slap bass 1",
	"slap bass 2",
	"synth bass 1",
	"synth bass 2",
	"violin",
	"viola",
	"cello",
	"contrabass",
	"tremolo strings",
	"pizzicato",
	"orchestral harp",
	"timpani",
	"string ensemble 1",
	"string ensemble 2",
	"synthstrings 1",
	"synthstrings 2",
	"choir aahs",
	"voice oohs",
	"synth voice",
	"orchestra hit",
	"trumpet",
	"trombone",
	"tuba",
	"muted trumpted",
	"french horn",
	"brass section",
	"synthbrass 1",
	"synthbrass 2",
	"soprano sax",
	"alto sax",
	"tenor sax",
	"baritone sax",
	"oboe",
	"english horn",
	"bassoon",
	"clarinet",
	"piccolo",
	"flute",
	"recorder",
	"pan flute",
	"blown bottle",
	"shakuhachi",
	"whistle",
	"ocarina",
	"lead 1 (square)",
	"lead 2 (sawtooth)",
	"lead 3 (calliope)",
	"lead 4 (chiff)",
	"lead 5 (charang)",
	"lead 6 (voice)",
	"lead 7 (fifths)",
	"lead 8 (bass+lead)",
	"pad 1 (new age)",
	"pad 2 (warm)",
	"pad 3 (polysynth)",
	"pad 4 (choir)",
	"pad 5 (bowed)",
	"pad 6 (metallic)",
	"pad 7 (halo)",
	"pad 8 (sweep)",
	"fx 1 (rain)",
	"fx 2 (soundtrack)",
	"fx 3 (crystal)",
	"fx 4 (atmosphere)",
	"fx 5 (brightness)",
	"fx 6 (goblins)",
	"fx 7 (echoes)",
	"fx 8 (sci-fi)",
	"sitar",
	"banjo",
	"shamisen",
	"koto",
	"kalimba",
	"bagpipe",
	"fiddle",
	"shanai",
	"tinkle bell",
	"agogo",
	"steel drums",
	"woodblock",
	"taiko drum",
	"melodic tom",
	"synth drum",
	"reverse cymbal",
	"guitar fret noise",
	"breath noise",
	"seashore",
	"bird tweet",
	"telephone ring",
	"helicopter",
	"applause",
	"gunshot",
];

// tempos the bot recognizes in musical expressions
// bpms
config.tempos = {
        "normal": 90,
        "fast": 120,
        "faster": 180,
        "fastest": 240,
        "slow": 60,
        "slower": 42,
        "slowest": 24,
};

// clefs that lilypond (and the bot) recognize
config.clefs = {
	"g-clef": "G",
	"g2-clef": "G2",
	"treble-clef": "treble",
	"violin-clef": "violin",
	"french-clef": "french",
	"g-gclef": "GG",
	"tenorg-clef": "tenorG",
	"soprano-clef": "soprano",
	"mezzosoprano-clef": "mezzosoprano",
	"c-clef": "C",
	"alto-clef": "alto",
	"tenor-clef": "tenor",
	"baritone-clef": "baritone",
	"varc-clef": "varC",
	"altovarc-clef": "altovarC",
	"tenorvarc-clef": "tenorvarC",
	"baritonevarc-clef": "baritonevarC",
	"varbaritone-clef": "varbaritone",
	"baritonevarc-clef": "baritonevarC",
	"f-clef": "F",
	"bass-clef": "bass",
	"subbass-clef": "subbass",
	"percussion-clef": "percussion",
};

// note values
config.values = {
	"whole": 1,
	"half": 2,
	"quarter": 4,
	"eighth": 8,
	"sixteenth": 16,
	"thirty-second": 32,
	"sixty-fourth": 64,
	"hundred-twenty-eighth": 128,
};

// export the translation function
module.exports = {
	tune2lily: tune2lily,
}
