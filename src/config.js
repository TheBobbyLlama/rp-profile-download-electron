const fs = require("node:fs");
const path = require("path");
const { app, dialog } = require("electron");
const createDesktopShortcut = require("create-desktop-shortcuts");

const showNotification = require("./notify");

const myPath = app.getPath("exe");
const configPath = app.getPath("userData") + "/config.json";
const shortcutName = "RP Profile Viewer Downloader";
const shortcutComment = "Downloader program for the ESO addon RP Profile Viewer.  You can close it or otherwise interact with it by right-clicking its icon in the status area.";

// Load configuration.  If it doesn't exist, perform first time setup.
const loadConfig = () => {
	try {
		if(fs.existsSync(configPath)) {
			const data = fs.readFileSync(configPath);
			if (data) {
				return JSON.parse(data);
			}
		} else {
			dialog.showMessageBox({
				title: "First Time Setup",
				message: "Thank you for downloading the RP Profile Viewer addon!  This downloader program will need to be used to keep player profile information up to date.\n\nWould you like to place a shortcut on your desktop?",
				buttons: [ "Yes", "No" ],
				icon: path.join(__dirname, "/images/icon.png"),
			}).then((result) => {
				if (result.response === 0) {
					if (!createDesktopShortcut({
						windows: {
							name: shortcutName,
							comment: shortcutComment,
							filePath: myPath,
							// icon: myPath,
						},
						linux: {
							name: shortcutName,
							comment: shortcutComment,
							filePath: myPath,
							// icon: "./images/icon.png",
						},
						osx: {
							name: shortcutName,
							comment: shortcutComment,
							filePath: myPath,
							// icon: "./images/icon.png",
						}
					})) {
						showNotification("ERROR: Failed to create desktop shortcut!");
					}
				}
			});
		}
	} catch { }

	const newConfig = {
		updateMode: "Automatic"
	};

	saveConfig(newConfig);

	return newConfig;
};

// Save configuration.
const saveConfig = (data) => {
	fs.writeFileSync(configPath, JSON.stringify(data));
}

module.exports = { loadConfig, saveConfig };