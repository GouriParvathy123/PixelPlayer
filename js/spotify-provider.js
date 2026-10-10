const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { shell, safeStorage } = require('electron');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const REDIRECT_URI = 'http://127.0.0.1:43827/callback';
const REFRESH_TOKEN_FILE = 'spotify-refresh-token.bin';

function base64Url(buffer) {
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

class SpotifyProvider {
  constructor(clientId, userDataPath) {
    this.clientId = String(clientId || '').trim();
    this.userDataPath = userDataPath;
    this.refreshTokenPath = path.join(userDataPath, REFRESH_TOKEN_FILE);
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.refreshToken = null;
    this.pendingLogin = null;
  }

  isConfigured() {
    return Boolean(this.clientId);
  }

  async connect() {
    if (!this.isConfigured()) {
      throw new Error('Add SPOTIFY_CLIENT_ID to the project .env file first.');
    }
    if (this.pendingLogin) {
      throw new Error('Spotify sign-in is already in progress.');
    }

    const verifier = base64Url(crypto.randomBytes(64));
    const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
    const state = base64Url(crypto.randomBytes(24));
    const scope = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-library-read',
      'playlist-read-private',
      'playlist-read-collaborative',
    ].join(' ');

    const authorizeUrl = new URL(SPOTIFY_AUTH_URL);
    authorizeUrl.search = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    }).toString();

    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (server.listening) server.close();
        this.pendingLogin = null;
        if (error) reject(error);
        else resolve(result);
      };

      const server = http.createServer(async (request, response) => {
        const callbackUrl = new URL(request.url, REDIRECT_URI);
        if (callbackUrl.pathname !== '/callback') {
          response.writeHead(404).end('Not found');
          return;
        }

        if (callbackUrl.searchParams.get('state') !== state) {
          response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<h2>Spotify sign-in could not be verified.</h2>You can close this tab.');
          finish(new Error('Spotify sign-in state did not match. Please try again.'));
          return;
        }

        const oauthError = callbackUrl.searchParams.get('error');
        if (oauthError) {
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<h2>Spotify sign-in was cancelled.</h2>You can close this tab and return to PixelPlayer.');
          finish(new Error(`Spotify authorization failed: ${oauthError}`));
          return;
        }

        const code = callbackUrl.searchParams.get('code');
        if (!code) {
          response.writeHead(400).end('Authorization code missing.');
          finish(new Error('Spotify did not return an authorization code.'));
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<h2>Spotify connected.</h2>You can close this tab and return to PixelPlayer.');

        try {
          const tokenData = await this.exchangeCode(code, verifier);
          this.acceptTokenData(tokenData);
          this.persistRefreshToken();
          const profile = await this.request('/v1/me');
          finish(null, {
            success: true,
            profile: this.normalizeProfile(profile),
          });
        } catch (error) {
          finish(error);
        }
      });

      const timeout = setTimeout(() => {
        finish(new Error('Spotify sign-in timed out. Please try again.'));
      }, 3 * 60 * 1000);

      this.pendingLogin = {
        server,
        cancel: () => finish(new Error('Spotify sign-in was cancelled.')),
      };
      server.once('error', error => {
        finish(new Error(`Could not start the Spotify sign-in callback: ${error.message}`));
      });
      server.listen(43827, '127.0.0.1', () => {
        shell.openExternal(authorizeUrl.toString()).catch(error => {
          finish(new Error(`Could not open Spotify sign-in: ${error.message}`));
        });
      });
    });
  }

  async getProfile() {
    const token = await this.getAccessToken();
    if (!token) return null;
    return this.normalizeProfile(await this.request('/v1/me'));
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (!this.refreshToken) this.refreshToken = this.readRefreshToken();
    if (!this.refreshToken) return null;

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
      }),
    });
    const tokenData = await response.json();
    if (!response.ok) {
      this.clearStoredRefreshToken();
      throw new Error(tokenData.error_description || 'Spotify session expired. Please reconnect.');
    }

    this.acceptTokenData(tokenData);
    if (tokenData.refresh_token) this.persistRefreshToken();
    return this.accessToken;
  }

  async getLikedTracks() {
    const data = await this.request('/v1/me/tracks?limit=50');
    return (data.items || [])
      .map(item => item.track)
      .filter(track => track && track.uri && track.type === 'track' && track.is_playable !== false)
      .map(track => this.normalizeTrack(track));
  }

  async getPlaylists() {
    const playlists = [];
    let offset = 0;
    let total = 0;

    do {
      const params = new URLSearchParams({ limit: '50', offset: String(offset) });
      const data = await this.request(`/v1/me/playlists?${params.toString()}`);
      total = Number(data.total) || 0;
      playlists.push(...(data.items || []).filter(item => item?.id).map(item => ({
        id: item.id,
        uri: item.uri,
        name: item.name || 'Untitled playlist',
        picture: item.images?.[0]?.url || null,
        total: Number(item.items?.total ?? item.tracks?.total) || 0,
      })));
      offset += (data.items || []).length;
      if (!data.next || !data.items?.length) break;
    } while (offset < total);

    return playlists;
  }

  async getPlaylistTracks(playlistId) {
    const tracks = [];
    let offset = 0;
    let total = 0;

    do {
      const params = new URLSearchParams({ limit: '50', offset: String(offset) });
      const data = await this.request(`/v1/playlists/${encodeURIComponent(playlistId)}/items?${params.toString()}`);
      total = Number(data.total) || 0;
      for (const entry of data.items || []) {
        const track = entry?.item || entry?.track;
        if (track && track.type === 'track' && track.uri && track.is_playable !== false) {
          tracks.push(this.normalizeTrack(track));
        }
      }
      offset += (data.items || []).length;
      if (!data.next || !data.items?.length) break;
    } while (offset < total);

    return tracks;
  }

  async searchTracks(query, offset = 0) {
    // Spotify's February 2026 Web API change capped Search results at 10 per page.
    const params = new URLSearchParams({ q: query, type: 'track', limit: '10', offset: String(offset) });
    const data = await this.request(`/v1/search?${params.toString()}`);
    const page = data.tracks || {};
    const items = page.items || [];
    const tracks = items
      .filter(track => track?.uri && track.is_playable !== false)
      .map(track => this.normalizeTrack(track));
    const nextOffset = Number(page.offset || 0) + items.length;
    return {
      tracks,
      total: Number(page.total) || 0,
      nextOffset,
      hasMore: Boolean(page.next) && nextOffset < 1000,
    };
  }

  async transferPlayback(deviceId) {
    if (!deviceId) throw new Error('Spotify player is still connecting. Try again in a moment.');
    await this.request('/v1/me/player', {
      method: 'PUT',
      body: { device_ids: [deviceId], play: false },
    });
  }

  async getAvailableDevices() {
    try {
      const data = await this.request('/v1/me/player/devices');
      return data.devices || [];
    } catch (error) {
      if (/403|forbidden|not allowed/i.test(error.message)) {
        throw new Error('Spotify denied playback access for this account. Add this Spotify account under PixelPlayer > Settings > User Management, confirm the app owner has Premium, then reconnect Spotify.');
      }
      throw error;
    }
  }

  async getPlaybackState() {
    return this.request('/v1/me/player');
  }

  async startPlayback(uri, deviceId) {
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    await this.request(`/v1/me/player/play?${params.toString()}`, {
      method: 'PUT',
      ...(uri ? { body: { uris: [uri] } } : {}),
    });
  }

  async pausePlayback(deviceId) {
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    await this.request(`/v1/me/player/pause?${params.toString()}`, { method: 'PUT' });
  }

  async seekPlayback(positionMs, deviceId) {
    const params = new URLSearchParams({ position_ms: String(Math.max(0, Math.round(positionMs))) });
    if (deviceId) params.set('device_id', deviceId);
    await this.request(`/v1/me/player/seek?${params.toString()}`, { method: 'PUT' });
  }

  async skipPlayback(direction, deviceId) {
    const endpoint = direction === 'previous' ? 'previous' : 'next';
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    await this.request(`/v1/me/player/${endpoint}?${params.toString()}`, { method: 'POST' });
  }

  async setPlaybackVolume(volume, deviceId) {
    const params = new URLSearchParams({ volume_percent: String(Math.max(0, Math.min(100, Math.round(volume * 100)))) });
    if (deviceId) params.set('device_id', deviceId);
    await this.request(`/v1/me/player/volume?${params.toString()}`, { method: 'PUT' });
  }

  async disconnect() {
    this.cancelConnect();
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.refreshToken = null;
    this.clearStoredRefreshToken();
    return { success: true };
  }

  cancelConnect() {
    this.pendingLogin?.cancel?.();
    return { success: true };
  }

  async exchangeCode(code, verifier) {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: this.clientId,
        code_verifier: verifier,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || 'Spotify could not complete sign-in.');
    }
    return data;
  }

  acceptTokenData(tokenData) {
    this.accessToken = tokenData.access_token;
    this.accessTokenExpiresAt = Date.now() + (Number(tokenData.expires_in) || 3600) * 1000;
    if (tokenData.refresh_token) this.refreshToken = tokenData.refresh_token;
  }

  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    if (!token) throw new Error('Connect your Spotify account first.');

    const response = await fetch(`https://api.spotify.com${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (response.status === 204) return {};
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message || data.error_description || `Spotify returned HTTP ${response.status}.`;
      throw new Error(message);
    }
    return data;
  }

  normalizeProfile(profile) {
    return {
      id: profile.id,
      displayName: profile.display_name || profile.id || 'Spotify account',
      image: profile.images?.[0]?.url || null,
    };
  }

  normalizeTrack(track) {
    return {
      id: track.id,
      uri: track.uri,
      source: 'spotify',
      title: track.name || 'Unknown Track',
      artist: (track.artists || []).map(artist => artist.name).join(', ') || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      picture: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
      duration: (Number(track.duration_ms) || 0) / 1000,
    };
  }

  readRefreshToken() {
    try {
      if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(this.refreshTokenPath)) return null;
      const encrypted = fs.readFileSync(this.refreshTokenPath);
      return safeStorage.decryptString(encrypted);
    } catch (error) {
      console.warn('Could not read the saved Spotify session:', error.message);
      return null;
    }
  }

  persistRefreshToken() {
    try {
      if (!this.refreshToken || !safeStorage.isEncryptionAvailable()) return;
      fs.writeFileSync(this.refreshTokenPath, safeStorage.encryptString(this.refreshToken));
    } catch (error) {
      console.warn('Could not save the Spotify session:', error.message);
    }
  }

  clearStoredRefreshToken() {
    try {
      if (fs.existsSync(this.refreshTokenPath)) fs.unlinkSync(this.refreshTokenPath);
    } catch (error) {
      console.warn('Could not remove the saved Spotify session:', error.message);
    }
  }
}

module.exports = { SpotifyProvider, REDIRECT_URI };
