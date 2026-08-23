const chooseFolderBtn = document.getElementById('choose-folder-btn');
const trackList = document.getElementById('track-list');
const audio = document.getElementById('audio');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingArt = document.getElementById('now-playing-art');
const albumArtContainer = document.querySelector('.album-art-container');
const playButton = document.getElementById('play-btn');
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time-display');
const durationDisplay = document.getElementById('duration-display');
const emptyAction = document.querySelector('.empty-action');
const playlistButtons = document.querySelectorAll('.playlist-item[data-playlist]');
const allPlaylistButtons = document.querySelectorAll('.playlist-item');
const playlistNav = document.querySelector('.playlist-nav');
const playlistTitle = document.querySelector('.current-playlist h2');
const playlistCount = document.getElementById('playlist-count');
let songs = [];
let currentIndex = -1;
let selectedPlaylist = 'playlist-1';
const playlistSongs = new Map();

async function chooseMusicFolder() {
  const folder = await window.library.chooseFolder();
  if (!folder) return;

  songs = await window.library.scanLibrary();
  playlistSongs.set(selectedPlaylist, songs);
  renderTrackList(songs);
}

chooseFolderBtn.addEventListener('click', chooseMusicFolder);
emptyAction.addEventListener('click', chooseMusicFolder);

playlistButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedPlaylist = button.dataset.playlist;
    songs = playlistSongs.get(selectedPlaylist) || [];
    currentIndex = -1;

    playlistButtons.forEach((playlistButton) => {
      playlistButton.classList.toggle('active', playlistButton === button);
    });

    const playlistName = button.querySelector('span').textContent;
    const playlistIcon = button.querySelector('img').cloneNode(true);
    playlistTitle.replaceChildren(playlistIcon, document.createTextNode(` ${playlistName}`));
    playlistCount.textContent = songs.length ? `0/${songs.length}` : '0/0';
    renderTrackList(songs);
  });
});

playlistNav.addEventListener('pointermove', (event) => {
  allPlaylistButtons.forEach((button) => {
    const bounds = button.getBoundingClientRect();
    const distance = Math.abs(event.clientY - (bounds.top + bounds.height / 2));
    const influence = Math.max(0, 1 - distance / 105);
    button.style.setProperty('--dock-scale', (1 + influence * 0.08).toFixed(3));
  });
});

playlistNav.addEventListener('pointerleave', () => {
  allPlaylistButtons.forEach((button) => {
    button.style.removeProperty('--dock-scale');
  });
});

function renderTrackList(songs) {
  trackList.innerHTML = '';

  if (songs.length === 0) {
    trackList.innerHTML = `
      <li class="empty">
        <img src="assets/decorations/Toadstool.png" alt="">
        <strong>This playlist is empty</strong>
        <span>No audio files were found in that folder.</span>
        <button class="empty-action" type="button">Choose another folder</button>
      </li>`;
    trackList.querySelector('.empty-action').addEventListener('click', chooseMusicFolder);
    return;
  }

  playlistCount.textContent = `${currentIndex >= 0 ? currentIndex + 1 : 0}/${songs.length}`;

  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.className = 'track';
    li.dataset.index = index;
    const artwork = document.createElement('img');
    artwork.src = song.picture || 'assets/background/background.png';
    artwork.alt = '';
    const details = document.createElement('span');
    details.className = 'track-details';
    details.innerHTML = `<strong>${song.title}</strong><small>Artist: ${song.artist}</small>`;
    const duration = document.createElement('time');
    duration.textContent = song.duration ? formatTime(song.duration) : '';
    li.append(artwork, details, duration);
    li.addEventListener('click', () => playTrack(song, index));
    trackList.appendChild(li);
  });
}

function updateActiveTrack() {
  document.querySelectorAll('.track').forEach((track) => {
    track.classList.remove('playing');
  });

  if (currentIndex < 0) return;

  const activeTrack = document.querySelector(
    `.track[data-index="${currentIndex}"]`
  );

  if (activeTrack) activeTrack.classList.add('playing');
}

function playTrack(song, index = -1) {
  currentIndex = index;
  audio.src = song.src; // pixel-player:// URL, resolved safely in the main process
  audio.play().catch(() => {});
  nowPlayingTitle.textContent = song.title;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingArt.src = song.picture || 'assets/background/background.png';
  playlistCount.textContent = `${currentIndex + 1}/${songs.length}`;
  updateActiveTrack();
}

playButton.addEventListener('click', async () => {
  if (!audio.src) return;

  if (audio.paused) {
    try {
      await audio.play();
    } catch (error) {
      console.error('Could not play audio:', error);
    }
  } else {
    audio.pause();
  }
});

audio.addEventListener('play', () => {
  albumArtContainer.classList.add('is-playing');
  playButton.innerHTML = '<span class="pause-glyph" aria-hidden="true">||</span>';
  playButton.setAttribute('aria-label', 'Pause');
});

audio.addEventListener('pause', () => {
  albumArtContainer.classList.remove('is-playing');
  playButton.innerHTML = '<img src="assets/player/play.png" alt="Play">';
  playButton.setAttribute('aria-label', 'Play');
});

audio.addEventListener('ended', () => {
  albumArtContainer.classList.remove('is-playing');
  playButton.innerHTML = '<img src="assets/player/play.png" alt="Play">';
  playButton.setAttribute('aria-label', 'Play');
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (!songs.length) return;
  playTrack(songs[(currentIndex + 1) % songs.length], (currentIndex + 1) % songs.length);
});

document.getElementById('previous-btn').addEventListener('click', () => {
  if (!songs.length) return;
  const index = (currentIndex - 1 + songs.length) % songs.length;
  playTrack(songs[index], index);
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  currentTimeDisplay.textContent = formatTime(audio.currentTime);
});
audio.addEventListener('loadedmetadata', () => { durationDisplay.textContent = formatTime(audio.duration); });
audio.addEventListener('ended', () => document.getElementById('next-btn').click());
progressBar.addEventListener('click', (event) => {
  if (!audio.duration) return;
  const bounds = progressBar.getBoundingClientRect();
  audio.currentTime = ((event.clientX - bounds.left) / bounds.width) * audio.duration;
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
