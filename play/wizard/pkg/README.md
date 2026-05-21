# Wizard

Turn-based dungeon crawler written in Rust.

## Terminal

```powershell
cargo run
```

## Tests

```powershell
cargo test
```

## Web Build

The web build keeps the Rust game engine and uses a Canvas2D browser UI with keyboard, swipe, ability buttons, and PNG sprites exported from `assets/*.aseprite`.

Generated outputs are ignored by git: `web/pkg`, `web/assets`, and `dist`.

1. First-time setup:

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

2. Build the local web artifact:

```powershell
node scripts/build-web.mjs
```

3. Serve the artifact:

```powershell
npx serve dist/wizard
```

4. Open the local URL printed by `serve`.

GitHub Actions also runs this build and uploads a `wizard-web` artifact. Re-run `./regenerate-pngs.sh` before building when sprite sources change.
