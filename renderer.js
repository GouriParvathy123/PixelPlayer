const chooseFolderBtn = document.getElementById('choose-folder-btn');
const trackList = document.getElementById('track-list');
const audio = document.getElementById('audio');
const volumeControl = document.getElementById('volume-control');
volumeControl.addEventListener('input', () => {
  const volume = Number(volumeControl.value);
  audio.volume = volume;
  if (activePlaybackSource === 'spotify' && spotifyPlayer) {
    spotifyPlayer.setVolume(volume).catch(console.warn);
  }
  if (activePlaybackSource === 'spotify' && spotifyRemoteDeviceId) {
    window.spotify.setPlaybackVolume(volume, spotifyRemoteDeviceId).catch(error => {
      console.warn('Could not set Spotify Connect device volume:', error.message);
    });
  }
});
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingArt = document.getElementById('now-playing-art');
const rightNowArt = document.getElementById('right-now-art');
const rightNowTitle = document.getElementById('right-now-title');
const rightNowArtist = document.getElementById('right-now-artist');
const playbackStatus = document.getElementById('playback-status');
const sidebarNowArt = document.getElementById('sidebar-now-art');
const sidebarNowTitle = document.getElementById('sidebar-now-title');
const albumArtContainer = document.querySelector('.album-art-container');
const sidebarTurntable = document.getElementById('sidebar-turntable');
const playButton = document.getElementById('play-btn');
function setPlayButtonArtwork(playing) {
  playButton.classList.toggle('is-playing', playing);
  const label = playing ? 'Pause (Space)' : 'Play (Space)';
  const icon = playButton.querySelector('img');
  if (icon) icon.src = playing ? 'assets/player/pause.png' : 'assets/player/play.png';
  playButton.setAttribute('aria-label', label);
  playButton.setAttribute('title', label);
}
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time-display');
const durationDisplay = document.getElementById('duration-display');
const playlistNav = document.querySelector('.playlist-nav');
const spotifyLibraryGroup = document.getElementById('spotify-library-group');
const spotifyPlaylistList = document.getElementById('spotify-playlist-list');
const spotifyPlaylistCarousel = document.getElementById('spotify-playlist-carousel');
const spotifyCarouselViewport = document.getElementById('spotify-carousel-viewport');
const spotifyCarouselList = document.getElementById('spotify-carousel-list');
const spotifyCarouselEmpty = document.getElementById('spotify-carousel-empty');
const spotifyCarouselConnect = document.getElementById('spotify-carousel-connect');
const spotifyCarouselCollapse = document.getElementById('spotify-carousel-collapse');
const spotifyCarouselRestore = document.getElementById('spotify-carousel-restore');
const spotifyCarouselPrevious = document.getElementById('spotify-carousel-previous');
const spotifyCarouselNext = document.getElementById('spotify-carousel-next');
const localPlaylistHeading = document.getElementById('local-playlist-heading');
const libraryCollectionView = document.getElementById('library-collection-view');
const libraryTabButtons = [...document.querySelectorAll('.library-tab[data-library-view]')];
const mainViewButtons = [...document.querySelectorAll('.primary-nav-item[data-main-view]')];
const playlistCount = document.getElementById('playlist-count');
const currentFolderName = document.getElementById('current-folder-name');
const playlistDialog = document.getElementById('playlist-dialog');
const playlistForm = document.getElementById('playlist-form');
const playlistNameInput = document.getElementById('playlist-name');

/* =========================================================
   ONLINE SEARCH UI
   ========================================================= */

const searchInput = document.getElementById('music-search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchResults = document.getElementById('search-results');
const searchSection = document.querySelector('.music-search');
const spotifyConnectButton = document.getElementById('spotify-connect-btn');
const spotifyConnectOverlay = document.getElementById('spotify-connect-overlay');
const spotifyConnectDialog = spotifyConnectOverlay?.querySelector('.spotify-connect-dialog');
const spotifyConnectTitle = document.getElementById('spotify-connect-title');
const spotifyConnectDescription = document.getElementById('spotify-connect-description');
const spotifyConnectStatus = document.getElementById('spotify-connect-status');
const spotifyConnectStatusText = document.getElementById('spotify-connect-status-text');
const spotifyConnectContinue = document.getElementById('spotify-connect-continue');
const spotifyConnectCancel = document.getElementById('spotify-connect-cancel');
const spotifyConnectClose = document.getElementById('spotify-connect-close');
const libraryToggleButton = document.getElementById('toggle-library-btn');
const queueToggleButton = document.getElementById('toggle-queue-btn');
const restoreQueueButton = document.getElementById('restore-queue-btn');
const rightPanelTabButtons = [...document.querySelectorAll('[data-right-panel-tab]')];
const rightPanelTabContents = [...document.querySelectorAll('[data-right-panel-content]')];
const relatedTrackList = document.getElementById('related-track-list');
const relatedPanelEmpty = document.getElementById('related-panel-empty');
const lyricsPanelTitle = document.getElementById('lyrics-panel-title');
const lyricsPanelCopy = document.getElementById('lyrics-panel-copy');
const roomCharacter = document.querySelector('.room-girl');
let keyboardPreviousVolume = Number(volumeControl.value) || 1;
let spotifyPlaybackUnavailableMessage = 'Spotify is still connecting. Check your internet, then try again.';
let spotifyPlaybackRequested = false;
let spotifyPlaybackPending = false;
let spotifyPlaybackAvailable = null;
let repeatMode = 0;
let isSeekingProgress = false;

function showPlaybackStatus(message, type = 'info') {
  if (!playbackStatus) return;
  playbackStatus.textContent = message;
  playbackStatus.className = `playback-status is-${type}`;
  playbackStatus.hidden = false;
}

function clearPlaybackStatus() {
  if (!playbackStatus) return;
  playbackStatus.hidden = true;
  playbackStatus.textContent = '';
  playbackStatus.className = 'playback-status';
}

function setLibraryCollapsed(collapsed, persist = true) {
  document.body.classList.toggle('library-collapsed', collapsed);
  if (libraryToggleButton) {
    libraryToggleButton.textContent = collapsed ? '›' : '‹';
    libraryToggleButton.setAttribute('aria-expanded', String(!collapsed));
    libraryToggleButton.setAttribute('aria-label', collapsed ? 'Expand library' : 'Collapse library');
    libraryToggleButton.title = collapsed ? 'Expand library' : 'Collapse library';
  }
  if (persist) localStorage.setItem('pixelplayer-library-collapsed', String(collapsed));
}

function setQueueCollapsed(collapsed, persist = true) {
  document.body.classList.toggle('queue-collapsed', collapsed);
  queueToggleButton?.setAttribute('aria-expanded', String(!collapsed));
  restoreQueueButton?.setAttribute('aria-expanded', String(!collapsed));
  if (queueToggleButton) {
    queueToggleButton.title = collapsed ? 'Hide queue' : 'Collapse queue';
    queueToggleButton.setAttribute('aria-label', 'Collapse queue');
  }
  if (restoreQueueButton) restoreQueueButton.title = collapsed ? 'Show queue' : 'Hide queue';
  if (persist) localStorage.setItem('pixelplayer-queue-collapsed', String(collapsed));
}

try {
  setLibraryCollapsed(localStorage.getItem('pixelplayer-library-collapsed') === 'true', false);
  setQueueCollapsed(localStorage.getItem('pixelplayer-queue-collapsed') === 'true', false);
} catch (error) {
  console.warn('Could not restore panel preferences:', error.message);
}

libraryToggleButton?.addEventListener('click', () => setLibraryCollapsed(!document.body.classList.contains('library-collapsed')));
queueToggleButton?.addEventListener('click', () => setQueueCollapsed(true));
restoreQueueButton?.addEventListener('click', () => setQueueCollapsed(false));

function setRightPanelTab(tabName, focusButton = false) {
  rightPanelTabButtons.forEach(button => {
    const selected = button.dataset.rightPanelTab === tabName;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focusButton) button.focus();
  });
  rightPanelTabContents.forEach(panel => {
    panel.hidden = panel.dataset.rightPanelContent !== tabName;
  });
  if (tabName === 'related') renderRelatedTracks();
  if (tabName === 'lyrics') updateLyricsPanel();
}

rightPanelTabButtons.forEach((button, index) => {
  button.addEventListener('click', () => setRightPanelTab(button.dataset.rightPanelTab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? rightPanelTabButtons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + rightPanelTabButtons.length) % rightPanelTabButtons.length;
    setRightPanelTab(rightPanelTabButtons[nextIndex].dataset.rightPanelTab, true);
  });
});

function updateLyricsPanel() {
  const song = playbackQueue[currentIndex];
  if (!lyricsPanelTitle || !lyricsPanelCopy) return;
  lyricsPanelTitle.textContent = song?.title || 'Lyrics';
  lyricsPanelCopy.textContent = song
    ? 'Lyrics are not available through PixelPlayer for this track yet.'
    : 'Choose a song to see lyric availability.';
}

function renderRelatedTracks() {
  if (!relatedTrackList || !relatedPanelEmpty) return;
  relatedTrackList.replaceChildren();
  const current = playbackQueue[currentIndex];
  const currentArtist = current?.artist?.trim().toLocaleLowerCase();
  const matches = currentArtist
    ? playbackQueue
      .map((song, index) => ({ song, index }))
      .filter(({ song, index }) => index !== currentIndex && song.artist?.trim().toLocaleLowerCase() === currentArtist)
      .slice(0, 30)
    : [];

  relatedPanelEmpty.hidden = matches.length > 0;
  relatedPanelEmpty.textContent = current
    ? `No other tracks by ${current.artist || 'this artist'} in the current playlist.`
    : 'Choose a song to find more tracks by the same artist in this playlist.';

  matches.forEach(({ song, index }) => {
    const row = document.createElement('li');
    row.className = 'track';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Play ${song.title || 'Unknown Track'} by ${song.artist || 'Unknown Artist'}`);

    const artwork = document.createElement('img');
    artwork.src = song.picture || 'assets/decorations/Teddy.png';
    artwork.alt = '';
    artwork.loading = 'lazy';
    artwork.addEventListener('error', () => { artwork.src = 'assets/decorations/Teddy.png'; }, { once: true });

    const details = document.createElement('span');
    details.className = 'track-details';
    const title = document.createElement('strong');
    title.textContent = song.title || 'Unknown Track';
    const artist = document.createElement('small');
    artist.textContent = song.artist || 'Unknown Artist';
    details.append(title, artist);

    const duration = document.createElement('time');
    duration.textContent = song.duration ? formatTime(song.duration) : '';
    row.append(artwork, details, duration);
    const playRelatedTrack = () => playTrack(song, index);
    row.addEventListener('click', playRelatedTrack);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playRelatedTrack();
      }
    });
    relatedTrackList.appendChild(row);
  });
}

function reactToAction() {
  if (!roomCharacter) return;
  roomCharacter.classList.remove('is-reacting');
  void roomCharacter.offsetWidth;
  roomCharacter.classList.add('is-reacting');
  window.setTimeout(() => roomCharacter.classList.remove('is-reacting'), 520);
}

const albumThemeCache = new Map();
let albumThemeRequest = 0;
function rgbToAdaptiveAccent({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  let lightness = (maximum + minimum) / 2;
  const difference = maximum - minimum;
  if (difference > 0) {
    saturation = difference / (1 - Math.abs(2 * lightness - 1));
    if (maximum === red) hue = ((green - blue) / difference) % 6;
    else if (maximum === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  saturation = Math.min(.5, Math.max(.28, saturation * .68));
  lightness = Math.min(.62, Math.max(.43, lightness));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = lightness - chroma / 2;
  let rgb;
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return rgb.map(channel => Math.round((channel + match) * 255));
}

function sampleArtworkRgb(thumbnailUrl) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, 16, 16);
        const pixels = context.getImageData(0, 0, 16, 16).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let weight = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3] / 255;
          const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
          if (alpha < .5 || brightness < 20 || brightness > 245) continue;
          const pixelWeight = alpha * (0.6 + Math.min(1, Math.abs(brightness - 128) / 128));
          red += pixels[index] * pixelWeight;
          green += pixels[index + 1] * pixelWeight;
          blue += pixels[index + 2] * pixelWeight;
          weight += pixelWeight;
        }
        resolve(weight ? {
          r: Math.round(red / weight),
          g: Math.round(green / weight),
          b: Math.round(blue / weight),
        } : null);
      } catch (error) {
        console.debug('Album color sampling skipped:', error.message);
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = thumbnailUrl;
  });
}

function applyAlbumArtworkTheme(imageUrl) {
  const request = ++albumThemeRequest;
  const root = document.documentElement;
  root.style.setProperty('--album-rgb', '192, 106, 132');
  root.style.setProperty('--album-accent', 'rgb(192, 106, 132)');
  if (!imageUrl || !window.library?.artworkColor) return;

  const apply = color => {
    if (request !== albumThemeRequest || !color) return;
    const [r, g, b] = rgbToAdaptiveAccent(color);
    root.style.setProperty('--album-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--album-accent', `rgb(${r}, ${g}, ${b})`);
  };
  if (albumThemeCache.has(imageUrl)) {
    apply(albumThemeCache.get(imageUrl));
    return;
  }
  window.library.artworkColor(imageUrl).then(sampleArtworkRgb).then(color => {
    if (color) albumThemeCache.set(imageUrl, color);
    apply(color);
  }).catch(error => console.debug('Album color sampling skipped:', error.message));
}


/* =========================================================
   APP STATE
   ========================================================= */

let songs = [];
let currentIndex = -1;
let selectedPlaylist = null;
let selectedFolderPath = '';

/*
 * Playback queue can contain:
 * - Local songs
 * - Jamendo search results
 */
let playbackQueue = [];
let playbackQueueSource = 'local';
let activePlaybackSource = null;
let spotifyConnected = false;
let spotifyPlaylists = [];
let currentSpotifyPlaylistId = null;
let spotifySearchOffset = 0;
let spotifySearchTotal = 0;
let spotifySearchResults = [];
let spotifyConnectInFlight = false;
let spotifyConnectCancelled = false;
let spotifyOverlayReturnFocus = null;
let spotifyPlayer = null;
let spotifyDeviceId = null;
let spotifyRemoteDeviceId = null;
let spotifyRemoteDeviceName = '';
let spotifyRemotePollPending = false;
let spotifySdkPromise = null;
let spotifyProfile = null;
let spotifyPlayerState = null;
let spotifyStateUpdatedAt = 0;
let spotifyAdvanceTrackId = null;

const playlistSongs = new Map();
const folderNames = new Map();
const playlistIcons = [
  'assets/decorations/Teddy.png',
  null,
  null,
  'assets/decorations/Strawberry.png',
  'assets/player/favourite.png',
  'assets/decorations/Rosebush.png',
  'assets/decorations/Toadstool.png',
  'assets/decorations/Sunflower.png'
];
let playlists = loadPlaylists();

function loadPlaylists() {
  try {
    const stored = localStorage.getItem('pixel-player-playlists');
    if (stored === null) return [
      { id: 'playlist-1', name: 'Playlist 1' },
      { id: 'playlist-2', name: 'Playlist 2' },
      { id: 'playlist-3', name: 'Playlist 3' },
      { id: 'playlist-4', name: 'Playlist 4' },
      { id: 'favourites', name: 'Favourites' }
    ];
    const saved = JSON.parse(stored);
    return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string') : [];
  } catch {
    return [];
  }
}

function savePlaylists() {
  localStorage.setItem('pixel-player-playlists', JSON.stringify(playlists));
}

function updateRoomClock() {
  const now = new Date();
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: true
  }).formatToParts(now);
  document.getElementById('current-time').textContent =
    `${timeParts.find(part => part.type === 'hour')?.value}:${timeParts.find(part => part.type === 'minute')?.value}`;
  document.getElementById('current-period').textContent =
    timeParts.find(part => part.type === 'dayPeriod')?.value || '';
  document.getElementById('current-date').textContent =
    new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(now);
}

updateRoomClock();
setInterval(updateRoomClock, 30_000);

let jamendoReady = false;
let searchTimer = null;
let latestSearchRequest = 0;


/* =========================================================
   JAMENDO INITIALIZATION
   ========================================================= */

async function initializeJamendo() {
  if (!window.jamendo) {
    console.warn('Jamendo bridge is not available.');
    return false;
  }

  try {
    const result = await window.jamendo.init();

    jamendoReady = result?.success === true;

    if (!jamendoReady) {
      console.warn(
        'Jamendo initialization failed:',
        result?.error || 'Unknown error'
      );
    }

    return jamendoReady;

  } catch (error) {
    jamendoReady = false;

    console.error(
      'Jamendo initialization error:',
      error
    );

    return false;
  }
}


/* =========================================================
   LOCAL MUSIC FOLDER
   ========================================================= */

async function chooseMusicFolder() {
  const folder = await window.library.chooseFolder();

  if (!folder) return;

  selectedFolderPath = folder;

  const folderName =
    folder.split('\\').pop() ||
    folder.split('/').pop() ||
    'Music Folder';

  folderNames.set(
    selectedPlaylist,
    folderName
  );

  if (currentFolderName) {
    currentFolderName.textContent = folderName;
  }

  songs = await window.library.scanLibrary();

  playlistSongs.set(
    selectedPlaylist,
    songs
  );

  playbackQueue = songs;
  playbackQueueSource = 'local';
  currentIndex = -1;

  renderTrackList(songs);
}


if (chooseFolderBtn) {
  chooseFolderBtn.addEventListener(
    'click',
    openPlaylistDialog
  );
}

document.getElementById('add-playlist-btn')?.addEventListener('click', openPlaylistDialog);


function openPlaylistDialog() {
  playlistNameInput.value = '';
  playlistDialog.showModal();
  requestAnimationFrame(() => playlistNameInput.focus());
}


function renderPlaylistButtons() {
  playlistNav.querySelectorAll('.playlist-item[data-playlist]').forEach(button => button.remove());
  if (localPlaylistHeading) localPlaylistHeading.hidden = playlists.length === 0;
  playlists.forEach((playlist, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `playlist-item${playlist.id === selectedPlaylist ? ' active' : ''}`;
    button.dataset.playlist = playlist.id;
    const iconSource = playlistIcons[index % playlistIcons.length];
    const icon = document.createElement(iconSource ? 'img' : 'span');
    if (iconSource) {
      icon.src = iconSource;
      icon.alt = '';
    } else {
      icon.className = 'playlist-symbol';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = index % playlistIcons.length === 1 ? '♫' : '★';
    }
    const label = document.createElement('span');
    label.textContent = playlist.name;
    const playMark = document.createElement('span');
    playMark.className = 'playlist-play-mark';
    playMark.setAttribute('aria-hidden', 'true');
    button.append(icon, label, playMark);
    playlistNav.insertBefore(button, chooseFolderBtn);
  });
}


function renderSpotifyPlaylistButtons() {
  if (!spotifyPlaylistList || !spotifyLibraryGroup) return;
  spotifyLibraryGroup.hidden = !spotifyConnected;
  spotifyPlaylistList.replaceChildren();

  const likedButton = document.createElement('button');
  likedButton.type = 'button';
  likedButton.className = 'playlist-item spotify-playlist-item';
  likedButton.dataset.spotifyLibrary = 'liked';
  const likedIcon = document.createElement('img');
  likedIcon.className = 'spotify-liked-icon';
  likedIcon.src = 'assets/player/favourite.png';
  likedIcon.alt = '';
  const likedLabel = document.createElement('span');
  likedLabel.textContent = 'Liked Songs';
  likedButton.append(likedIcon, likedLabel);
  spotifyPlaylistList.appendChild(likedButton);

  spotifyPlaylists.forEach((playlist, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'playlist-item spotify-playlist-item';
    button.dataset.spotifyPlaylist = playlist.id;
    button.title = `${playlist.name} · ${playlist.total} tracks`;

    if (playlist.picture) {
      const image = document.createElement('img');
      image.src = playlist.picture;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.src = playlistIcons[index % playlistIcons.length] || 'assets/decorations/Teddy.png';
        image.classList.add('playlist-fallback-art');
      }, { once: true });
      button.appendChild(image);
    } else {
      const icon = document.createElement('img');
      icon.src = playlistIcons[index % playlistIcons.length] || 'assets/decorations/Teddy.png';
      icon.alt = '';
      button.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = playlist.name;
    button.appendChild(label);
    spotifyPlaylistList.appendChild(button);
  });

  spotifyPlaylistList.querySelectorAll('.playlist-item').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.spotifyPlaylist === currentSpotifyPlaylistId ||
      (button.dataset.spotifyLibrary === 'liked' && currentSpotifyPlaylistId === 'liked')
    );
  });

  renderSpotifyPlaylistCarousel();
}


function renderSpotifyPlaylistCarousel() {
  if (!spotifyCarouselList || !spotifyCarouselEmpty) return;
  spotifyCarouselList.replaceChildren();

  const connected = spotifyConnected;
  spotifyCarouselEmpty.hidden = connected && spotifyPlaylists.length > 0;
  if (spotifyCarouselConnect) spotifyCarouselConnect.hidden = connected;
  if (connected && !spotifyPlaylists.length) {
    spotifyCarouselEmpty.querySelector('span').textContent = 'No Spotify playlists were found for this account.';
  } else if (!connected) {
    spotifyCarouselEmpty.querySelector('span').textContent = 'Connect Spotify to see your playlists here.';
  }

  (connected ? spotifyPlaylists : []).forEach((playlist, index) => {
    const item = document.createElement('div');
    item.className = 'spotify-carousel-item';
    item.setAttribute('role', 'listitem');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spotify-carousel-card';
    button.dataset.spotifyPlaylist = playlist.id;
    button.setAttribute('aria-label', `Open playlist ${playlist.name}, ${playlist.total} tracks`);
    button.classList.toggle('active', playlist.id === currentSpotifyPlaylistId);

    const artwork = document.createElement('img');
    artwork.className = 'spotify-carousel-art';
    artwork.src = playlist.picture || playlistIcons[index % playlistIcons.length] || 'assets/decorations/Teddy.png';
    artwork.alt = '';
    artwork.loading = 'lazy';
    artwork.addEventListener('error', () => {
      artwork.src = playlistIcons[index % playlistIcons.length] || 'assets/decorations/Teddy.png';
      artwork.classList.add('is-fallback');
    }, { once: true });

    const copy = document.createElement('span');
    copy.className = 'spotify-carousel-copy';
    const name = document.createElement('strong');
    name.textContent = playlist.name;
    const count = document.createElement('small');
    count.textContent = playlist.description?.trim() || `${playlist.total} ${playlist.total === 1 ? 'song' : 'songs'}`;
    count.title = count.textContent;
    copy.append(name, count);

    const marker = document.createElement('span');
    marker.className = 'spotify-carousel-playing';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '♫';
    button.append(artwork, copy, marker);
    item.appendChild(button);
    spotifyCarouselList.appendChild(item);
  });

  updateSpotifyCarouselScrollButtons();
}


function updateSpotifyCarouselScrollButtons() {
  if (!spotifyCarouselViewport) return;
  const maxScroll = spotifyCarouselViewport.scrollHeight - spotifyCarouselViewport.clientHeight;
  if (spotifyCarouselPrevious) spotifyCarouselPrevious.disabled = spotifyCarouselViewport.scrollTop <= 2;
  if (spotifyCarouselNext) spotifyCarouselNext.disabled = maxScroll <= 2 || spotifyCarouselViewport.scrollTop >= maxScroll - 2;
}


function setSpotifyCarouselCollapsed(collapsed, persist = true) {
  document.body.classList.toggle('spotify-carousel-collapsed', collapsed);
  if (spotifyPlaylistCarousel) {
    spotifyPlaylistCarousel.inert = collapsed;
    spotifyPlaylistCarousel.setAttribute('aria-hidden', String(collapsed));
  }
  spotifyCarouselCollapse?.setAttribute('aria-expanded', String(!collapsed));
  spotifyCarouselCollapse?.setAttribute('aria-label', collapsed ? 'Show playlist carousel' : 'Hide playlist carousel');
  if (spotifyCarouselRestore) spotifyCarouselRestore.hidden = !collapsed;
  if (persist) {
    try {
      localStorage.setItem('pixelplayer-playlist-carousel-collapsed', String(collapsed));
    } catch (error) {
      console.warn('Could not save playlist carousel visibility:', error.message);
    }
  }
}

spotifyCarouselList?.addEventListener('click', event => {
  const button = event.target.closest('.spotify-carousel-card[data-spotify-playlist]');
  if (button) selectSpotifyPlaylist(button);
});

spotifyCarouselConnect?.addEventListener('click', openSpotifyConnectOverlay);
spotifyCarouselCollapse?.addEventListener('click', () => {
  setSpotifyCarouselCollapsed(!document.body.classList.contains('spotify-carousel-collapsed'));
});
spotifyCarouselRestore?.addEventListener('click', () => setSpotifyCarouselCollapsed(false));
spotifyCarouselPrevious?.addEventListener('click', () => {
  spotifyCarouselViewport?.scrollBy({ top: -Math.max(120, spotifyCarouselViewport.clientHeight * .72), behavior: 'smooth' });
});
spotifyCarouselNext?.addEventListener('click', () => {
  spotifyCarouselViewport?.scrollBy({ top: Math.max(120, spotifyCarouselViewport.clientHeight * .72), behavior: 'smooth' });
});
spotifyCarouselViewport?.addEventListener('scroll', updateSpotifyCarouselScrollButtons, { passive: true });
spotifyCarouselViewport?.addEventListener('wheel', event => {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (delta && spotifyCarouselViewport.scrollHeight > spotifyCarouselViewport.clientHeight) {
    event.preventDefault();
    spotifyCarouselViewport.scrollBy({ top: delta, behavior: 'auto' });
  }
}, { passive: false });
window.addEventListener('resize', updateSpotifyCarouselScrollButtons);
spotifyCarouselViewport?.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    spotifyCarouselViewport.scrollBy({ top: event.key === 'ArrowUp' ? -120 : 120, behavior: 'smooth' });
  }
});

try {
  setSpotifyCarouselCollapsed(localStorage.getItem('pixelplayer-playlist-carousel-collapsed') === 'true', false);
} catch (error) {
  console.warn('Could not read playlist carousel visibility:', error.message);
}
renderSpotifyPlaylistCarousel();


function setLibraryView(view) {
  const playlistsView = view === 'playlists';
  libraryTabButtons.forEach(button => {
    const active = button.dataset.libraryView === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  playlistNav.hidden = !playlistsView;
  libraryCollectionView.hidden = playlistsView;
  if (!playlistsView) renderLibraryCollection(view);
}


function renderLibraryCollection(view) {
  const sourceTracks = playbackQueue.length ? playbackQueue : songs;
  const field = view === 'artists' ? 'artist' : 'album';
  const groups = new Map();
  sourceTracks.forEach(track => {
    const values = field === 'artist'
      ? String(track.artist || 'Unknown artist').split(',').map(value => value.trim())
      : [String(track.album || 'Unknown album')];
    values.filter(Boolean).forEach(name => {
      if (!groups.has(name)) groups.set(name, { name, tracks: [], picture: track.picture });
      groups.get(name).tracks.push(track);
    });
  });

  libraryCollectionView.replaceChildren();
  const caption = document.createElement('p');
  caption.className = 'library-collection-caption';
  caption.textContent = sourceTracks.length ? `${view[0].toUpperCase()}${view.slice(1)} in the current list` : 'Open a playlist to browse its artists and albums.';
  libraryCollectionView.appendChild(caption);

  if (!groups.size) return;
  groups.forEach(group => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-collection-item';
    const art = document.createElement('img');
    art.src = group.picture || 'assets/decorations/Teddy.png';
    art.alt = '';
    art.addEventListener('error', () => { art.src = 'assets/decorations/Teddy.png'; }, { once: true });
    const details = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = group.name;
    const count = document.createElement('small');
    count.textContent = `${group.tracks.length} ${group.tracks.length === 1 ? 'song' : 'songs'}`;
    details.append(name, count);
    button.append(art, details);
    button.addEventListener('click', () => {
      playbackQueue = group.tracks;
      songs = group.tracks;
      playbackQueueSource = group.tracks[0]?.source || playbackQueueSource;
      currentIndex = -1;
      currentFolderName.textContent = group.name;
      if (playlistCount) playlistCount.textContent = `0/${group.tracks.length}`;
      renderTrackList(group.tracks);
      setLibraryView('playlists');
      reactToAction();
    });
    libraryCollectionView.appendChild(button);
  });
}


libraryTabButtons.forEach(button => {
  button.addEventListener('click', () => setLibraryView(button.dataset.libraryView));
});

mainViewButtons.forEach(button => {
  button.addEventListener('click', () => {
    mainViewButtons.forEach(item => item.classList.toggle('active', item === button));
    if (button.dataset.mainView === 'search') {
      searchInput?.focus();
    } else if (button.dataset.mainView === 'library') {
      setLibraryCollapsed(false);
      setLibraryView('playlists');
    } else {
      closeSearchResults();
    }
  });
});


function selectPlaylist(button) {
  currentSpotifyPlaylistId = null;
  selectedPlaylist = button.dataset.playlist;
  songs = playlistSongs.get(selectedPlaylist) || [];
  currentIndex = -1;
  playbackQueue = songs;
  playbackQueueSource = 'local';

  playlistNav.querySelectorAll('.playlist-item[data-playlist]').forEach(item => {
    item.classList.toggle('active', item === button);
  });

  const name = folderNames.get(selectedPlaylist) || button.querySelector('span')?.textContent || 'Music Folder';
  currentFolderName.textContent = name;
  if (playlistCount) playlistCount.textContent = songs.length ? `0/${songs.length}` : '0/0';

  trackList.classList.add('switching');
  setTimeout(() => {
    renderTrackList(songs);
    trackList.classList.remove('switching');
  }, 140);
}


renderPlaylistButtons();
if (playlists.length) selectPlaylist(playlistNav.querySelector(`[data-playlist="${CSS.escape(playlists[0].id)}"]`));
else {
  currentFolderName.textContent = 'Your music room';
  const initialEmpty = trackList.querySelector('.empty');
  if (initialEmpty) {
    initialEmpty.querySelector('strong').textContent = 'Your music room is waiting';
    initialEmpty.querySelector('span').textContent = 'Create a playlist to give your songs a home.';
    initialEmpty.querySelector('.empty-action').textContent = 'Create a playlist';
  }
}

playlistForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = playlistNameInput.value.trim();
  if (!name) {
    playlistNameInput.focus();
    return;
  }
  const playlist = { id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name };
  playlists.push(playlist);
  savePlaylists();
  renderPlaylistButtons();
  selectPlaylist(playlistNav.querySelector(`[data-playlist="${CSS.escape(playlist.id)}"]`));
  playlistDialog.close();
});

playlistDialog.querySelector('.dialog-close').addEventListener('click', () => playlistDialog.close());
playlistDialog.querySelector('.dialog-cancel').addEventListener('click', () => playlistDialog.close());
playlistDialog.addEventListener('click', event => {
  if (event.target === playlistDialog) playlistDialog.close();
});

const initialEmptyAction =
  document.querySelector('.empty-action');

if (initialEmptyAction) {
  initialEmptyAction.addEventListener(
    'click',
    () => selectedPlaylist ? chooseMusicFolder() : openPlaylistDialog()
  );
}


/* =========================================================
   PLAYLIST HOVER EFFECT
   ========================================================= */

if (playlistNav) {
  playlistNav.addEventListener('click', event => {
    mainViewButtons.forEach(item => item.classList.toggle('active', item.dataset.mainView === 'library'));
    setLibraryView('playlists');
    const spotifyButton = event.target.closest('.spotify-playlist-item');
    if (spotifyButton) {
      if (spotifyButton.dataset.spotifyLibrary === 'liked') {
        playlistNav.querySelectorAll('.playlist-item').forEach(item => item.classList.remove('active'));
        spotifyButton.classList.add('active');
        loadSpotifyLikedSongs().catch(error => showSearchMessage(error.message, 'error'));
      } else if (spotifyButton.dataset.spotifyPlaylist) {
        selectSpotifyPlaylist(spotifyButton);
      }
      return;
    }
    const button = event.target.closest('.playlist-item[data-playlist]');
    if (button) selectPlaylist(button);
  });

  playlistNav.addEventListener(
    'pointermove',
    (event) => {

      playlistNav.querySelectorAll('.playlist-item').forEach(
        (button) => {

          const bounds =
            button.getBoundingClientRect();

          const distance =
            Math.abs(
              event.clientY -
              (
                bounds.top +
                bounds.height / 2
              )
            );

          /*
           * Wider falloff radius so neighboring
           * tabs also swell a little, like a
           * macOS dock cascade.
           */

          const influence =
            Math.max(
              0,
              1 - distance / 150
            );

          /*
           * Ease the influence curve so it
           * ramps up smoothly near the cursor
           * instead of feeling linear.
           */

          const eased =
            influence * influence * (3 - 2 * influence);

          button.style.setProperty(
            '--dock-scale',
            (
              1 +
              eased * 0.07
            ).toFixed(3)
          );

          button.style.setProperty(
            '--dock-lift',
            `${(eased * 4).toFixed(2)}px`
          );

        }
      );

    }
  );


  playlistNav.addEventListener(
    'pointerleave',
    () => {

      playlistNav.querySelectorAll('.playlist-item').forEach(
        (button) => {

          button.style.removeProperty(
            '--dock-scale'
          );

          button.style.removeProperty(
            '--dock-lift'
          );

        }
      );

    }
  );

}


/* =========================================================
   LOCAL + ONLINE TRACK LIST
   ========================================================= */

function renderTrackList(trackArray) {

  trackList.innerHTML = '';


  if (trackArray.length === 0) {

    trackList.innerHTML = `
      <li class="empty">

        <img
          src="assets/player/headphones.svg"
          alt=""
        >

        <strong>
          ${selectedFolderPath ? 'This playlist is empty' : 'Your music room is waiting'}
        </strong>

        <span>
          ${selectedFolderPath ? 'No audio files were found in that folder.' : 'Choose a music folder to fill this playlist with songs.'}
        </span>

        <button
          class="empty-action"
          type="button"
        >
          ${selectedFolderPath ? 'Choose another folder' : 'Choose music folder'}
        </button>

      </li>
    `;


    const emptyButton =
      trackList.querySelector(
        '.empty-action'
      );

    if (emptyButton) {

      emptyButton.addEventListener(
        'click',
        chooseMusicFolder
      );

    }

    return;
  }


  if (playlistCount) {

    playlistCount.textContent =
      `${
        currentIndex >= 0
          ? currentIndex + 1
          : 0
      }/${trackArray.length}`;

  }


  trackArray.forEach(
    (song, index) => {

      const li =
        document.createElement('li');

      li.className = 'track';

      li.dataset.index = index;


      /* Artwork */

      const artwork =
        document.createElement('img');

      artwork.src =
        song.picture ||
        'assets/decorations/Teddy.png';

      artwork.alt = '';

      artwork.loading = 'lazy';
      artwork.addEventListener('error', () => {
        artwork.src = 'assets/decorations/Teddy.png';
      }, { once: true });


      /* Details */

      const details =
        document.createElement('span');

      details.className =
        'track-details';


      const title =
        document.createElement('strong');

      title.textContent =
        song.title ||
        'Unknown Track';


      const artist =
        document.createElement('small');

      artist.textContent =
        `Artist: ${
          song.artist ||
          'Unknown Artist'
        }`;


      details.append(
        title,
        artist
      );


      /* Duration */

      const duration =
        document.createElement('time');

      duration.textContent =
        song.duration
          ? formatTime(song.duration)
          : '';


      li.append(
        artwork,
        details,
        duration
      );


      /* Online source badge */

      if (song.source === 'jamendo' || song.source === 'spotify') {

        const badge =
          document.createElement('span');

        badge.className =
          'online-badge';

        badge.textContent = song.source === 'spotify' ? 'SPOTIFY' : 'ONLINE';

        li.appendChild(badge);

      }


      /* Click to play */

      li.addEventListener(
        'click',
        () => {

          playbackQueue =
            trackArray;

          playbackQueueSource = song.source || 'local';

          playTrack(
            song,
            index
          );

        }
      );


      trackList.appendChild(li);

    }
  );

  renderRelatedTracks();

}


/* =========================================================
   ACTIVE TRACK
   ========================================================= */

function updateActiveTrack() {

  document
    .querySelectorAll('.track')
    .forEach((track) => {

      track.classList.remove(
        'playing'
      );

    });


  if (currentIndex < 0) {
    return;
  }


  const activeTrack =
    document.querySelector(
      `.track[data-index="${currentIndex}"]`
    );


  if (activeTrack) {

    activeTrack.classList.add(
      'playing'
    );

  }

}


/* =========================================================
   GET AUDIO SOURCE
   ========================================================= */

function getTrackSource(song) {

  /*
   * Jamendo streams through HTTPS.
   */

  if (song?.source === 'jamendo') {

    return song.streamUrl;

  }


  /*
   * Local music uses the
   * source generated by main.js.
   */

  return song?.src;

}


function setPlaybackVisualState(playing) {
  albumArtContainer?.classList.toggle('is-playing', playing);
  sidebarTurntable?.classList.toggle('is-playing', playing);
  document.body.classList.toggle('is-playing', playing);
  setPlayButtonArtwork(playing);
}

function updateSpotifyProgress() {
  if (isSeekingProgress) return;
  const state = spotifyPlayerState;
  const duration = Number(state?.duration) || 0;
  if (!state || duration <= 0 || activePlaybackSource !== 'spotify') return;

  const elapsedSinceState = state.paused ? 0 : Math.max(0, Date.now() - spotifyStateUpdatedAt);
  const position = Math.min(duration, (Number(state.position) || 0) + elapsedSinceState);
  progress.style.width = `${Math.min(100, (position / duration) * 100)}%`;
  progressBar?.setAttribute('aria-valuenow', String(Math.round((position / duration) * 100)));
  progressBar?.setAttribute('aria-valuetext', `${formatTime(position / 1000)} of ${formatTime(duration / 1000)}`);
  currentTimeDisplay.textContent = formatTime(position / 1000);
  durationDisplay.textContent = `-${formatTime(Math.max(0, duration - position) / 1000)}`;
}

function isElectronRuntime() {
  return /Electron\//i.test(navigator.userAgent || '');
}

async function startSpotifyOnConnectDevice(song) {
  const findDevice = async () => {
    const available = await window.spotify.availableDevices();
    const devices = (Array.isArray(available) ? available : available?.devices || [])
      .filter(device => device?.id && !device.is_restricted);
    return devices.find(item => item.is_active) ||
      devices.find(item => item.type === 'computer') ||
      devices[0] || null;
  };

  let device = await findDevice();

  if (!device) {
    showPlaybackStatus('Opening this track in Spotify to wake its playback device…', 'info');
    await window.spotify.openTrack(song.uri);
    for (let attempt = 0; attempt < 12 && !device; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 1000));
      device = await findDevice();
    }
  }

  if (!device) {
    throw new Error('Spotify opened, but has not registered a playback device yet. Press Play once in the Spotify app or browser, then press Play here again.');
  }

  await window.spotify.transferPlayback(device.id);
  await window.spotify.startPlayback(song.uri, device.id);
  spotifyRemoteDeviceId = device.id;
  spotifyRemoteDeviceName = device.name || 'Spotify Connect device';
  spotifyPlaybackUnavailableMessage = '';
  showPlaybackStatus(`Playing through ${spotifyRemoteDeviceName}. PixelPlayer controls playback.`, 'info');
  await syncRemoteSpotifyState();
}

async function syncRemoteSpotifyState() {
  if (!spotifyRemoteDeviceId || spotifyRemotePollPending || activePlaybackSource !== 'spotify') return;
  spotifyRemotePollPending = true;
  try {
    const state = await window.spotify.playbackState();
    if (!state?.item) {
      setPlaybackVisualState(false);
      return;
    }

    const item = state.item;
    const track = {
      id: item.id,
      title: item.name || 'Unknown Track',
      artist: (item.artists || []).map(artist => artist.name).join(', ') || 'Unknown Artist',
      picture: item.album?.images?.[1]?.url || item.album?.images?.[0]?.url || '',
      duration: (Number(item.duration_ms) || 0) / 1000,
      source: 'spotify',
    };
    spotifyPlayerState = {
      position: Number(state.progress_ms) || 0,
      duration: Number(item.duration_ms) || 0,
      paused: !state.is_playing,
      track_window: { current_track: track },
    };
    spotifyStateUpdatedAt = Date.now();
    spotifyRemoteDeviceName = state.device?.name || spotifyRemoteDeviceName;

    const queueIndex = playbackQueue.findIndex(entry => entry.id === item.id);
    if (queueIndex >= 0 && queueIndex !== currentIndex) {
      currentIndex = queueIndex;
      updateActiveTrack();
      if (playlistCount) playlistCount.textContent = `${currentIndex + 1}/${playbackQueue.length}`;
    }
    if (rightNowTitle) rightNowTitle.textContent = track.title;
    if (rightNowArtist) rightNowArtist.textContent = track.artist;
    if (track.picture && rightNowArt) rightNowArt.src = track.picture;
    if (nowPlayingTitle) nowPlayingTitle.textContent = track.title;
    if (nowPlayingArtist) nowPlayingArtist.textContent = `Artist: ${track.artist} · Spotify`;
    if (track.picture && nowPlayingArt) nowPlayingArt.src = track.picture;
    updateSpotifyProgress();
    setPlaybackVisualState(state.is_playing === true);
  } catch (error) {
    console.warn('Could not sync Spotify Connect playback state:', error.message);
    showPlaybackStatus(error.message || 'Could not reach the Spotify playback device.', 'error');
  } finally {
    spotifyRemotePollPending = false;
  }
}


function initializeSpotifySdk() {
  if (isElectronRuntime()) {
    spotifyPlaybackAvailable = false;
    spotifyPlaybackUnavailableMessage = 'PixelPlayer is running in Electron, which is not a Spotify Web Playback SDK supported browser. Use a Spotify Connect device such as Spotify Desktop or Spotify in Chrome/Edge; PixelPlayer can control it.';
    return Promise.resolve(false);
  }
  if (spotifyPlayer && spotifyDeviceId) return Promise.resolve(true);
  if (spotifySdkPromise) return spotifySdkPromise;

  spotifySdkPromise = new Promise(resolve => {
    let settled = false;
    let playerCreated = false;
    let readyTimeout = null;
    const finish = (value, reason = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimeout);
      spotifyPlaybackAvailable = Boolean(value);
      if (!value) {
        spotifyDeviceId = null;
        spotifyPlayer?.disconnect();
        spotifyPlayer = null;
        spotifyPlayerState = null;
        spotifySdkPromise = null;
        if (reason) spotifyPlaybackUnavailableMessage = reason;
      }
      resolve(value);
    };

    const setupPlayer = () => {
      if (playerCreated || !window.Spotify?.Player) return;
      playerCreated = true;
      try {
        spotifyPlayer = new Spotify.Player({
          name: 'PixelPlayer',
          volume: Number(volumeControl.value),
          getOAuthToken: async callback => {
            try {
              callback(await window.spotify.accessToken());
            } catch (error) {
              console.error('Spotify token refresh failed:', error);
              spotifyPlaybackUnavailableMessage = error.message || 'Spotify sign-in expired. Reconnect your account.';
              if (spotifyPlaybackRequested) showPlaybackStatus(spotifyPlaybackUnavailableMessage, 'error');
            }
          },
        });

        spotifyPlayer.addListener('ready', ({ device_id: deviceId }) => {
          spotifyDeviceId = deviceId;
          spotifyPlaybackAvailable = true;
          spotifyPlaybackUnavailableMessage = '';
          if (activePlaybackSource === 'spotify') clearPlaybackStatus();
          finish(true);
        });
        spotifyPlayer.addListener('not_ready', () => {
          spotifyDeviceId = null;
          spotifyPlaybackAvailable = false;
          spotifyPlaybackUnavailableMessage = 'The Spotify player went offline. Check your connection and select the song again.';
          if (spotifyPlaybackRequested) showPlaybackStatus(spotifyPlaybackUnavailableMessage, 'error');
        });
        spotifyPlayer.addListener('player_state_changed', state => {
          spotifyPlayerState = state;
          spotifyStateUpdatedAt = Date.now();
          if (!state) {
            setPlaybackVisualState(false);
            return;
          }

          if (!state.paused) clearPlaybackStatus();
          const track = state.track_window?.current_track;
          if (track && activePlaybackSource === 'spotify') {
            const queueIndex = playbackQueue.findIndex(item => item.id === track.id);
            if (queueIndex >= 0 && queueIndex !== currentIndex) {
              currentIndex = queueIndex;
              updateActiveTrack();
              if (playlistCount) playlistCount.textContent = `${currentIndex + 1}/${playbackQueue.length}`;
            }
          }

          updateSpotifyProgress();
          setPlaybackVisualState(!state.paused);

          const durationMs = Number(state.duration) || 0;
          const positionMs = Number(state.position) || 0;
          if (state.paused && durationMs > 0 && positionMs >= durationMs - 1000 && track && playbackQueue.length && spotifyAdvanceTrackId !== track.id) {
            spotifyAdvanceTrackId = track.id;
            window.setTimeout(() => {
              if (activePlaybackSource !== 'spotify' || playbackQueue[currentIndex]?.id !== track.id) return;
              if (repeatMode !== 1 && repeatMode !== 2 && currentIndex >= playbackQueue.length - 1) {
                setPlaybackVisualState(false);
                return;
              }
              const nextIndex = repeatMode === 2
                ? currentIndex
                : (currentIndex + 1) % playbackQueue.length;
              playTrack(playbackQueue[nextIndex], nextIndex);
            }, 250);
          }
        });

        const sdkErrorMessages = {
          initialization_error: 'PixelPlayer could not initialize Spotify’s protected audio player. Update PixelPlayer and try again.',
          authentication_error: 'Spotify sign-in expired. Choose Reconnect and approve access again.',
          account_error: 'Spotify Premium is required to stream full songs inside PixelPlayer.',
          playback_error: 'Spotify could not play this track. It may be unavailable in your region or account.',
        };
        for (const eventName of Object.keys(sdkErrorMessages)) {
          spotifyPlayer.addListener(eventName, ({ message }) => {
            console.error(`Spotify ${eventName}:`, message);
            spotifyPlaybackUnavailableMessage = sdkErrorMessages[eventName];
            if (message && eventName !== 'account_error') spotifyPlaybackUnavailableMessage += ` ${message}`;
            if (spotifyPlaybackRequested || activePlaybackSource === 'spotify') {
              showPlaybackStatus(spotifyPlaybackUnavailableMessage, 'error');
            }
            setPlaybackVisualState(false);
            if (eventName !== 'playback_error') finish(false, spotifyPlaybackUnavailableMessage);
          });
        }

        spotifyPlayer.addListener('autoplay_failed', () => {
          if (spotifyPlaybackRequested) showPlaybackStatus('Press Play once more to allow Spotify audio to start.', 'info');
        });

        spotifyPlayer.connect().then(connected => {
          if (!connected) finish(false, 'Spotify could not connect its playback device. Check the account and internet connection.');
        }).catch(error => {
          console.error('Spotify player connection failed:', error);
          finish(false, error.message || 'Spotify could not connect its playback device.');
        });
      } catch (error) {
        console.error('Spotify player setup failed:', error);
        finish(false, error.message || 'Spotify could not initialize its playback device.');
      }
    };

    readyTimeout = window.setTimeout(() => {
      if (!spotifyDeviceId) {
        finish(false, 'Spotify did not register a playback device. In Developer Dashboard > PixelPlayer > Settings > User Management, add the Spotify account you use here; the app owner also needs active Premium. Restart PixelPlayer and reconnect. If those checks are already met, this may be a protected-media limitation of Electron.');
      }
    }, 15_000);

    window.onSpotifyWebPlaybackSDKReady = setupPlayer;
    if (window.Spotify?.Player) {
      setupPlayer();
      return;
    }

    let script = document.querySelector('script[data-spotify-web-playback-sdk]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.dataset.spotifyWebPlaybackSdk = 'true';
      script.onerror = () => {
        script.remove();
        finish(false, 'Spotify’s player could not load. Check your internet connection and restart PixelPlayer.');
      };
      document.head.appendChild(script);
    }
  }).finally(() => {
    if (!spotifyPlayer) spotifySdkPromise = null;
  });

  return spotifySdkPromise;
}


async function startSpotifyTrack(song) {
  if (!spotifyConnected) throw new Error('Connect Spotify before starting a track.');
  spotifyPlaybackRequested = true;
  spotifyPlaybackPending = true;
  showPlaybackStatus('Connecting to Spotify’s playback device…', 'info');
  // Start activation synchronously with the track-selection gesture when the
  // SDK is already ready; Chromium can otherwise discard the user activation.
  const activation = Promise.resolve(spotifyPlayer?.activateElement?.()).catch(() => {});
  try {
    if (isElectronRuntime()) {
      await startSpotifyOnConnectDevice(song);
      return;
    }

    if (spotifyRemoteDeviceId) {
      try {
        await window.spotify.startPlayback(song.uri, spotifyRemoteDeviceId);
        showPlaybackStatus(`Playing through ${spotifyRemoteDeviceName}. PixelPlayer controls playback.`, 'info');
        await syncRemoteSpotifyState();
        return;
      } catch (error) {
        console.warn('Saved Spotify Connect device is unavailable; searching again:', error.message);
        spotifyRemoteDeviceId = null;
        spotifyRemoteDeviceName = '';
      }
    }

    if (!spotifyPlayer || !spotifyDeviceId) {
      const ready = await initializeSpotifySdk();
      if (!ready || !spotifyDeviceId) {
        const sdkReason = spotifyPlaybackUnavailableMessage;
        try {
          await startSpotifyOnConnectDevice(song);
          return;
        } catch (fallbackError) {
          throw new Error(`${sdkReason} ${fallbackError.message}`);
        }
      }
    }

    await activation;
    await window.spotify.transferPlayback(spotifyDeviceId);
    await window.spotify.startPlayback(song.uri, spotifyDeviceId);
    clearPlaybackStatus();
  } finally {
    spotifyPlaybackPending = false;
  }
}

window.setInterval(updateSpotifyProgress, 250);
window.setInterval(syncRemoteSpotifyState, 3000);


async function loadSpotifyLikedSongs() {
  const response = await window.spotify.likedTracks();
  if (response?.error) throw new Error(response.error);

  const tracks = response?.tracks || [];
  currentSpotifyPlaylistId = 'liked';
  playlistNav.querySelectorAll('.playlist-item').forEach(item => item.classList.remove('active'));
  songs = tracks;
  playbackQueue = tracks;
  playbackQueueSource = 'spotify';
  currentIndex = -1;
  selectedFolderPath = '';
  currentFolderName.textContent = 'Spotify Liked Songs';
  renderTrackList(tracks);
  if (playlistCount) playlistCount.textContent = `0/${tracks.length}`;
  renderSpotifyPlaylistButtons();
  if (!tracks.length) showSearchMessage('Your Spotify Liked Songs list is empty.');
}


async function selectSpotifyPlaylist(button) {
  const playlist = spotifyPlaylists.find(item => item.id === button.dataset.spotifyPlaylist);
  if (!playlist) return;

  currentSpotifyPlaylistId = playlist.id;
  renderSpotifyPlaylistButtons();
  currentFolderName.textContent = playlist.name;
  playlistCount.textContent = `0/${playlist.total}`;
  selectedFolderPath = '';

  try {
    const response = await window.spotify.playlistTracks(playlist.id);
    if (response?.error) throw new Error(response.error);
    const tracks = response?.tracks || [];
    songs = tracks;
    playbackQueue = tracks;
    playbackQueueSource = 'spotify';
    currentIndex = -1;
    renderTrackList(tracks);
    playlistCount.textContent = `0/${tracks.length}`;
    if (!tracks.length) {
      trackList.innerHTML = '<li class="empty"><strong>This Spotify playlist has no playable tracks.</strong></li>';
    }
  } catch (error) {
    console.error('Could not load Spotify playlist:', error);
    showSearchMessage(error.message || 'Could not load this Spotify playlist.', 'error');
  }
}


async function loadSpotifyPlaylists(autoSelect = false) {
  const response = await window.spotify.playlists();
  if (response?.error) throw new Error(response.error);

  spotifyPlaylists = response?.playlists || [];
  renderSpotifyPlaylistButtons();

  if (autoSelect && spotifyPlaylists.length) {
    const first = spotifyPlaylistList.querySelector('[data-spotify-playlist]');
    if (first) await selectSpotifyPlaylist(first);
  }
  return spotifyPlaylists.length;
}


function setSpotifyConnectStatus(state, message) {
  if (!spotifyConnectStatus || !spotifyConnectStatusText) return;
  spotifyConnectStatus.classList.remove('is-busy', 'is-success', 'is-error');
  if (state) spotifyConnectStatus.classList.add(`is-${state}`);
  spotifyConnectStatusText.textContent = message;
}


function openSpotifyConnectOverlay() {
  if (!spotifyConnectOverlay) return;
  spotifyOverlayReturnFocus = document.activeElement;
  spotifyConnectTitle.textContent = spotifyConnected ? 'Reconnect your Spotify' : 'Connect your Spotify';
  spotifyConnectDescription.textContent = 'A secure sign-in opens in your browser. Your password stays with Spotify.';
  spotifyConnectContinue.textContent = 'Continue to Spotify';
  spotifyConnectContinue.disabled = false;
  spotifyConnectCancel.disabled = false;
  setSpotifyConnectStatus('', 'Ready when you are');
  spotifyConnectOverlay.hidden = false;
  spotifyConnectOverlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    spotifyConnectOverlay.classList.add('is-visible');
    spotifyConnectDialog?.focus();
  });
}


function closeSpotifyConnectOverlay() {
  if (!spotifyConnectOverlay || spotifyConnectOverlay.hidden) return;
  spotifyConnectOverlay.classList.remove('is-visible');
  spotifyConnectOverlay.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => {
    if (!spotifyConnectOverlay.classList.contains('is-visible')) {
      spotifyConnectOverlay.hidden = true;
      spotifyOverlayReturnFocus?.focus?.();
    }
  }, 280);
}


async function cancelSpotifyConnect() {
  if (spotifyConnectInFlight) {
    spotifyConnectCancelled = true;
    await window.spotify?.cancelConnect();
  }
  closeSpotifyConnectOverlay();
}


if (spotifyConnectButton) {
  spotifyConnectButton.addEventListener('click', openSpotifyConnectOverlay);
}
spotifyConnectCancel?.addEventListener('click', cancelSpotifyConnect);
spotifyConnectClose?.addEventListener('click', cancelSpotifyConnect);
spotifyConnectOverlay?.addEventListener('click', event => {
  if (event.target === spotifyConnectOverlay) cancelSpotifyConnect();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && spotifyConnectOverlay && !spotifyConnectOverlay.hidden) {
    cancelSpotifyConnect();
  }
});


async function initializeSpotify() {
  try {
    const configured = await window.spotify?.isConfigured();
    if (!configured) {
      if (spotifyConnectButton) spotifyConnectButton.title = 'Add SPOTIFY_CLIENT_ID to .env to enable Spotify.';
      return;
    }

    const response = await window.spotify.profile();
    if (!response?.profile) return;

    spotifyConnected = true;
    document.body.classList.add('spotify-connected');
    spotifyProfile = response.profile;
    if (spotifyConnectButton) {
      spotifyConnectButton.textContent = 'Reconnect';
      spotifyConnectButton.title = `Connected to Spotify as ${spotifyProfile.displayName}`;
    }
    if (searchInput) searchInput.placeholder = 'Search Spotify songs, artists or albums...';
    initializeSpotifySdk();
    await loadSpotifyPlaylists(true);
  } catch (error) {
    console.warn('Spotify session could not be restored:', error.message);
    if (/scope|permission|403|forbidden/i.test(error.message)) {
      if (spotifyConnectButton) {
        spotifyConnectButton.textContent = 'Reconnect';
        spotifyConnectButton.title = 'Reconnect Spotify to grant playlist access.';
      }
      showSearchMessage('Spotify needs playlist access. Click Reconnect and approve the requested permissions.', 'error');
    }
  }
}


spotifyConnectContinue?.addEventListener('click', async () => {
  if (spotifyConnectInFlight) return;
  spotifyConnectInFlight = true;
  spotifyConnectCancelled = false;
  spotifyConnectContinue.disabled = true;
  spotifyConnectCancel.disabled = false;
  spotifyConnectContinue.textContent = 'Opening Spotify...';
  spotifyConnectDescription.textContent = 'Your default browser will open Spotify. Sign in and approve access, then return to PixelPlayer.';
  setSpotifyConnectStatus('busy', 'Opening a secure Spotify sign-in...');

  try {
    const configured = await window.spotify?.isConfigured();
    if (!configured) throw new Error('Add SPOTIFY_CLIENT_ID to the project .env file, then restart PixelPlayer.');

    const result = await window.spotify.connect();
    if (spotifyConnectCancelled) return;
    if (!result?.success) throw new Error(result?.error || 'Spotify sign-in failed.');

    spotifyConnected = true;
    document.body.classList.add('spotify-connected');
    spotifyProfile = result.profile;
    spotifyConnectButton.textContent = 'Reconnect';
    spotifyConnectButton.title = `Connected to Spotify as ${spotifyProfile.displayName}`;
    if (searchInput) searchInput.placeholder = 'Search Spotify songs, artists or albums...';

    setSpotifyConnectStatus('success', 'Spotify connected. Loading your playlists...');
    spotifyConnectDescription.textContent = 'You are back in PixelPlayer. Your Spotify library is loading.';
    const ready = await initializeSpotifySdk();
    await loadSpotifyPlaylists(true);
    if (!ready) spotifyConnectDescription.textContent = `Your playlists are ready. ${spotifyPlaybackUnavailableMessage}`;
    setSpotifyConnectStatus('success', 'Connected as ' + (spotifyProfile.displayName || 'your Spotify account'));
    spotifyConnectContinue.textContent = 'Connected';
    window.setTimeout(closeSpotifyConnectOverlay, 1100);
  } catch (error) {
    if (spotifyConnectCancelled) return;
    console.error('Spotify connection failed:', error);
    spotifyConnectDescription.textContent = error.message || 'Spotify could not connect. Check your internet and try again.';
    setSpotifyConnectStatus('error', 'We could not finish connecting');
    spotifyConnectContinue.textContent = 'Try again';
    spotifyConnectContinue.disabled = false;
  } finally {
    spotifyConnectInFlight = false;
    spotifyConnectCancelled = false;
  }
});

/* =========================================================
   PLAY TRACK
   ========================================================= */

function playTrack(
  song,
  index = -1
) {

  const isSpotifyTrack = song?.source === 'spotify';
  const source = getTrackSource(song);
  const previousPlaybackSource = activePlaybackSource;


  if (!isSpotifyTrack && !source) {

    console.warn(
      'Track has no playable source:',
      song
    );

    return;

  }


  /*
   * Keep track of where the
   * currently playing song came from.
   */

  playbackQueueSource = song.source || 'local';
  activePlaybackSource = playbackQueueSource;
  if (isSpotifyTrack) spotifyAdvanceTrackId = null;


  currentIndex = index;


  /*
   * If there is no queue yet,
   * create one containing this song.
   */

  playbackQueue =
    playbackQueue.length
      ? playbackQueue
      : [song];


  if (index < 0) {

    playbackQueue = [song];

    currentIndex = 0;

  }


  /*
   * Load audio
   */

  audio.pause();
  if (isSpotifyTrack) {
    audio.removeAttribute('src');
    audio.load();
  } else {
    if (previousPlaybackSource === 'spotify' && spotifyPlayer) spotifyPlayer.pause().catch(() => {});
    audio.src = source;
    audio.load();
  }


  /*
   * Reset the timeline immediately —
   * the real duration/current time
   * populate once this track's
   * metadata and playback events fire.
   */

  if (progress) {
    progress.style.width = '0%';
  }

  if (currentTimeDisplay) {
    currentTimeDisplay.textContent = '00:00';
  }

  if (durationDisplay) {
    durationDisplay.textContent = '--:--';
  }


  /*
   * Update now-playing panel
   */

  nowPlayingTitle.textContent =
    song.title ||
    'Unknown Track';


  nowPlayingArtist.textContent =
    `Artist: ${
      song.artist ||
      'Unknown Artist'
    }`;


  nowPlayingArt.src =
    song.picture ||
    'assets/background/background.png';
  applyAlbumArtworkTheme(song.picture);
  reactToAction();

  if (rightNowArt) rightNowArt.src = nowPlayingArt.src;
  if (rightNowTitle) rightNowTitle.textContent = song.title || 'Unknown Track';
  if (rightNowArtist) rightNowArtist.textContent = song.artist || 'Unknown Artist';
  updateLyricsPanel();
  renderRelatedTracks();
  clearPlaybackStatus();

  if (sidebarNowArt) sidebarNowArt.src = nowPlayingArt.src;
  if (sidebarNowTitle) sidebarNowTitle.textContent = song.title || 'Unknown Track';


  /*
   * Show Jamendo source.
   */

  if (song.source === 'jamendo') {

    nowPlayingArtist.textContent =
      `Artist: ${
        song.artist ||
        'Unknown Artist'
      } · Jamendo`;

  }

  if (isSpotifyTrack) {
    nowPlayingArtist.textContent = `Artist: ${song.artist || 'Unknown Artist'} · Spotify`;
    if (song.duration) {
      currentTimeDisplay.textContent = '0:00';
      durationDisplay.textContent = `-${formatTime(song.duration)}`;
    }
  }


  /*
   * Playlist counter
   */

  if (playlistCount) {

    playlistCount.textContent =
      `${
        currentIndex + 1
      }/${playbackQueue.length}`;

  }


  updateActiveTrack();


  /*
   * Start playback.
   */

  if (isSpotifyTrack) {
    startSpotifyTrack(song).catch(error => {
      console.error('Could not start Spotify playback:', error);
      showPlaybackStatus(error.message || 'Spotify could not start playback.', 'error');
      setPlaybackVisualState(false);
    });
    return;
  }

  audio.play().catch(
    (error) => {

      console.error(
        'Could not play track:',
        error
      );

      const message = error.name === 'NotAllowedError'
        ? 'Playback was blocked by the system. Press Play to try again.'
        : error.name === 'NotSupportedError'
          ? 'This audio file format is not supported.'
          : error.message || 'PixelPlayer could not play this audio file.';
      showPlaybackStatus(message, 'error');
      setPlaybackVisualState(false);

    }
  );

}


/* =========================================================
   PLAY / PAUSE
   ========================================================= */

if (playButton) {

  playButton.addEventListener(
    'click',
    async () => {

      if (activePlaybackSource === 'spotify') {
        if (spotifyPlaybackPending) return;
        spotifyPlaybackPending = true;
        try {
          if (spotifyRemoteDeviceId) {
            const state = spotifyPlayerState ? null : await window.spotify.playbackState();
            const wasPlaying = spotifyPlayerState
              ? !spotifyPlayerState.paused
              : Boolean(state?.is_playing);
            const cachedPosition = Number(spotifyPlayerState?.position ?? state?.progress_ms) || 0;
            const position = cachedPosition + (spotifyPlayerState && !spotifyPlayerState.paused
              ? Math.max(0, Date.now() - spotifyStateUpdatedAt)
              : 0);
            if (wasPlaying) await window.spotify.pausePlayback(spotifyRemoteDeviceId);
            else await window.spotify.startPlayback(null, spotifyRemoteDeviceId);
            spotifyPlayerState = {
              ...(spotifyPlayerState || {}),
              position,
              paused: Boolean(wasPlaying),
            };
            spotifyStateUpdatedAt = Date.now();
            setPlaybackVisualState(!wasPlaying);
            updateSpotifyProgress();
            window.setTimeout(syncRemoteSpotifyState, 500);
            reactToAction();
            return;
          }

          if (isElectronRuntime()) {
            const selectedTrack = playbackQueue[currentIndex];
            if (!selectedTrack?.uri) throw new Error('Select a Spotify track first.');
            await startSpotifyTrack(selectedTrack);
            return;
          }

          if (!spotifyPlayer || !spotifyDeviceId) {
            const ready = await initializeSpotifySdk();
            if (!ready || !spotifyPlayer) throw new Error(spotifyPlaybackUnavailableMessage);
          }
          await spotifyPlayer.activateElement?.();
          await spotifyPlayer.togglePlay();
          reactToAction();
        } catch (error) {
          console.error('Could not toggle Spotify playback:', error);
          showPlaybackStatus(error.message || 'Spotify could not change playback.', 'error');
        } finally {
          spotifyPlaybackPending = false;
        }
        return;
      }

      if (!audio.src) {

        /*
         * No track loaded yet — start
         * the first song in the current
         * queue (or playlist) instead of
         * doing nothing.
         */

        const queue =
          playbackQueue.length
            ? playbackQueue
            : songs;

        if (!queue.length) {
          return;
        }

        playTrack(
          queue[0],
          0
        );

        return;

      }


      if (audio.paused) {

        try {

          await audio.play();
          reactToAction();

        } catch (error) {

          console.error(
            'Could not play audio:',
            error
          );

        }

      } else {

        audio.pause();
        reactToAction();

      }

    }
  );

}


/* =========================================================
   NEXT
   ========================================================= */

const nextButton =
  document.getElementById(
    'next-btn'
  );
const repeatButton = document.getElementById('repeat-btn');


if (nextButton) {

  nextButton.addEventListener(
    'click',
    () => {

      if (!playbackQueue.length) {
        return;
      }


      const nextIndex =
        (
          currentIndex + 1
        ) %
        playbackQueue.length;


      playTrack(
        playbackQueue[nextIndex],
        nextIndex
      );

    }
  );

}


/* =========================================================
   PREVIOUS
   ========================================================= */

const previousButton =
  document.getElementById(
    'previous-btn'
  );


if (previousButton) {

  previousButton.addEventListener(
    'click',
    async () => {

      if (!playbackQueue.length) {
        return;
      }

      if (activePlaybackSource === 'spotify' && spotifyPlayer) {
        const state = spotifyPlayerState;
        const position = (Number(state?.position) || 0) + (state?.paused ? 0 : Math.max(0, Date.now() - spotifyStateUpdatedAt));
        if (position > 3000) {
          try {
            await spotifyPlayer.seek(0);
            reactToAction();
            return;
          } catch (error) {
            console.warn('Could not restart the current Spotify track:', error);
          }
        }
      } else if (activePlaybackSource !== 'spotify' && audio.currentTime > 3) {
        audio.currentTime = 0;
        reactToAction();
        return;
      }


      const previousIndex =
        (
          currentIndex -
          1 +
          playbackQueue.length
        ) %
        playbackQueue.length;


      playTrack(
        playbackQueue[previousIndex],
        previousIndex
      );

    }
  );

}


/* =========================================================
   RANDOM
   ========================================================= */

const randomButton =
  document.getElementById(
    'random-btn'
  );


if (randomButton) {

  randomButton.addEventListener(
    'click',
    () => {

      if (playbackQueue.length < 2) {
        return;
      }


      let randomIndex =
        currentIndex;


      while (
        randomIndex === currentIndex
      ) {

        randomIndex =
          Math.floor(
            Math.random() *
            playbackQueue.length
          );

      }


      playTrack(
        playbackQueue[randomIndex],
        randomIndex
      );

    }
  );

}

function updateRepeatButton() {
  if (!repeatButton) return;
  const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
  repeatButton.title = `${labels[repeatMode]} (click to change)`;
  repeatButton.setAttribute('aria-label', labels[repeatMode]);
  repeatButton.setAttribute('aria-pressed', String(repeatMode > 0));
  repeatButton.classList.toggle('active', repeatMode > 0);
  repeatButton.classList.toggle('repeat-one', repeatMode === 2);
}

repeatButton?.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  updateRepeatButton();
  reactToAction();
});
updateRepeatButton();


/* =========================================================
   AUDIO PLAY EVENT
   ========================================================= */

audio.addEventListener(
  'play',
  () => {
    setPlaybackVisualState(true);
  }
);


/* =========================================================
   AUDIO PAUSE EVENT
   ========================================================= */

audio.addEventListener(
  'pause',
  () => {
    setPlaybackVisualState(false);
  }
);


/* =========================================================
   AUDIO ENDED
   ========================================================= */

audio.addEventListener(
  'ended',
  () => {
    setPlaybackVisualState(false);

    /*
     * Automatically play the next song.
     */

    if (playbackQueue.length) {

      if (repeatMode !== 1 && repeatMode !== 2 && currentIndex >= playbackQueue.length - 1) {
        return;
      }
      const nextIndex = repeatMode === 2
        ? currentIndex
        : (currentIndex + 1) % playbackQueue.length;


      playTrack(
        playbackQueue[nextIndex],
        nextIndex
      );

    }

  }
);


/* =========================================================
   AUDIO TIME UPDATE
   ========================================================= */

audio.addEventListener('timeupdate', () => {
    if (!audio.duration || !Number.isFinite(audio.duration)) return;

    const currentTime = audio.currentTime;
    const duration = audio.duration;

    const percentage =
        (currentTime / duration) * 100;

    // Move the progress / flower knob
    progress.style.width = `${percentage}%`;
    progressBar?.setAttribute('aria-valuenow', String(Math.round(percentage)));
    progressBar?.setAttribute('aria-valuetext', `${formatTime(currentTime)} of ${formatTime(duration)}`);

    // LEFT → elapsed time
    currentTimeDisplay.textContent =
        formatTime(currentTime);

    // RIGHT → remaining time
    const remainingTime = Math.max(0, duration - currentTime);

    durationDisplay.textContent =
        `-${formatTime(remainingTime)}`;
});


/* =========================================================
   AUDIO METADATA
   ========================================================= */

audio.addEventListener('loadedmetadata', () => {
    if (!audio.duration || !Number.isFinite(audio.duration)) {
        currentTimeDisplay.textContent = '00:00';
        durationDisplay.textContent = '--:--';
        return;
    }

    // Start of song
    currentTimeDisplay.textContent =
        '00:00';

    // Entire duration = remaining time initially
    durationDisplay.textContent =
        `-${formatTime(audio.duration)}`;
});


/* =========================================================
   AUDIO ERROR
   ========================================================= */

audio.addEventListener(
  'error',
  () => {

    console.error(
      'Audio playback error:',
      audio.error
    );

    if (activePlaybackSource !== 'spotify' && audio.error) {
      showPlaybackStatus('PixelPlayer could not read this audio file. Try another track or format.', 'error');
      setPlaybackVisualState(false);
    }

  }
);


/* =========================================================
   PROGRESS BAR SEEKING
   ========================================================= */

function seekFromProgressPointer(clientX, commit = false) {
  const bounds = progressBar.getBoundingClientRect();
  if (!bounds.width) return;
  const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));

  if (activePlaybackSource === 'spotify') {
    const duration = Number(spotifyPlayerState?.duration) || 0;
    if (!duration) return;
    const targetPosition = Math.round(ratio * duration);
    spotifyPlayerState = { ...spotifyPlayerState, position: targetPosition };
    spotifyStateUpdatedAt = Date.now();
    updateSpotifyProgress();
    if (!commit) return;

    const seek = spotifyRemoteDeviceId
      ? window.spotify.seekPlayback(targetPosition, spotifyRemoteDeviceId)
      : spotifyPlayer?.seek(targetPosition);
    Promise.resolve(seek).then(() => {
      if (spotifyRemoteDeviceId) window.setTimeout(syncRemoteSpotifyState, 500);
    }).catch(error => {
      showPlaybackStatus(error.message || 'Spotify could not seek in this track.', 'error');
    });
    return;
  }

  if (!audio.duration || !Number.isFinite(audio.duration)) return;
  audio.currentTime = ratio * audio.duration;
}

progressBar.setAttribute('role', 'slider');
progressBar.setAttribute('tabindex', '0');
progressBar.setAttribute('aria-valuemin', '0');
progressBar.setAttribute('aria-valuemax', '100');
progressBar.setAttribute('aria-valuenow', '0');
progressBar.setAttribute('aria-valuetext', '0:00 of 0:00');
progressBar.setAttribute('aria-label', 'Music progress. Use left and right arrow keys to seek.');
progressBar.addEventListener('pointerdown', event => {
  isSeekingProgress = true;
  progressBar.setPointerCapture?.(event.pointerId);
  seekFromProgressPointer(event.clientX);
});
progressBar.addEventListener('pointermove', event => {
  if (isSeekingProgress) seekFromProgressPointer(event.clientX);
});
progressBar.addEventListener('pointerup', event => {
  if (!isSeekingProgress) return;
  isSeekingProgress = false;
  seekFromProgressPointer(event.clientX, true);
});
progressBar.addEventListener('pointercancel', () => { isSeekingProgress = false; });
progressBar.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const duration = activePlaybackSource === 'spotify'
    ? Number(spotifyPlayerState?.duration) || 0
    : Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
  if (!duration) return;
  const current = activePlaybackSource === 'spotify'
    ? Number(spotifyPlayerState?.position) || 0
    : audio.currentTime * 1000;
  const target = event.key === 'Home' ? 0
    : event.key === 'End' ? duration
      : Math.max(0, Math.min(duration, current + (event.key === 'ArrowRight' ? 5000 : -5000)));
  if (activePlaybackSource === 'spotify') {
    seekFromProgressPointer(progressBar.getBoundingClientRect().left + progressBar.getBoundingClientRect().width * target / duration, true);
  } else {
    audio.currentTime = target / 1000;
  }
});


/* =========================================================
   JAMENDO SEARCH
   ========================================================= */

function closeSearchResults() {

  if (!searchResults) {
    return;
  }


  searchResults.hidden =
    true;


  searchResults.replaceChildren();


  if (searchInput) {

    searchInput.setAttribute(
      'aria-expanded',
      'false'
    );

  }

}


/* =========================================================
   SEARCH MESSAGE
   ========================================================= */

function showSearchMessage(
  message,
  type = ''
) {

  if (!searchResults) {
    return;
  }


  searchResults.replaceChildren();


  searchResults.hidden =
    false;


  searchInput.setAttribute(
    'aria-expanded',
    'true'
  );


  const messageEl =
    document.createElement(
      'div'
    );


  messageEl.className =
    `search-message ${type}`.trim();


  messageEl.textContent =
    message;


  searchResults.appendChild(
    messageEl
  );

}


/* =========================================================
   RENDER JAMENDO RESULTS
   ========================================================= */

function renderJamendoResults(
  results,
  providerName = 'Jamendo'
) {

  searchResults.replaceChildren();


  searchResults.hidden =
    false;


  searchInput.setAttribute(
    'aria-expanded',
    'true'
  );


  if (!results.length) {

    showSearchMessage(
      'No songs found. Try another search.'
    );

    return;

  }


  /*
   * Results heading
   */

  const heading =
    document.createElement(
      'div'
    );


  heading.className =
    'search-results-heading';


  heading.textContent =
    `${providerName} · ${results.length} results`;


  searchResults.appendChild(
    heading
  );


  /*
   * Each Jamendo track
   */

  results.forEach(
    (song, index) => {

      const item =
        document.createElement(
          'button'
        );


      item.type =
        'button';


      item.className =
        'search-result';


      item.setAttribute(
        'role',
        'option'
      );


      /*
       * Artwork
       */

      const artwork =
        document.createElement(
          'img'
        );


      artwork.src =
        song.picture ||
        'assets/decorations/Teddy.png';


      artwork.alt = '';


      artwork.loading =
        'lazy';
      artwork.addEventListener('error', () => {
        artwork.src = 'assets/decorations/Teddy.png';
      }, { once: true });


      /*
       * Track information
       */

      const info =
        document.createElement(
          'span'
        );


      info.className =
        'search-result-info';


      const title =
        document.createElement(
          'strong'
        );


      title.textContent =
        song.title ||
        'Unknown Track';


      const meta =
        document.createElement(
          'small'
        );


      meta.textContent =
        `${
          song.artist ||
          'Unknown Artist'
        } · ${
          song.album ||
          'Unknown Album'
        }`;


      info.append(
        title,
        meta
      );


      /*
       * Duration
       */

      const duration =
        document.createElement(
          'time'
        );


      duration.textContent =
        song.duration
          ? formatTime(
              song.duration
            )
          : '';


      /*
       * Play icon
       */

      const playIcon =
        document.createElement(
          'span'
        );


      playIcon.className =
        'search-play-icon';


      playIcon.textContent =
        '▶';


      playIcon.setAttribute(
        'aria-hidden',
        'true'
      );


      /*
       * Build result
       */

      item.append(
        artwork,
        info,
        duration,
        playIcon
      );


      /*
       * CLICK → PLAY
       */

      item.addEventListener(
        'click',
        () => {

          /*
           * Search results become
           * the temporary playback queue.
           */

          playbackQueue =
            results;


          playbackQueueSource = song.source || 'jamendo';


          songs =
            results;


          currentIndex =
            index;


          playTrack(
            song,
            index
          );


          /*
           * Close search dropdown.
           */

          closeSearchResults();


          searchInput.blur();

        }
      );


      searchResults.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   SEARCH JAMENDO
   ========================================================= */

async function searchJamendo(
  query
) {

  const cleanQuery =
    query.trim();


  /*
   * Empty search
   */

  if (!cleanQuery) {

    closeSearchResults();

    clearSearchBtn.hidden =
      true;

    return;

  }


  clearSearchBtn.hidden =
    false;


  /*
   * Initialize Jamendo
   * if necessary.
   */

  if (!jamendoReady) {

    const ready =
      await initializeJamendo();


    if (!ready) {

      showSearchMessage(
        'Online music search is not configured.',
        'error'
      );

      return;

    }

  }


  /*
   * Give every search request
   * a unique ID.
   *
   * This prevents old searches
   * from overwriting newer ones.
   */

  const requestId =
    ++latestSearchRequest;


  showSearchMessage(
    'Searching Jamendo...'
  );


  try {

    const response =
      await window.jamendo.search(
        cleanQuery
      );


    /*
     * Ignore an older request.
     */

    if (
      requestId !==
      latestSearchRequest
    ) {

      return;

    }


    if (response?.error) {

      console.error(
        'Jamendo search failed:',
        response.error
      );


      showSearchMessage(
        'Could not search Jamendo right now.',
        'error'
      );


      return;

    }


    renderJamendoResults(
      response?.results || []
    );

  } catch (error) {

    if (
      requestId !==
      latestSearchRequest
    ) {

      return;

    }


    console.error(
      'Jamendo search error:',
      error
    );


    showSearchMessage(
      'Could not search Jamendo right now.',
      'error'
    );

  }

}


async function searchSpotify(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return closeSearchResults();

  spotifySearchOffset = 0;
  spotifySearchResults = [];
  spotifySearchTotal = 0;
  const requestId = ++latestSearchRequest;
  await searchSpotifyPage(cleanQuery, 0, requestId);
}


async function searchSpotifyPage(query, offset, requestId = ++latestSearchRequest) {
  showSearchMessage(offset ? 'Loading more Spotify results...' : 'Searching all Spotify songs...');

  try {
    const response = await window.spotify.search(query, offset);
    if (requestId !== latestSearchRequest) return;
    if (response?.error) throw new Error(response.error);

    spotifySearchResults = offset
      ? spotifySearchResults.concat(response?.tracks || [])
      : (response?.tracks || []);
    spotifySearchOffset = Number(response?.nextOffset) || (offset + (response?.tracks || []).length);
    spotifySearchTotal = Number(response?.total) || 0;
    renderJamendoResults(spotifySearchResults, `Spotify - ${spotifySearchResults.length}/${spotifySearchTotal}`);

    if (response?.hasMore) {
      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'search-load-more';
      moreButton.textContent = 'Load more results';
      moreButton.addEventListener('click', () => searchSpotifyPage(query, spotifySearchOffset));
      searchResults.appendChild(moreButton);
    }
  } catch (error) {
    if (requestId !== latestSearchRequest) return;
    console.error('Spotify search failed:', error);
    showSearchMessage(error.message || 'Could not search Spotify right now.', 'error');
  }
}

/* =========================================================
   SEARCH INPUT
   ========================================================= */

if (searchInput) {

  searchInput.addEventListener(
    'input',
    () => {

      const query =
        searchInput.value;


      clearSearchBtn.hidden =
        !query.trim();


      window.clearTimeout(
        searchTimer
      );


      /*
       * If search is empty,
       * close the dropdown.
       */

      if (!query.trim()) {

        latestSearchRequest++;

        closeSearchResults();

        return;

      }


      /*
       * Small delay prevents
       * an API request on every
       * individual keystroke.
       */

      searchTimer =
        window.setTimeout(
          () => {

            (spotifyConnected ? searchSpotify : searchJamendo)(query);

          },
          350
        );

    }
  );


  /*
   * Re-open results when
   * search field gets focus.
   */

  searchInput.addEventListener(
    'focus',
    () => {

      if (
        searchInput.value.trim() &&
        searchResults.children.length
      ) {

        searchResults.hidden =
          false;


        searchInput.setAttribute(
          'aria-expanded',
          'true'
        );

      }

    }
  );

}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

if (clearSearchBtn) {

  clearSearchBtn.addEventListener(
    'click',
    () => {

      searchInput.value =
        '';


      clearSearchBtn.hidden =
        true;


      latestSearchRequest++;


      closeSearchResults();


      searchInput.focus();

    }
  );

}


/* =========================================================
   CLOSE SEARCH WHEN CLICKING
   * OUTSIDE SEARCH AREA
   ========================================================= */

if (searchSection) {

  document.addEventListener(
    'pointerdown',
    (event) => {

      if (
        !searchSection.contains(
          event.target
        )
      ) {

        closeSearchResults();

      }

    }
  );

}


/* =========================================================
   ESCAPE CLOSES SEARCH
   ========================================================= */

document.addEventListener(
  'keydown',
  (event) => {

    /* Familiar desktop shortcut for the prominent search bar. */
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      searchInput?.focus();
      return;
    }

    if (event.key === 'Escape') {

      closeSearchResults();

    }

  }
);

document.addEventListener('keydown', event => {
  const target = event.target;
  const isElement = target instanceof HTMLElement;
  const targetTag = isElement ? target.tagName : '';
  const editing = isElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
  if (editing || target === progressBar || event.ctrlKey || event.metaKey) return;

  if (event.altKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    setLibraryCollapsed(!document.body.classList.contains('library-collapsed'));
    return;
  }
  if (event.altKey && event.key.toLowerCase() === 'q') {
    event.preventDefault();
    setQueueCollapsed(!document.body.classList.contains('queue-collapsed'));
    return;
  }
  if (event.altKey) return;

  if (event.code === 'Space' && !['BUTTON', 'A'].includes(targetTag)) {
    event.preventDefault();
    playButton?.click();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    previousButton?.click();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextButton?.click();
  } else if (event.key.toLowerCase() === 'r') {
    randomButton?.click();
  } else if (event.key.toLowerCase() === 'm') {
    const currentVolume = Number(volumeControl.value);
    if (currentVolume > 0) {
      keyboardPreviousVolume = currentVolume;
      volumeControl.value = '0';
    } else {
      volumeControl.value = String(keyboardPreviousVolume || 1);
    }
    volumeControl.dispatchEvent(new Event('input', { bubbles: true }));
  }
});


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {

    return '0:00';

  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const remainingSeconds =
    Math.floor(
      seconds % 60
    );


  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;

}


/* =========================================================
   START JAMENDO
   ========================================================= */

/*
 * Initialize the online provider
 * when the application starts.
 *
 * This does NOT block the UI.
 */

initializeJamendo();
initializeSpotify();


/* =========================================================
   AMBIENT DUST MOTES
   ========================================================= */

function spawnDustMotes() {

  const container =
    document.getElementById('dust-motes');

  if (!container) return;

  for (let i = 0; i < 22; i++) {

    const mote =
      document.createElement('span');

    mote.style.left =
      `${Math.random() * 100}%`;

    mote.style.bottom =
      `${Math.random() * 40}%`;

    mote.style.animationDuration =
      `${6 + Math.random() * 4}s`;

    mote.style.animationDelay =
      `${Math.random() * 6}s`;

    mote.style.setProperty('--mote-size', `${1 + Math.random() * 3}px`);
    mote.style.setProperty('--mote-drift', `${-18 + Math.random() * 36}px`);
    if (i % 5 === 0) mote.classList.add('dust-bubble');

    container.appendChild(mote);

  }

}

spawnDustMotes();


/* =========================================================
   CABIN SCENE SIZING
   ========================================================= */

/*
 * room_morning.png is a fixed 1672 × 941 piece of art, and its
 * bed and seated-girl overlays use percentages of that same box —
 * so the box
 * itself never resizes. Instead we scale + center the WHOLE box
 * with a CSS transform, "cover" style: scaled up just enough that
 * it fully fills the available space with no gaps, cropping only
 * the excess. Since the art and every sprite are children of the
 * same box, they all scale together and can never drift apart.
 */

const roomSceneWrap =
  document.getElementById('room-scene-wrap');

const roomScene =
  document.getElementById('room-scene');

const CABIN_SCENE_NATIVE_WIDTH = 1672;
const CABIN_SCENE_NATIVE_HEIGHT = 941;

function sizeCabinScene() {

  if (!roomSceneWrap || !roomScene) return;

  const availableWidth =
    roomSceneWrap.clientWidth;

  const availableHeight =
    roomSceneWrap.clientHeight;

  if (!availableWidth || !availableHeight) return;

  const scale = Math.max(
    availableWidth / CABIN_SCENE_NATIVE_WIDTH,
    availableHeight / CABIN_SCENE_NATIVE_HEIGHT
  );

  const scaledWidth = CABIN_SCENE_NATIVE_WIDTH * scale;
  const scaledHeight = CABIN_SCENE_NATIVE_HEIGHT * scale;

  const offsetX = (availableWidth - scaledWidth) / 2;
  const offsetY = (availableHeight - scaledHeight) / 2;

  roomScene.style.transform =
    `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

}

window.addEventListener('resize', sizeCabinScene);

if (window.ResizeObserver && roomSceneWrap) {
  new ResizeObserver(sizeCabinScene).observe(roomSceneWrap);
}

sizeCabinScene();


/* =========================================================
   ROOM TIME-OF-DAY THEMES
   ========================================================= */

const roomThemes = {
  morning: {
    label: 'Morning',
    room: 'assets/morning/room_morning.png',
    bed: 'assets/morning/bed_morning.png',
    girl: 'assets/morning/girl_sitting_morning.png'
  },
  afternoon: {
    label: 'Afternoon',
    room: 'assets/themes/room/room_afternoon.png',
    bed: 'assets/morning/bed_morning.png',
    girl: 'assets/morning/girl_sitting_morning.png'
  },
  evening: {
    label: 'Evening',
    room: 'assets/themes/room/room_evening.png',
    bed: 'assets/themes/furniture/bed_evening.png',
    girl: 'assets/themes/girl/girl_sitting_evening.png'
  },
  night: {
    label: 'Night',
    room: 'assets/themes/room/room_night.png',
    bed: 'assets/themes/furniture/bed_night.png',
    girl: 'assets/themes/girl/girl_sitting_night.png'
  }
};

const roomThemePicker = document.getElementById('room-theme-picker');
const roomThemeImages = {
  room: roomScene?.querySelector('.room-scene-bg'),
  bed: roomScene?.querySelector('.room-bed'),
  girl: roomScene?.querySelector('.room-girl')
};

let roomThemeRequest = 0;

function preloadRoomTheme(theme) {
  return Promise.all(Object.values(roomThemes[theme]).filter(value => typeof value === 'string' && value.includes('.png')).map(source => new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = source;
    if (image.complete) resolve();
  })));
}

function dissolveRoomThemeLayers() {
  if (!roomScene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  Object.values(roomThemeImages).forEach(image => {
    if (!image || !image.complete || !image.naturalWidth) return;

    const previous = image.cloneNode(false);
    const computed = getComputedStyle(image);
    previous.removeAttribute('id');
    previous.setAttribute('aria-hidden', 'true');
    previous.alt = '';
    previous.classList.remove('theme-art-enter');
    previous.classList.add('theme-transition-old');
    ['position', 'left', 'right', 'top', 'bottom', 'width', 'height', 'zIndex', 'objectFit', 'transform', 'transformOrigin', 'translate', 'scale'].forEach(property => {
      previous.style[property] = computed[property];
    });
    previous.style.animation = 'none';
    roomScene.append(previous);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => previous.classList.add('is-fading'));
    });
    const removePrevious = () => previous.remove();
    previous.addEventListener('transitionend', removePrevious, { once: true });
    window.setTimeout(removePrevious, 1100);
  });
}

async function setRoomTheme(themeName, persist = true) {
  const theme = roomThemes[themeName] ? themeName : 'morning';
  const assets = roomThemes[theme];
  const request = ++roomThemeRequest;

  await preloadRoomTheme(theme);
  if (request !== roomThemeRequest) return;

  const hasChangedArt = Object.entries(roomThemeImages).some(([part, image]) => image && image.getAttribute('src') !== assets[part]);
  if (hasChangedArt) dissolveRoomThemeLayers();

  Object.entries(roomThemeImages).forEach(([part, image]) => {
    if (!image || image.getAttribute('src') === assets[part]) return;
    image.src = assets[part];
  });

  if (roomScene) roomScene.dataset.theme = theme;
  if (roomThemeImages.room) roomThemeImages.room.alt = `${roomThemes[theme].label} music room`;
  document.querySelectorAll('[data-room-theme]').forEach(button => {
    const selected = button.dataset.roomTheme === theme;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  if (persist) {
    try {
      localStorage.setItem('pixelplayer-room-theme', theme);
    } catch (error) {
      console.warn('Could not save the selected room theme:', error.message);
    }
  }
}

roomThemePicker?.addEventListener('click', event => {
  const button = event.target.closest('[data-room-theme]');
  if (button) setRoomTheme(button.dataset.roomTheme);
});

let savedRoomTheme = 'morning';
try {
  savedRoomTheme = localStorage.getItem('pixelplayer-room-theme') || 'morning';
} catch (error) {
  console.warn('Could not read the saved room theme:', error.message);
}
setRoomTheme(savedRoomTheme, false);


/* =========================================================
   CABIN CALIBRATION HELPER  (Ctrl+Shift+K to toggle)
   Click a sprite, nudge it with arrow keys (0.1%, Shift = 1%),
   then copy the left/top values it prints into style.css.
   ========================================================= */
(function () {
  let selected = null;
  let readout = null;

  function show() {
    if (!selected || !readout) return;
    readout.textContent =
      `${selected.className.replace('room-overlay', '').replace('calib-selected', '').trim()}  ` +
      `left: ${selected.style.left || getComputedStyle(selected).left}; ` +
      `top: ${selected.style.top || getComputedStyle(selected).top};`;
    console.log(readout.textContent);
  }

  function toPercent(el) {
    const scene = document.getElementById('room-scene');
    const w = scene.offsetWidth, h = scene.offsetHeight;
    el.style.left = (el.offsetLeft / w * 100).toFixed(1) + '%';
    el.style.top = (el.offsetTop / h * 100).toFixed(1) + '%';
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
      const on = document.body.classList.toggle('calibrating');
      if (on) {
        readout = document.createElement('div');
        readout.id = 'calib-readout';
        readout.textContent = 'Calibration: click a sprite, then use arrow keys';
        document.body.appendChild(readout);
      } else if (readout) {
        readout.remove(); readout = null;
        if (selected) selected.classList.remove('calib-selected');
        selected = null;
      }
      return;
    }
    if (!document.body.classList.contains('calibrating') || !selected) return;
    const step = e.shiftKey ? 1 : 0.1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (!selected.style.left) toPercent(selected);
    selected.style.left = (parseFloat(selected.style.left) + d[0]).toFixed(1) + '%';
    selected.style.top = (parseFloat(selected.style.top) + d[1]).toFixed(1) + '%';
    show();
  });

  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('calibrating')) return;
    const el = e.target.closest && e.target.closest('.room-overlay');
    if (!el) return;
    if (selected) selected.classList.remove('calib-selected');
    selected = el;
    selected.classList.add('calib-selected');
    show();
  });
})();


/* =========================================================
   INITIAL IDLE STATE
   ========================================================= */

/*
 * On startup there is no song selected yet.
 * Force the player into a clean idle state
 * instead of trusting whatever happened to
 * be sitting in the HTML.
 */

function resetPlayerToIdle() {

  audio.pause();

  audio.removeAttribute('src');

  audio.load();


  if (progress) {
    progress.style.width = '0%';
  }

  if (currentTimeDisplay) {
    currentTimeDisplay.textContent = '00:00';
  }

  if (durationDisplay) {
    durationDisplay.textContent = '--:--';
  }

  if (nowPlayingTitle) {
    nowPlayingTitle.textContent = 'No song selected';
  }

  if (sidebarNowTitle) sidebarNowTitle.textContent = 'No song selected';
  if (sidebarNowArt) sidebarNowArt.src = 'assets/cabin/background-clean.png';

  if (nowPlayingArtist) {
    nowPlayingArtist.textContent = 'Choose a song to begin';
  }

}

resetPlayerToIdle();
