/*
  Copy this file to `js/config.js` (which must be gitignored) and fill in your Firebase values.
  Example creates a global `window.__APP_CONFIG__` object read by client code.

  IMPORTANT: Do NOT commit `js/config.js` to source control. Add it to .gitignore.
*/

window.__APP_CONFIG__ = {
  firebaseConfig: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
  }
};
