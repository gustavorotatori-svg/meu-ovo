import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  projectId: "gen-lang-client-0267663159",
  appId: "1:852515019719:web:9f85b4fbfa0a678e1b57e2",
  apiKey: "AIzaSyB7WR68mAOWvF0qXC2hwwQ1FZUgRj8k79E",
  authDomain: "gen-lang-client-0267663159.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b",
  storageBucket: "gen-lang-client-0267663159.firebasestorage.app",
  messagingSenderId: "852515019719",
  measurementId: ""
};

export const app = initializeApp(firebaseConfig);
