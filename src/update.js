const { net } = require("electron");
const createLuaOutput = require("./luaOutput");
const processProfileImages = require("./imageConversion");

const dataUrl = "https://eso-roleplay.firebaseio.com/profiles.json";

let busy = false;

function isUpdateRunning() { return busy; }

// Pull down character data from Firebase and convert it to the desired formats.
function downloadCharacterData() {
	return new Promise(resolve => {
		busy = true;
		
		try {
			const request = net.request(dataUrl);

			request.on("response", response => {
				const bufferList = [];

				// Data comes in chunks, need to squish them together.
				response.on("data", data => {
					bufferList.push(data);
				});

				// Once we have all data, we are free to act.
				response.on("end", () => {
					const imageData = createLuaOutput(JSON.parse(Buffer.concat(bufferList)));

					if (imageData) {
						processProfileImages(imageData).then(() => {
							busy = false;
							resolve();
						});
					} else {
						busy = false;
						resolve();
					}
				})
			});

			request.end();
		} catch { // Safety valve.
			busy = false;
			resolve();
		}
	});
}

module.exports = { downloadCharacterData, isUpdateRunning };