const fs = require("node:fs");

const outputPath = "./RPProfileData.lua";

const alignmentMap = {
	ALIGNMENT_LG: "Lawful Good",
	ALIGNMENT_NG: "Neutral Good",
	ALIGNMENT_CG: "Chaotic Good",
	ALIGNMENT_LN: "Lawful Neutral",
	ALIGNMENT_N: "Neutral",
	ALIGNMENT_CN: "Chaotic Neutral",
	ALIGNMENT_LE: "Lawful Evil",
	ALIGNMENT_NE: "Neutral Evil",
	ALIGNEMNT_CE: "Chaotic Evil",
}

const birthsignMap = {
	BIRTHSIGN_APPRENTICE: "The Apprentice",
	BIRTHSIGN_ATRONACH: "The Atronach",
	BIRTHSIGN_LADY: "The Lady",
	BIRTHSIGN_LORD: "The Lord",
	BIRTHSIGN_LOVER: "The Lover",
	BIRTHSIGN_MAGE: "The Mage",
	BIRTHSIGN_RITUAL: "The Ritual",
	BIRTHSIGN_SERPENT: "The Serpent",
	BIRTHSIGN_SHADOW: "The Shadow",
	BIRTHSIGN_STEED: "The Steed",
	BIRTHSIGN_THIEF: "The Thief",
	BIRTHSIGN_TOWER: "The Tower",
}

// From https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function hashCode(str) {
	return str.split('').reduce((prevHash, currVal) =>
		(((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
}

// Special formatting to capitalize header text.
function formatHeaderText(match, p1, p2) {
	return p2.toUpperCase().replace(/\\N/g, "\\n");
}

// Reformat JSON text to LUA style.
function formatText(text) {
	text = text.replace(/\\/g, "\\\\"); // Backslashes
	text = text.replace(/\\\|/g, "|"); // Pipes
	text = text.replace(/(<br *\/?>|\n)/g, "\\n"); // New lines
	text = text.replace(/\"/g, "\\\""); // Quotes
	text = text.replace(/&lt;/g, "<");
	text = text.replace(/&gt;/g, ">");

	// Markdown formatting
	text = text.replace(/(^|\\n)#{1,5} ?(.+?\\n)/g, formatHeaderText);
	text = text.replace(/{(.+?)}/g, "$1"); // Custom formatting - {Name} for profile link.
	text = text.replace(/!(\[.*?\])\(.+?\)/g, (match, p1) => p1.length > 2 ? p1 : ""); // Images
	text = text.replace(/\[(.+?)\]\(.+?\)/g, "$1"); // Links
	text = text.replace(/\*\*(.+?)\*\*/g, "*$1*"); // Bold (convert to single asterisk)
	text = text.replace(/~~(.+?)~~/g, "-$1-"); // Strikethrough

	return text;
}

// Generate a new LUA file using character profile data.
function createLuaOutput(data) {
	const outputData = {};
	const imageData = {};

	// For each character...
	Object.entries(data).forEach(([charName, charData]) => {
		// For each field within that character...
		Object.entries(charData).forEach(([dataName, dataValue]) => {
			let result;

			// Convert data
			switch (dataName) {
				case "alignment":
					result = alignmentMap[dataValue];
					break;
				case "birthsign":
					result = birthsignMap[dataValue];
					break;
				case "image":
					result = Math.abs(hashCode(dataValue));
					imageData[charName] = {
						url: dataValue,
						hash: result,
					};
					break;
				default:
					result = formatText(dataValue);
					break;
			}

			// Append result
			if (result) {
				if (!outputData[charName]) {
					outputData[charName] = {};
				}

				outputData[charName][dataName] = result;
			}
		});
	});

	writeOutputFile(outputData);

	return imageData;
}

// Transcribe character data to the LUA output file.
function writeOutputFile(outputData) {
	const outStream = fs.createWriteStream(outputPath);
	outStream.write("function RPProfileViewer: LoadProfileData()\n\tself.ProfileData = {\n");

	Object.entries(outputData).forEach(([charName, charData]) => {
		outStream.write("\t\t[\"" + charName + "\"] = {\n");

		Object.keys(charData).forEach((key) => {
			outStream.write("\t\t\t[\"" + key + "\"] = \"" + charData[key] + "\",\n");
		});

		outStream.write("\t\t},\n");
	});

	outStream.write("\t}\nend");
	outStream.close();
}

module.exports = createLuaOutput;