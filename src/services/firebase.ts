import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBVoL0p8Fnkjh3E5i1-9Yv0CHv3J7bymdY",
  authDomain: "achivsecurities-65426.firebaseapp.com",
  projectId: "achivsecurities-65426",
  storageBucket: "achivsecurities-65426.firebasestorage.app",
  messagingSenderId: "547793921506",
  appId: "1:547793921506:web:7940b5cb7cb5025c7f05bb",
  measurementId: "G-XT6CS5YR63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
