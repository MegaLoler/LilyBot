/* abstract gateway interface to users
 * wraps up details about a channel directly to a user
 */

class Gateway {
	constructor(platform, nick, id, cacheId=id) {
		this.platform = platform;
		this.nick = nick;
		this.id = id;
		this.cacheId = `${platform}-${cacheId}`;
	}

	// interact with the gateway
	send(message, attachments=[]) {}
	play(audio) {}

	// events coming from the gateway
	onMessage(message, attachments=[]) {}
}

module.exports = Gateway;
