importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 初始化 Firebase (使用金田的設定)
firebase.initializeApp({
  apiKey: "AIzaSyCHt7PNXd5NNh8AsdSMDzNfbvhyEsBG2YY",
  authDomain: "gold-land-auto.firebaseapp.com",
  projectId: "gold-land-auto",
  storageBucket: "gold-land-auto.firebasestorage.app",
  messagingSenderId: "817229766566",
  appId: "1:817229766566:web:73314925fe0a4d43917967"
});

const messaging = firebase.messaging();

// 監聽背景訊息並彈出系統通知
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 收到背景通知: ', payload);
  
  const notificationTitle = payload.notification?.title || '金田 DMS 系統通知';
  const notificationOptions = {
    body: payload.notification?.body || '您有一條新訊息',
    icon: '/GL_APPLOGO.png',
    badge: '/GL_APPLOGO.png', // iOS 狀態列的小圖示
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
