# EcoScan User Profile & Auth System — Technical Specification

This document outlines the architecture for a complete user account system using Firebase Authentication and Firestore, including OTP verification.

---

## 0. General Architecture

The user data is managed across two layers:

1.  **Firebase Auth**: Handles core authentication.
    *   Email & password sign-in.
    *   Email verification flows.
    *   Optional phone authentication (SMS).

2.  **Firestore `users` Collection**: Stores detailed user profile data.
    *   `username`, `country`, `phone`
    *   Syncs `email`, `emailVerified`, `phoneVerified` status with Firebase Auth.
    *   Contains application-specific data like `totalPoints`.

A third collection handles one-time password (OTP) verification:

3.  **Firestore `verificationCodes` Collection**:
    *   Manages 6-digit codes for phone or email verification.
    *   Codes are stored hashed and are automatically deleted via TTL.

**Crucially, passwords are NEVER stored in Firestore.**

---

## 1. Firestore Schema

### 1.1. `users/{uid}` Document

-   **Collection**: `users`
-   **Document ID**: `uid` (Matches the user's Firebase Auth UID)

```typescript
interface UserProfile {
  uid: string;
  username: string;          // Must be unique
  email: string;
  emailVerified: boolean;
  phone?: string;            // E.164 format: +90...
  phoneVerified: boolean;
  country: string;           // ISO-2 code: "TR", "KW", etc.
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;

  // EcoScan-specific fields
  totalPoints: number;
  isDisabled: boolean;
  roles: string[];           // e.g., ["user"], with potential for ["admin"]
}
```

### 1.2. `verificationCodes/{codeId}` Document

-   **Collection**: `verificationCodes` (globally, not a subcollection)
-   **Document ID**: Auto-generated

```typescript
interface VerificationCodeDoc {
  target: string;           // The phone number or email address
  type: "phone" | "email" | "passwordReset";
  codeHash: string;         // SHA-256 hash of the 6-digit code
  expiresAt: FirebaseFirestore.Timestamp; // TTL for automatic deletion
  createdAt: FirebaseFirestore.Timestamp;
  consumed: boolean;        // Flag to prevent reuse
}
```

---

## 2. User Registration Flow (Client-Side)

This flow combines Firebase Auth user creation with Firestore profile creation.

```typescript
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

async function signUp(email: string, password: string, username: string, country: string) {
  // 1. Create user in Firebase Auth
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCred.user;

  // 2. (Optional) Set display name in Auth
  await updateProfile(user, { displayName: username });

  // 3. Trigger email verification
  await sendEmailVerification(user);

  // 4. Create the user's profile document in Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    username,
    email,
    emailVerified: user.emailVerified ?? false,
    phone: null,
    phoneVerified: false,
    country,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    totalPoints: 0,
    isDisabled: false,
    roles: ["user"],
  });
}
```

---

## 3. Backend Logic (Cloud Functions for Firebase)

These HTTP-triggered functions handle logic that requires admin privileges, like ensuring username uniqueness.

### 3.1. Username Uniqueness Validator

A server-side endpoint is required to check if a username is taken before creating a profile, preventing race conditions.

```typescript
// Cloud Function (v2) to create a user profile atomically
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const createUserProfile = onRequest(async (req, res) => {
  // ... (Implementation from section 3.1 of the prompt)
  // 1. Validate input (uid, username, country).
  // 2. Get user email from Firebase Auth using admin SDK.
  // 3. Query 'users' collection to check if username is already taken.
  // 4. If unique, create the document inside a Firestore transaction.
  // ...
});
```

### 3.2. Profile Update Endpoint

A secure endpoint for updating user-modifiable fields.

```typescript
// Cloud Function (v2) to update a user profile
export const updateUserProfile = onRequest(async (req, res) => {
  // ... (Implementation from section 3.2 of the prompt)
  // 1. Validate input (uid, country, phone).
  // 2. If phone number is updated, reset 'phoneVerified' to false.
  // 3. Update the document with a new 'updatedAt' timestamp.
  // ...
});
```

---

## 4. OTP Verification System

This system generates, sends, and verifies 6-digit codes.

### 4.1. Code Generation and Hashing

-   A helper function generates a random 6-digit numeric string.
-   A second helper hashes the code using `crypto.createHash("sha256")` before storing it.

### 4.2. Request Code Endpoint

An HTTP endpoint that:
1.  Generates a 6-digit code.
2.  Hashes it.
3.  Saves the hash, target (email/phone), type, and a 5-minute expiration timestamp to the `verificationCodes` collection.
4.  **TODO**: Integrates with an SMS/email provider (e.g., Twilio, SendGrid) to send the plain-text code to the user.

### 4.3. Verify Code Endpoint

An HTTP endpoint that:
1.  Receives the `target`, `type`, `code`, and `uid`.
2.  Hashes the received code.
3.  Queries the `verificationCodes` collection for a document that matches the hash, target, type, is not expired, and has not been consumed.
4.  If a valid code is found, it runs a transaction to:
    a. Mark the code document as `consumed: true`.
    b. Update the corresponding user's profile in the `users` collection (e.g., `phoneVerified: true`).

---

## 5. Firestore Security Rules

The rules enforce the ownership model and protect sensitive fields.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, create: if isOwner(userId);

      // Allow updates only if critical fields are not being changed by the user.
      allow update: if isOwner(userId) &&
        request.resource.data.isDisabled == resource.data.isDisabled &&
        request.resource.data.roles == resource.data.roles &&
        request.resource.data.totalPoints == resource.data.totalPoints;
    }
  }
}
```

---

## 6. Password Management

All password-related operations are handled exclusively by the Firebase Auth SDK client-side methods. No password data is ever stored or processed in Firestore or Cloud Functions.
-   **Sign-up:** `createUserWithEmailAndPassword`
-   **Sign-in:** `signInWithEmailAndPassword`
-   **Reset:** `sendPasswordResetEmail`

This architecture provides a secure, scalable, and complete foundation for user management in the EcoScan app.
