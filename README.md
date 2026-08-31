# 🎵 PixelPlayer

> A cozy, whimsical pixel-art desktop music player built with Electron.

PixelPlayer combines a retro pixel-art aesthetic with a functional music player experience. The application features a cozy room-inspired interface, local music playback, playlists, favourites, queue management, animated playback controls, and online music search capabilities.

---

## ✨ Features

### 🎮 Whimsical Pixel-Art Interface

PixelPlayer is designed as a cozy pixel-art music experience rather than a traditional music player.

- 🌿 Cozy pixel-art environment
- ✨ Whimsical UI elements
- 🎮 Game-inspired interface
- 🌸 Decorative pixel assets
- 💜 Warm and nostalgic colour palette

---

### 🎵 Music Player

- ▶️ Play music
- ⏸️ Pause music
- ⏭️ Skip tracks
- ⏮️ Previous track controls
- 🌊 Custom animated seekbar
- ⏱️ Live elapsed time
- ⌛ Remaining playback time
- 💿 Animated vinyl player interface

When no song is selected, the player remains empty instead of displaying hardcoded song information.

---

### 📂 Local Music Library

PixelPlayer supports loading music from your local device.

Users can:

- Choose a music folder
- Play local music files
- Add songs to playlists
- Manage their personal music collection

---

### 📋 Playlists

The application includes:

- 🧸 Playlist management
- 🌷 Multiple playlists
- ❤️ Favourites
- ➕ Add Playlist option
- 📋 Up Next queue

---

### 🔍 Music Search

PixelPlayer includes a centered glass-style search interface inspired by modern music streaming applications while preserving the whimsical PixelPlayer aesthetic.

Users can search for:

- Songs
- Artists
- Albums

---

## 🌐 Online Music Integration

PixelPlayer currently includes a **Jamendo music provider** for online music discovery.

### Jamendo Integration

The integration supports:

- 🔎 Searching for tracks
- 🎵 Discovering music
- ▶️ Streaming supported tracks
- 👩‍🎤 Artist information
- 💿 Album information
- 🖼️ Album artwork

> Jamendo integration requires a valid Jamendo Client ID.

---

## 🖼️ User Interface

### 🎮 Sidebar

The sidebar includes:

- PixelPlay branding
- Playlist navigation
- Favourites
- Add Playlist option
- Pixel-art decorative elements
- Decorative record player

---

### 🎶 Now Playing

The player displays:

- Album artwork
- Song title
- Artist name
- Playback controls
- Animated seekbar
- Elapsed playback time
- Remaining playback time

---

### 📋 Up Next Queue

The Up Next section allows users to view songs waiting to play.

The interface uses a glass-inspired design to match the overall cozy pixel aesthetic.

---

## 🛠️ Tech Stack

- **Electron**
- **JavaScript**
- **HTML**
- **CSS**
- **Node.js**
- **Jamendo API**

---

## 📁 Project Structure

```text
PixelPlayer/
│
├── assets/
│   ├── decorations/
│   │
│   └── player/
│
├── js/
│   └── jamendo-provider.js
│
├── index.html
├── style.css
├── renderer.js
├── main.js
├── preload.js
├── package.json
└── README.md