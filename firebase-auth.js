/* Firebase authentication boundary. Real Firebase Sign-In is intentionally disabled until project configuration is supplied. */
window.TBSFirebaseAuth = { configured:false, signInGoogle(){ throw new Error('Firebase configuration is required before Google Login can be enabled.'); }, signOut(){ return Promise.resolve(); } };
