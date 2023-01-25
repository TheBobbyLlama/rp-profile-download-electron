const fs = require("node:fs");
const path = require("path");
const { net } = require("electron");
const Jimp = require("jimp");
const dxt = require("silent-dxt-js");
const { constants } = require("node:buffer");

const showNotification = require("./notify");

const imagePath = path.normalize(path.join(__dirname, "/../images/thumbs/"));

console.log(imagePath);

const DDS_FILE_MAGIC = 0x20534444;
const DDS_HEADER_FLAGS = 0x81007; // DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT | DDSD_LINEARSIZE
const DDS_PIXELFORMAT_FLAGS_DXT1 = 0x04; // DDPF_FOURCC
const DDS_PIXELFORMAT_FLAGS_DXT5 = 0x05; // DDPF_ALPHAPIXELS | DDPF_FOURCC
const DDS_PIXELFORMAT_FOURCC_DXT1 = 0x31545844;
const DDS_PIXELFORMAT_FOURCC_DXT5 = 0x35545844;

// Generate DDS header: https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-header
function createDDSHeader(hasAlpha) {
	const blockSize = hasAlpha ? 16 : 8;

	const headerData = new Uint32Array([
		DDS_FILE_MAGIC,
		124, // size
		DDS_HEADER_FLAGS, // flags
		256, // height
		256, // width
		Math.max(1, (256 + 3) / 4) * blockSize, // pitch/linearsize
		0, // depth
		1, // mipmapcount
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // reserved
		32, // pixelformat - size
		hasAlpha ? DDS_PIXELFORMAT_FLAGS_DXT5 : DDS_PIXELFORMAT_FLAGS_DXT1, // pixelformat - flags
		hasAlpha ? DDS_PIXELFORMAT_FOURCC_DXT5 : DDS_PIXELFORMAT_FOURCC_DXT1, // pixelformat - fourcc
		0, // pixelformat - rgbbitcount
		0x00ff0000, // pixelformat - rbitmask
		0x0000ff00, // pixelformat - gbitmask
		0x000000ff, // pixelformat - bbitmask
		0xff000000, // pixelformat - abitmask
		0x1000, // caps - DDSCAPS_TEXTURE
		0, // caps2
		0, // caps3
		0, // caps4
		0, // reserved2
	]);

	// Convert header DWORDs into bytes.
	const view = new DataView(headerData.buffer);
	const output = new Uint8Array(headerData.length * 4);

	for (let i = 0; i < headerData.length; i++) {
		output[4 * i + 0] = view.getUint8(4 * i + 0);
		output[4 * i + 1] = view.getUint8(4 * i + 1);
		output[4 * i + 2] = view.getUint8(4 * i + 2);
		output[4 * i + 3] = view.getUint8(4 * i + 3);
	}

	return output;
}

// Convert a single image file.
function doImageFile(charName, imageInfo) {
	return new Promise(resolve => {
		try {
			const currentPath = imagePath + charName;

			// Check what we already have.
			if(fs.existsSync(currentPath)) {
				let foundFile = false;

				const imageDirectory = fs.opendirSync(imagePath + charName);

				let curFile = imageDirectory.readSync();

				while (curFile) {
					if (curFile.name === imageInfo.hash + ".dds") {
						foundFile = true;
					} else {
						fs.rmSync(imageDirectory.path + "/" + curFile.name); // Any files which don't match the hash are invalid.
					}

					curFile = imageDirectory.readSync();
				}

				imageDirectory.close();

				// Already have the correct file, we can bail out.
				if (foundFile) {
					resolve();
					return;
				}
			} else { // Make character's directory if they don't have one.
				fs.mkdirSync(currentPath, { recursive: true });
			}

			Jimp.read(imageInfo.url).then((image) => {
				// Force alpha channel if image is not square, before resizing.
				if (image.getHeight() != image.getWidth()) {
					image.rgba(true);
				}

				image.contain(256, 256);

				const headerData = createDDSHeader(image.hasAlpha());
				const textureData = dxt.compress(Uint8Array.from(image.bitmap.data), image.bitmap.width, image.bitmap.height, image.hasAlpha() ? dxt.flags.DXT5 : dxt.flags.DXT1);
				const fileData = new Uint8Array(headerData.length + textureData.length);
				fileData.set(headerData);
				fileData.set(textureData, headerData.length);

				fs.writeFileSync(currentPath + "/" + imageInfo.hash + ".dds", fileData, { flag: "w" });

				resolve();
			}).catch(error => {
				resolve();
			});
		} catch { // Safety valve
			resolve();
		}
	});
}

function processProfileImages(imageData) {
	try {
		if(!fs.existsSync(imagePath)) {
			fs.mkdirSync(imagePath, { recursive: true });
		}
	} catch {
		showNotification("ERROR: Unable to write to image directory!");
		return new Promise(res => res());
	}

	return Promise.allSettled(
		Object.entries(imageData).map(([name, info]) => doImageFile(name, info))
	);
}

module.exports = processProfileImages;