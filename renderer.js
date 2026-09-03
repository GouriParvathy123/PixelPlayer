const chooseFolderBtn = document.getElementById('choose-folder-btn');
const trackList = document.getElementById('track-list');
const audio = document.getElementById('audio');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingArt = document.getElementById('now-playing-art');
const albumArtContainer = document.querySelector('.album-art-container');
const sidebarTurntable = document.getElementById('sidebar-turntable');
const playButton = document.getElementById('play-btn');
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time-display');
const durationDisplay = document.getElementById('duration-display');
const playlistButtons = document.querySelectorAll('.playlist-item[data-playlist]');
const allPlaylistButtons = document.querySelectorAll('.playlist-item');
const playlistNav = document.querySelector('.playlist-nav');
const playlistTitle = document.querySelector('.current-playlist h2');
const playlistCount = document.getElementById('playlist-count');
const currentFolderName = document.getElementById('current-folder-name');

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
let selectedPlaylist = 'playlist-1';
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
    chooseMusicFolder
  );
}


const initialEmptyAction =
  document.querySelector('.empty-action');

if (initialEmptyAction) {
  initialEmptyAction.addEventListener(
    'click',
    chooseMusicFolder
  );
}


/* =========================================================
   PLAYLIST BUTTONS
   ========================================================= */

playlistButtons.forEach((button) => {

  button.addEventListener('click', () => {

    selectedPlaylist =
      button.dataset.playlist;

    songs =
      playlistSongs.get(selectedPlaylist) || [];

    currentIndex = -1;

    playbackQueue = songs;
    playbackQueueSource = 'local';


    playlistButtons.forEach(
      (playlistButton) => {

        playlistButton.classList.toggle(
          'active',
          playlistButton === button
        );

      }
    );


    const folderName =
      folderNames.get(selectedPlaylist) ||
      button.querySelector('span')?.textContent ||
      'Music Folder';

    const icon =
      button.querySelector('img');


    if (icon) {

      const playlistIcon =
        icon.cloneNode(true);

      if (currentFolderName) {
        currentFolderName.textContent =
          folderName;
      }

      if (playlistTitle) {

        playlistTitle.replaceChildren(
          playlistIcon,
          document.createTextNode(
            ` ${folderName}`
          )
        );

      }

    } else {

      if (currentFolderName) {
        currentFolderName.textContent =
          folderName;
      }

    }


    if (playlistCount) {

      playlistCount.textContent =
        songs.length
          ? `0/${songs.length}`
          : '0/0';

    }

    trackList.classList.add('switching');

    setTimeout(() => {

      renderTrackList(songs);

      trackList.classList.remove('switching');

    }, 140);

  });

});


/* =========================================================
   PLAYLIST HOVER EFFECT
   ========================================================= */

if (playlistNav) {

  playlistNav.addEventListener(
    'pointermove',
    (event) => {

      allPlaylistButtons.forEach(
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

      allPlaylistButtons.forEach(
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
          src="assets/decorations/Toadstool.png"
          alt=""
        >

        <strong>
          This playlist is empty
        </strong>

        <span>
          No audio files were found in that folder.
        </span>

        <button
          class="empty-action"
          type="button"
        >
          Choose another folder
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


    playButton.innerHTML =
      '<img src="assets/player/pause.png" alt="Pause">';


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


    playButton.innerHTML =
      '<img src="assets/player/play.png" alt="Play">';


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


    playButton.innerHTML =
      '<img src="assets/player/play.png" alt="Play">';


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

  for (let i = 0; i < 8; i++) {

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

    container.appendChild(mote);

  }

}

spawnDustMotes();


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

  if (nowPlayingArtist) {
    nowPlayingArtist.textContent = 'Choose a song to begin';
  }

}

resetPlayerToIdle();
