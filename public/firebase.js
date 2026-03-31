(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAjphx1kSRf8lmibWlAkdD3ezKoec076MM",
    authDomain: "cosmetic-tracker-cea64.firebaseapp.com",
    projectId: "cosmetic-tracker-cea64",
    storageBucket: "cosmetic-tracker-cea64.appspot.com",
    messagingSenderId: "28075030105",
    appId: "1:28075030105:web:8a498f39d0ee8b242f6348",
    measurementId: "G-39BWQ0QVMH"
  };

  const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

  window.firebaseServices = {
    app,
    auth: firebase.auth(app),
    db: firebase.firestore(app)
  };
})();
