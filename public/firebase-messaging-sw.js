importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const config = {
  apiKey: "AIzaSyB7WR68mAOWvF0qXC2hwwQ1FZUgRj8k79E",
  projectId: "gen-lang-client-0267663159",
  appId: "1:852515019719:web:9f85b4fbfa0a678e1b57e2",
  messagingSenderId: "852515019719",
  authDomain: "gen-lang-client-0267663159.firebaseapp.com",
  storageBucket: "gen-lang-client-0267663159.firebasestorage.app",
};

firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'Meu OVO';
  const options = {
    body: payload.notification?.body || '',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    vibrate: [200, 100, 200],
  };
  self.registration.showNotification(title, options);
});
