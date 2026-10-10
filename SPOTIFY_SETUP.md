# Spotify setup for PixelPlayer

PixelPlayer uses Spotify's Web Playback SDK to play tracks in its own player controls. The Web Playback SDK requires Spotify Premium.

1. Create or open your Spotify app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In **Settings > User Management**, add the full name and Spotify email address for the account you will connect in PixelPlayer. Development Mode allows up to five users; an account that is not listed may sign in but Spotify can reject its API requests.
3. Make sure the Spotify account that owns the developer app has an active **Premium** subscription. Spotify requires Premium for Development Mode apps and for Web Playback SDK streaming.
4. Enable **Web Playback SDK** for the app.
5. Add this exact redirect URI in the app settings:

   `http://127.0.0.1:43827/callback`

6. Copy the app's **Client ID** into a `.env` file in the PixelPlayer project folder:

   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   ```

   The client secret is not needed. Do not put it in this project.

7. Restart PixelPlayer and click **Connect Spotify**. Approve playlist access. Your Spotify playlists will appear in the sidebar, and the search bar will search Spotify's catalog while connected. Search results are paged with **Load more results**.

If you connected before playlist access was added, click **Reconnect** and approve the updated permissions. This is needed once because Spotify keeps the scopes granted to the saved session.

The app uses Authorization Code with PKCE and stores its refresh token encrypted with the operating system's credential storage. Spotify Web Playback SDK requires an eligible Premium account and a supported playback environment. In PixelPlayer's Electron app, selecting a Spotify track opens it in Spotify and waits for a Spotify Connect device to appear. PixelPlayer then starts the selected track and controls playback, pause, and seeking. If Spotify does not register a device, press Play once in the Spotify app or browser, then press Play in PixelPlayer again.
