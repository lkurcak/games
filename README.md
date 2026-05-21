# Browser Games

Static browser game hub deployed with GitHub Pages.

The launcher reads `games.json` and links to built game artifacts under `play/<slug>/`.

## Repository Layout

```text
.
+-- index.html
+-- app.js
+-- styles.css
+-- games.json
+-- play/
|   +-- <game-slug>/
|       +-- index.html
|       +-- assets/...
+-- .github/workflows/deploy-pages.yml
```

`play/` is created by publishing workflows when games are deployed.

## Add A Game To The Launcher

Add an entry to `games.json`:

```json
{
  "games": [
    {
      "slug": "my-first-game",
      "title": "My First Game",
      "description": "A short description shown on the launcher.",
      "url": "play/my-first-game/",
      "cover": "play/my-first-game/cover.png"
    }
  ]
}
```

Required fields are `slug` and `title`. If `url` is omitted, the launcher uses `play/<slug>/`.

## Enable GitHub Pages

In this repository:

1. Open Settings > Pages.
2. Set Source to GitHub Actions.
3. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

## GitHub App Publisher Setup

Use a GitHub App when another repository needs to publish its built game into this repository.

Create a GitHub App with these repository permissions:

```text
Contents: Read and write
Metadata: Read-only
```

Install the app on this repository only:

```text
lkurcak/games
```

Generate a private key for the app. In each game repository that should publish here, add these Actions secrets:

```text
GAMES_PUBLISHER_APP_ID
GAMES_PUBLISHER_PRIVATE_KEY
```

Paste the full private key, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines, into `GAMES_PUBLISHER_PRIVATE_KEY`.

## Game Repository Workflow Template

Add this workflow to a game repository and adjust `GAME_SLUG`, build commands, and the artifact directory.

```yaml
name: Publish Game

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  GAME_SLUG: my-first-game
  GAME_DIST: dist

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout game repository
        uses: actions/checkout@v4

      - name: Build game
        run: |
          npm ci
          npm run build

      - name: Create GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v2
        with:
          app-id: ${{ secrets.GAMES_PUBLISHER_APP_ID }}
          private-key: ${{ secrets.GAMES_PUBLISHER_PRIVATE_KEY }}
          owner: lkurcak
          repositories: games

      - name: Checkout games hub
        uses: actions/checkout@v4
        with:
          repository: lkurcak/games
          path: games-hub
          token: ${{ steps.app-token.outputs.token }}

      - name: Copy artifact
        run: |
          rm -rf "games-hub/play/${GAME_SLUG}"
          mkdir -p "games-hub/play/${GAME_SLUG}"
          cp -R "${GAME_DIST}/." "games-hub/play/${GAME_SLUG}/"
          touch games-hub/.nojekyll

      - name: Commit and push
        working-directory: games-hub
        run: |
          git config user.name "games-publisher[bot]"
          git config user.email "games-publisher[bot]@users.noreply.github.com"
          git add .nojekyll "play/${GAME_SLUG}"
          git commit -m "Deploy ${GAME_SLUG} from ${GITHUB_REPOSITORY}@${GITHUB_SHA}" || exit 0
          git pull --rebase origin main
          git push
```

If several game repositories publish at the same time, one push can race another. Re-running the failed workflow is usually enough; add a retry loop later if this becomes common.

## Asset Paths

Build games with paths that work below `/games/play/<slug>/`.

For Vite, either use relative paths:

```js
export default {
  base: "./"
};
```

Or use the final GitHub Pages path:

```js
export default {
  base: "/games/play/my-first-game/"
};
```
