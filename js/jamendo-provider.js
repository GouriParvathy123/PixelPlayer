/**
 * Jamendo Provider
 *
 * Uses Jamendo's official v3 API.
 * - HTTPS only
 * - Read-only catalog access
 * - No music files downloaded to disk
 * - Client ID stays in Electron main process
 */

class JamendoProvider {
  constructor(clientId) {
    this.clientId = clientId;
    this.baseUrl = 'https://api.jamendo.com/v3.0';
  }

  isConfigured() {
    return Boolean(this.clientId);
  }

  async search(query, limit = 20) {
    if (!this.isConfigured()) {
      throw new Error('Jamendo Client ID is not configured.');
    }

    if (!query || !query.trim()) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        format: 'json',
        search: query.trim(),
        limit: String(limit),

        // Ask Jamendo for a good streaming format
        audioformat: 'mp32'
      });

      const url = `${this.baseUrl}/tracks/?${params.toString()}`;

      console.log('Jamendo request:', url.replace(this.clientId, '[CLIENT_ID]'));

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Jamendo API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      console.log('Jamendo API response:', data);

      if (data.headers?.status !== 'success') {
        throw new Error(
          data.headers?.error_message || 'Jamendo API request failed'
        );
      }

      const tracks = data.results || [];

      return tracks
        .filter(track => this._isPlayable(track))
        .map(track => this._normalize(track));

    } catch (error) {
      console.error('Jamendo search error:', error);
      throw error;
    }
  }

  async trending(limit = 30) {
    if (!this.isConfigured()) {
      throw new Error('Jamendo Client ID is not configured.');
    }

    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        format: 'json',
        order: 'popularity_week',
        limit: String(limit),
        audioformat: 'mp32'
      });

      const url = `${this.baseUrl}/tracks/?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Jamendo API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (data.headers?.status !== 'success') {
        throw new Error(
          data.headers?.error_message || 'Jamendo API request failed'
        );
      }

      const tracks = data.results || [];

      return tracks
        .filter(track => this._isPlayable(track))
        .map(track => this._normalize(track));

    } catch (error) {
      console.error('Jamendo trending error:', error);
      throw error;
    }
  }

  /**
   * Jamendo returns the playable stream
   * in track.audio.
   */
  _isPlayable(track) {
    return (
      track &&
      typeof track.audio === 'string' &&
      track.audio.startsWith('https://')
    );
  }

  _normalize(track) {
    return {
      id: `jamendo_${track.id}`,

      title: track.name || 'Unknown Track',

      artist: track.artist_name || 'Unknown Artist',

      album: track.album_name || 'Unknown Album',

      picture:
        track.image ||
        track.album_image ||
        null,

      duration: Number(track.duration) || 0,

      source: 'jamendo',

      // THIS is the important correction
      streamUrl: track.audio,

      playable:
        typeof track.audio === 'string' &&
        track.audio.startsWith('https://'),

      // Jamendo licensing information
      license: track.license_ccurl || null,

      // Jamendo page for the track
      externalUrl: track.shareurl || null,

      // Download permission
      downloadAllowed:
        track.audiodownload_allowed === true,

      // We are streaming, not downloading
      downloaded: false
    };
  }

  isPlayable(track) {
    return (
      track &&
      track.source === 'jamendo' &&
      track.playable === true &&
      typeof track.streamUrl === 'string' &&
      track.streamUrl.startsWith('https://')
    );
  }
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = JamendoProvider;
}