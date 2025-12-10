importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js");

firebase.initializeApp({
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    messagingSenderId: "...",
    appId: "..."
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icons/icon-192.png"
    });
});
