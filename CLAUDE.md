# Rules for this repo

## Hard rule: changes go to a feature branch

Never commit or push to `main` directly. For every change:

1. `git switch -c <type>/<short-name>` from an up-to-date `main` (e.g. `feat/lezen-les-40`, `fix/knm-audio`).
2. Commit there and push the branch.
3. Open a pull request into `main`.

## After changing a lesson

    python3 tools/bouw.py        # rebuild shared/woorden.js and the index.json files
    python3 tools/controleer.py  # check the lessons against the word list
