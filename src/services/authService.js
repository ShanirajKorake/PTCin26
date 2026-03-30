// src/services/authService.js (ADD this function)

import { auth } from '../firebaseConfig';
import { 
    GoogleAuthProvider,     // 1. Needed to define the provider
    signInWithPopup,        // 2. Needed to open the login window
    signOut                 // (You can reuse your signOut function)
} from "firebase/auth";

// Create an instance of the Google provider
const googleProvider = new GoogleAuthProvider();

/**
 * Initiates the Google Sign-In flow using a popup window.
 * @returns {Promise<User>} The authenticated user object.
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        
        // The authenticated user info
        const user = result.user;
        
        console.log("User successfully signed in with Google:", user.uid);
        
        return user;
        
    } catch (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        
        console.error("Google Sign-In failed:", errorCode, errorMessage);
        
        // A common error is 'auth/popup-closed-by-user'
        if (errorCode === 'auth/popup-closed-by-user') {
            alert("Sign-in process cancelled.");
        }
        throw error;
    }
}

// Reuse your existing logout function
export async function logoutUser() {
    await signOut(auth);
    console.log("User logged out.");
}