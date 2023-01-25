const { app, shell, Menu, Tray } = require("electron");
const findProcess = require('find-process');

const { loadConfig, saveConfig } = require("./src/config");
const showNotification = require("./src/notify");
const { downloadCharacterData, isUpdateRunning } = require("./src/update");

const statusName = "ESO RP Profile Downloader";
const UPDATE_INTERVAL = 10000;
const KILL_TIMER = 10000;

let config = {};
let statusIcon = null;
let statusContext = null;
let gameRunning = false;
let lastUpdate = 0;
let updateTimer = null;

// Main function - set up status icon and functionality.
app.whenReady().then(() => {
	config = loadConfig();

	statusIcon = new Tray ("./images/icon-small.png");
	statusIcon.setToolTip(statusName);

	statusContext = Menu.buildFromTemplate([
		{
			label: "ESO Rollplay Site",
			click: launchRollplaySite
		},
		{
			id: "updateNow",
			label: "Update Profiles Now",
			click: doUpdate
		},
		{
			id: "updateOptions",
			label: "Update Options",
			type: "submenu",
			submenu: [
				{
					label: "No",
					type: "radio",
					checked: config.updateMode === "No",
					click: () => { setUpdateMode("No"); }
				},
				{
					label: "Manual Only",
					type: "radio",
					checked: config.updateMode === "Manual",
					click: () => { setUpdateMode("Manual"); }
				},
				{
					label: "Automatic",
					type: "radio",
					checked: ((config.updateMode !== "No") && (config.updateMode !== "Manual")), // Default
					click: () => { setUpdateMode("Automatic"); }
				},
			]
		},
		{
			label: "Exit",
			click: closeApplication
		},
	]);

	statusIcon.setContextMenu(statusContext);

	initializeUpdateState();
});

// Determine when and how to fire updates.
async function initializeUpdateState() {
	if (updateTimer) {
		clearInterval(updateTimer);
		updateTimer = null;
	}

	switch (config.updateMode) {
		case "No":
			doUpdate();
			updateTimer = setInterval(closeApplication, KILL_TIMER);
			break;
		case "Manual":
			doUpdate();
			break;
		default: // Automatic
			gameRunning = await isGameRunning();
			doUpdate();
			updateTimer = setInterval(checkAutoUpdate, UPDATE_INTERVAL);
			break;
	}
}

// Check for ESO game client process.
async function isGameRunning() {
	const result = await findProcess("name", /\Weso(64)\W?/i);

	return (result && !!result.length);
}

// For Automatic mode, decide if an update is needed.
async function checkAutoUpdate() {
	const isRunning = await isGameRunning();

	if ((!gameRunning) && (isRunning)) {
		gameRunning = true;
		doUpdate();
	}

	gameRunning = isRunning;
}

// Enable/disable update context menu items.
function disableUpdates(disabled) {
	if (statusContext) {
		statusContext.getMenuItemById("updateNow").enabled = !disabled;
	}

	statusIcon.setToolTip(disabled ? statusName + " - Running" : statusName);
}

// Update character profile data.
function doUpdate() {
	const now = Date.now();

	// Don't do update if the manager is busy or last update was too recently.
	if ((!isUpdateRunning()) && (now - lastUpdate > UPDATE_INTERVAL)) {
		lastUpdate = now;
		showNotification("Downloading character profiles...");
		
		disableUpdates(true);

		downloadCharacterData().then(() => {
			disableUpdates(false);
		});
	}
}

// Launch Rollplay website from context menu.
function launchRollplaySite() {
	shell.openExternal("https://eso-rollplay.net");
}

// Change update mode from context menu.
function setUpdateMode(mode) {
	if (mode !== config.updateMode) {
		config.updateMode = mode;
		initializeUpdateState();
	}
}

// Close the application if it's not busy, otherwise try again in 1 second.
function closeApplication() {
	clearInterval(updateTimer);
	statusIcon.setContextMenu(null);

	if (isUpdateRunning()) {
		setTimeout(closeApplication, 1000);
	} else {
		saveConfig(config);
		app.quit();
	}
}