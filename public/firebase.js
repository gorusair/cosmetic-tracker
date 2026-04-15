(function () {
  const firebaseConfig = window.COSMETIC_TRACKER_FIREBASE_CONFIG;
  if (!firebaseConfig) {
    console.error("Firebase config is not loaded.");
    return;
  }

  const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

  window.firebaseServices = {
    app,
    auth: firebase.auth(app),
    db: firebase.firestore(app)
  };
})();
