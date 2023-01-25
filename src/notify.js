const { Notification } = require("electron");

// Helper function to create and immediately show a notification.
function showNotification(text) {
	new Notification({
		title: "ESO RP Profiles",
		body: text,
		icon: "./images/icon.png",
	}).show();
}

module.exports = showNotification;