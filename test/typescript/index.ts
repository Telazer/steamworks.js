import * as steamworks from "@telazer/steamworks.js";

export default function main() {
	const client = steamworks.init(480);
	console.log(client.localplayer.getName())
}
