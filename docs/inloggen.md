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

The menu names are those of the Firebase console in November 2026. Google moves them now and then; the search box at the top of the console finds each page by name.

1. Create a Firebase project. Open **Security → Authentication**, and turn on **Google** on the **Sign-in method** tab. Add the address of the site (and `127.0.0.1` for local use) under **Security → Authentication → Settings → Authorized domains**.
2. Open **Databases & Storage → Firestore** and create a database (production mode, region `europe-west4`). Paste these rules on the **Rules** tab:

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

3. Register a web app in the project settings (the gear icon) and copy the `firebaseConfig` values into `shared/config.json`, in the shape of `shared/config.voorbeeld.json`.

`shared/config.json` is in `.gitignore`, so it never lands in the repository.

## The config and the published site

The browser needs the config to talk to Firebase, so every visitor of the published site can read it. That is how Firebase is designed: the config identifies the project, it is not a password. What protects the data is the rules above and the list of authorized domains.

The file is not in git. The published site gets it from the workflow `.github/workflows/site.yml`: on every change to `main` it writes `shared/config.json` from the repository secret `SITE_CONFIG` and then publishes the site. For this, **Settings → Pages → Source** is set to "GitHub Actions".

To change the config of the published site, replace the secret (`gh secret set SITE_CONFIG < shared/config.json`) and run the workflow "Site" again. Without the secret the site is published with login off.

## Trying the screens without Firebase

Put this in `shared/config.json`:

```json
{ "demo": true }
```

"Log in met Google" then logs in a fake account ("Sara Demo") that lives in this browser only. Everything else (merging, saving, the live profile link, logging out, deleting) runs the real code.

## Status

The screens and the merge logic are tested with the demo account. The Firebase part of `shared/account.js` (`firebaseWolk`) has not run against a real project yet.
