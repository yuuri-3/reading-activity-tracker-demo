/// <reference types="vite/client" />

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

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
let cachedFunctions: Functions | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;
let cachedAppCheck: AppCheck | null = null;

function getEnvConfig(): FirebaseConfig {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      "Firebase設定が不足しています。VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_APP_ID を設定してください。",
    );
  }

  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(measurementId ? { measurementId } : {}),
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = initializeApp(getEnvConfig());
    if (!cachedAppCheck) {
      const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
      if (appCheckSiteKey) {
        cachedAppCheck = initializeAppCheck(cachedApp, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      }
    }
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

export function getFirebaseFunctions(): Functions {
  if (!cachedFunctions) {
    cachedFunctions = getFunctions(getFirebaseApp(), "asia-northeast1");
  }
  return cachedFunctions;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
  }
  return cachedGoogleProvider;
}
