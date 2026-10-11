# PixelPlayer

A cozy pixel-art music player for Windows, built with Electron. PixelPlayer brings together your local music folders, Spotify library, and online music search in a warm, glass-inspired room UI.

## Features

- Browse and play your Spotify playlists and Liked Songs.
- Browse real Spotify playlists from a horizontal, keyboard-accessible carousel in the room.
- Switch the Now Playing panel between the queue, lyric availability, and same-artist tracks in the selected playlist.
- Search Spotify for tracks, artists, and albums while connected.
- Play, pause, skip tracks, seek through a song, and adjust volume.
- Browse and play local audio files from a folder you choose.
- Create local playlists and manage a play queue.
- Search Jamendo when Spotify is not connected (requires an optional Jamendo client ID).
- Switch the room between morning, afternoon, evening, and night; PixelPlayer remembers your choice.
- Use custom crisp pixel icons for navigation, theme selection, repeat, and transport controls; Whimsy greets you beside the logo.
- Enjoy the cozy room artwork, vinyl player, and animated playback visualizer.

## Requirements

- Windows 10 or later
- Node.js and npm
- A Spotify account for Spotify library features
- Spotify Premium for Spotify streaming through the Web Playback SDK

Spotify Development Mode also requires the account to be allowed in the app's **User Management** settings. See [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) for the full setup steps and playback troubleshooting.

## Install and run

Open a terminal in the project directory and run:

```sh
npm install
npm start
```

`npm start` keeps the terminal attached to PixelPlayer while the app is running. To stop it, focus the terminal and press **Ctrl+C**. Start it again with `npm start`.

## Configure Spotify

1. Create a Spotify developer app and add the PixelPlayer account under **Settings > User Management**.
2. Add the redirect URI `http://127.0.0.1:43827/callback` in the Spotify Developer Dashboard.
3. Copy `.env.example` to `.env` and set your Spotify Client ID:

   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   ```

4. Restart PixelPlayer and choose **Connect Spotify**. Sign in through the Spotify browser page and return to PixelPlayer.

PixelPlayer uses Authorization Code with PKCE; it does not need a Spotify client secret. Keep `.env` private. It is excluded from Git by `.gitignore`. Spotify playback requires an available Spotify playback device. If PixelPlayer cannot find one, start playback in the Spotify desktop app or browser, then retry the controls in PixelPlayer.

For optional Jamendo search, set `JAMENDO_CLIENT_ID` in `.env`. Spotify search is used when Spotify is connected; Jamendo search is available when it is not.

## Local music

Choose **Add Playlist** to create a local playlist, then select a music folder to load its tracks. PixelPlayer supports `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, and `.aac` files. The app reads audio only from the folder you select for the current session.

## Project layout

```text
PixelPlayer/
  assets/                   Room, player, vinyl, and decorative art
  assets/morning/           Morning room, bed, and character artwork
  assets/pet/               Whimsy, the PixelPlay bunny mascot
  assets/themes/            Afternoon, evening, and night scene assets
  assets/ui/                Crisp pixel navigation, theme, and repeat icons
  js/spotify-provider.js    Spotify OAuth, library, search, and playback API
  js/jamendo-provider.js    Optional Jamendo search and streaming API
  index.html                Application interface
  style.css                 Layout, glass panels, and visual styling
  renderer.js               UI behavior and playback controls
  main.js                   Electron main process and native integrations
  preload.js                Secure renderer-to-main process API
  .env.example              Configuration template (contains placeholders)
  SPOTIFY_SETUP.md          Detailed Spotify setup and troubleshooting
```

## Security notes

- Never commit `.env`, access tokens, refresh tokens, or client secrets.
- The Spotify integration uses PKCE and does not use a client secret.
- Spotify refresh credentials are stored using the operating system's secure credential storage.
- Local audio access is limited to the folder selected by the user during the current session.
