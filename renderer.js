const chooseFolderBtn = document.getElementById('choose-folder-btn');
const trackList = document.getElementById('track-list');
const audio = document.getElementById('audio');
const volumeControl = document.getElementById('volume-control');
volumeControl.addEventListener('input', () => { audio.volume = Number(volumeControl.value); });
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingArt = document.getElementById('now-playing-art');
const sidebarNowArt = document.getElementById('sidebar-now-art');
const sidebarNowTitle = document.getElementById('sidebar-now-title');
const albumArtContainer = document.querySelector('.album-art-container');
const sidebarTurntable = document.getElementById('sidebar-turntable');
const playButton = document.getElementById('play-btn');
const playButtonImage = playButton.querySelector('img');
function setPlayButtonArtwork(playing) {
  playButtonImage.src = playing ? 'assets/player/pause.png' : 'assets/player/play.png';
  const label = playing ? 'Pause' : 'Play';
  playButton.setAttribute('aria-label', label);
  playButton.setAttribute('title', label);
}
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time-display');
const durationDisplay = document.getElementById('duration-display');
const playlistNav = document.querySelector('.playlist-nav');
const playlistTitle = document.querySelector('.current-playlist h2');
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


function openPlaylistDialog() {
  playlistNameInput.value = '';
  playlistDialog.showModal();
  requestAnimationFrame(() => playlistNameInput.focus());
}


function renderPlaylistButtons() {
  playlistNav.querySelectorAll('.playlist-item[data-playlist]').forEach(button => button.remove());
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


function selectPlaylist(button) {
  selectedPlaylist = button.dataset.playlist;
  songs = playlistSongs.get(selectedPlaylist) || [];
  currentIndex = -1;
  playbackQueue = songs;
  playbackQueueSource = 'local';

  playlistNav.querySelectorAll('.playlist-item[data-playlist]').forEach(item => {
    item.classList.toggle('active', item === button);
  });

  const name = folderNames.get(selectedPlaylist) || button.querySelector('span')?.textContent || 'Music Folder';
  const icon = button.querySelector('img, .playlist-symbol')?.cloneNode(true);
  currentFolderName.textContent = name;
  if (icon) playlistTitle.replaceChildren(icon, document.createTextNode(` ${name}`));
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
  playlistTitle.replaceChildren(document.createTextNode('Your music room'));
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
        'assets/background/background.png';

      artwork.alt = '';

      artwork.loading = 'lazy';


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


      /* Jamendo badge */

      if (song.source === 'jamendo') {

        const badge =
          document.createElement('span');

        badge.className =
          'online-badge';

        badge.textContent =
          'ONLINE';

        li.appendChild(badge);

      }


      /* Click to play */

      li.addEventListener(
        'click',
        () => {

          playbackQueue =
            trackArray;

          playbackQueueSource =
            song.source === 'jamendo'
              ? 'jamendo'
              : 'local';

          playTrack(
            song,
            index
          );

        }
      );


      trackList.appendChild(li);

    }
  );

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


/* =========================================================
   PLAY TRACK
   ========================================================= */

function playTrack(
  song,
  index = -1
) {

  const source =
    getTrackSource(song);


  if (!source) {

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

  if (song.source === 'jamendo') {

    playbackQueueSource =
      'jamendo';

  } else {

    playbackQueueSource =
      'local';

  }


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

  audio.src = source;

  audio.load();


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

  audio.play().catch(
    (error) => {

      console.error(
        'Could not play track:',
        error
      );

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

        } catch (error) {

          console.error(
            'Could not play audio:',
            error
          );

        }

      } else {

        audio.pause();

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
    () => {

      if (!playbackQueue.length) {
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


/* =========================================================
   AUDIO PLAY EVENT
   ========================================================= */

audio.addEventListener(
  'play',
  () => {

    if (albumArtContainer) {

      albumArtContainer.classList.add(
        'is-playing'
      );

    }

    if (sidebarTurntable) {
      sidebarTurntable.classList.add('is-playing');
    }
    document.body.classList.add('is-playing');


    setPlayButtonArtwork(true);


    playButton.setAttribute(
      'aria-label',
      'Pause'
    );


    playButton.setAttribute(
      'title',
      'Pause'
    );

  }
);


/* =========================================================
   AUDIO PAUSE EVENT
   ========================================================= */

audio.addEventListener(
  'pause',
  () => {

    if (albumArtContainer) {

      albumArtContainer.classList.remove(
        'is-playing'
      );

    }

    if (sidebarTurntable) {
      sidebarTurntable.classList.remove('is-playing');
    }
    document.body.classList.remove('is-playing');


    setPlayButtonArtwork(false);


    playButton.setAttribute(
      'aria-label',
      'Play'
    );


    playButton.setAttribute(
      'title',
      'Play'
    );

  }
);


/* =========================================================
   AUDIO ENDED
   ========================================================= */

audio.addEventListener(
  'ended',
  () => {

    if (albumArtContainer) {

      albumArtContainer.classList.remove(
        'is-playing'
      );

    }

    if (sidebarTurntable) {
      sidebarTurntable.classList.remove('is-playing');
    }


    setPlayButtonArtwork(false);


    playButton.setAttribute(
      'aria-label',
      'Play'
    );


    playButton.setAttribute(
      'title',
      'Play'
    );


    /*
     * Automatically play the next song.
     */

    if (playbackQueue.length) {

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

  }
);


/* =========================================================
   PROGRESS BAR SEEKING
   ========================================================= */

progressBar.addEventListener(
  'click',
  (event) => {

    if (
      !audio.duration ||
      !Number.isFinite(
        audio.duration
      )
    ) {

      return;

    }


    const bounds =
      progressBar.getBoundingClientRect();


    const position =
      Math.min(
        1,
        Math.max(
          0,
          (
            event.clientX -
            bounds.left
          ) /
          bounds.width
        )
      );


    audio.currentTime =
      position *
      audio.duration;

  }
);


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
  results
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
    `Jamendo · ${results.length} results`;


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
        'assets/background/background.png';


      artwork.alt = '';


      artwork.loading =
        'lazy';


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


          playbackQueueSource =
            'jamendo';


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

            searchJamendo(
              query
            );

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
 * background-clean.png is a fixed 1672 × 941 piece of art, and
 * every girl/pet/curtains/fireplace/lantern/lights sprite is
 * positioned as a % of that same 1672 × 941 box — so the box
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
      `${selected.className.replace('cabin-sprite', '').replace('calib-selected', '').trim()}  ` +
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
    const el = e.target.closest && e.target.closest('.cabin-sprite');
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
