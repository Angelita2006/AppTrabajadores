// Scripts de Firebase para el Service Worker
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

// Inicializar Firebase en el Service Worker con tus credenciales públicas
firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
});

const messaging = firebase.messaging();

// Manejo de notificaciones en segundo plano en la Web
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ",
    payload,
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico", // Ruta al ícono de tu app web
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
