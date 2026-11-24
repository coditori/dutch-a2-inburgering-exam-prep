# Login with Google (optional)

Without a config file the site works as always: progress stays in the browser and nobody can log in.
With a config file, the profile page (`profiel.html`) shows "Log in met Google". A learner who logs in gets:

- the same progress on every phone and computer (lessons, practice-exam results, word cards, the profile name);
- a profile link that always shows the newest card (`profiel.html#u=…`) instead of a snapshot.

Logging in stays optional. Visitors who do not log in never load anything from Google.

## What is saved, and where

| Firestore document | Content | Who can read it |
| --- | --- | --- |
| `gebruikers/{uid}` | the progress: `lezen`, `luisteren`, `schrijven`, `spreken`, `knm`, the word cards and the profile name | only that learner |
| `profielen/{uid}` | the profile card: name, lessons passed, best marks, words known | anyone who has the link |

Not saved to the account: settings, half-finished lessons and exams, and the learner's own details for the writing form (name, address).

Browser and account are merged, so nobody loses work: per lesson the best result, all exam attempts from both sides, per word card the highest box.
"Wis alle voortgang" in the settings also clears the account. On the profile page a learner can delete everything from the account.

## Set-up

1. Create a Firebase project. Turn on **Authentication → Google**. Add the address of the site (and `127.0.0.1` for local use) under **Authentication → Settings → Authorized domains**.
2. Create a **Firestore Database** (production mode, region `europe-west4`) and paste these rules:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /gebruikers/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /profielen/{uid} {
         allow get: if true;
         allow write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

3. Register a web app in the project settings and copy the `firebaseConfig` values into `shared/config.json`, in the shape of `shared/config.voorbeeld.json`.

`shared/config.json` is in `.gitignore`, so it never lands in the repository.

## The config and the published site

The browser needs the config to talk to Firebase, so every visitor of the published site can read it. That is how Firebase is designed: the config identifies the project, it is not a password. What protects the data is the rules above and the list of authorized domains.

Keeping the file out of git is still possible, but then the published site needs it from somewhere else. GitHub Pages "deploy from a branch" only serves what is in the branch. The alternative is to publish with a GitHub Actions workflow that writes `shared/config.json` from a repository variable just before the upload. That means switching **Settings → Pages → Source** to "GitHub Actions".

## Trying the screens without Firebase

Put this in `shared/config.json`:

```json
{ "demo": true }
```

"Log in met Google" then logs in a fake account ("Sara Demo") that lives in this browser only. Everything else (merging, saving, the live profile link, logging out, deleting) runs the real code.

## Status

The screens and the merge logic are tested with the demo account. The Firebase part of `shared/account.js` (`firebaseWolk`) has not run against a real project yet.
