/* temporary entry point
 * interface with the bot from the command line
 * for testing and stuff
 */

const cli = new (require('./gateways/cli'))();
const shell = require('./shell');

cli.onMessage = function(message, attachments=[]) {
	shell(message, attachments, cli);
}

cli.engage();
