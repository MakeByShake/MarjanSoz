"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Веб-конфиг Firebase не секретный: он всё равно виден в браузере.
// Данные защищают правила в firestore.rules.
const firebaseConfig = {
  apiKey: "AIzaSyC3n8GR6HBFRgSHr6IH3IJ2m9teCRx0Lxg",
  authDomain: "marjansoz.firebaseapp.com",
  projectId: "marjansoz",
  storageBucket: "marjansoz.firebasestorage.app",
  messagingSenderId: "703713789079",
  appId: "1:703713789079:web:ca6b6d7f072bf1fea115d2",
};

// Ленивая инициализация: модули импортируются и при серверном рендере, а Firebase нужен только в браузере
const app = () => (getApps().length ? getApp() : initializeApp(firebaseConfig));
export const auth = () => getAuth(app());
export const db = () => getFirestore(app());
