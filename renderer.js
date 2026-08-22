const chooseFolderBtn = document.getElementById('choose-folder-btn');
const trackList = document.getElementById('track-list');
const audio = document.getElementById('audio');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingArt = document.getElementById('now-playing-art');

chooseFolderBtn.addEventListener('click', async () => {
  const folder = await window.library.chooseFolder();
  if (!folder) return;

  const songs = await window.library.scanLibrary();
  renderTrackList(songs);
});

function renderTrackList(songs) {
  trackList.innerHTML = '';

  if (songs.length === 0) {
    trackList.innerHTML = '<li class="empty">No audio files found in that folder.</li>';
    return;
  }

  songs.forEach((song) => {
    const li = document.createElement('li');
    li.className = 'track';
    li.textContent = `${song.title} — ${song.artist}`;
    li.addEventListener('click', () => playTrack(song));
    trackList.appendChild(li);
  });
}

function playTrack(song) {
  audio.src = song.src; // pixel-player:// URL, resolved safely in the main process
  audio.play();
  nowPlayingTitle.textContent = song.title;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingArt.src = song.picture || '';
}
