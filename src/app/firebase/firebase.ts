/// <reference types="vite/client" />

import { initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

function getEnvConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  ) {
    throw new Error(
      "Firebase設定が不足しています。VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_APP_ID を設定してください。"
    );
  }

  return config;
}

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = initializeApp(getEnvConfig());
  }
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
  }
  return cachedAuth;
}

export function getFirestoreDb(): Firestore {
  if (!cachedDb) {
    // DB一本化（IndexedDB 永続キャッシュは使わない）
    // 以前のローカルキャッシュに残ったデータがFirestore上に無いのに
    // 表示されるケースを避ける。
    cachedDb = getFirestore(getFirebaseApp());
  }
  return cachedDb;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
  }
  return cachedGoogleProvider;
}
