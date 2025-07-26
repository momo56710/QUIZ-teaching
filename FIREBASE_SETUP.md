# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "quiz-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Google" provider
5. Enable it and configure:
   - Project support email (your email)
   - Project public-facing name
6. Click "Save"

## 3. Get Your Firebase Configuration

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "quiz-app-web")
6. Copy the configuration object

## 4. Update Firebase Configuration

Replace the placeholder values in `src/config/firebase.ts` with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## 5. Configure Authorized Domains

1. In Firebase Authentication, go to "Settings" tab
2. Under "Authorized domains", add your development domain:
   - For local development: `localhost`
   - For production: your actual domain

## 6. Test the Application

1. Run the development server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. After successful authentication, you'll be redirected to the home page

## Security Notes

- Never commit your Firebase API keys to version control
- Consider using environment variables for production
- Set up proper security rules in Firebase
- Configure authorized domains properly

## Troubleshooting

- If you get "popup_closed_by_user" error, make sure popups are enabled
- If authentication fails, check that Google provider is enabled in Firebase
- Make sure your domain is in the authorized domains list 