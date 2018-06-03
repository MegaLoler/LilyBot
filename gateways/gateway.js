/* abstract gateway interface to users
 * wraps up details about a channel directly to a user
 */

class Attachment {
	constructor(filename, data) {
		this.name = filename;
		this.data = data;
	}
}

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
	stop() {}

	// events coming from the gateway
	onMessage(message, attachments=[]) {}
}

module.exports = {
	Attachment: Attachment,
	Gateway: Gateway,
};
