# AI Quiz Video Generator

Generate a short-form quiz video end to end: Claude writes the questions, title,
hashtags, artwork and intro music; you add a voiceover; the browser renders the
finished MP4/WebM.

Originally built against Gemini, now powered entirely by **Claude** (`claude-opus-5`)
through the official `@anthropic-ai/sdk`.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Anthropic API key (from https://console.anthropic.com/settings/keys):
   ```bash
   cp .env.example .env.local
   # then edit .env.local and set ANTHROPIC_API_KEY
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The app is served on http://localhost:3000.

For production: `npm run build && npm start`.

## How Claude is used

The browser never sees the API key. Every AI feature posts to the app's own
`/api/claude` endpoint (`server.ts`), which calls the Messages API server-side.

| Feature | How it works |
| --- | --- |
| Quiz questions | Structured outputs (`output_config.format`) enforce the exact question/options/answer schema |
| Trending topics, "current events" mode | The server-side `web_search` tool, with the pages Claude consulted surfaced as sources in the UI |
| Titles, hashtags, categories, style matching, fun facts, persona rewrites | Structured or plain-text Messages API calls |
| Question artwork | Claude writes an SVG illustration, which the app inlines as a data URL |
| Intro stinger | Claude composes a short note sequence; the browser synthesises it to WAV with the Web Audio API |
| Voiceover | Claude polishes the spoken script and your browser reads it back for rehearsal; the audio in the video is your own microphone recording |

### Note on speech and images

Claude is a text model with no text-to-speech or image-generation endpoint, so
two features work differently than they did on Gemini:

- **Voiceover audio** comes from your microphone (the recorder in the Record
  step). Claude writes and polishes the script, and the browser's built-in
  speech synthesis reads it aloud so you can rehearse before recording.
- **Question images** are Claude-authored SVG artwork rather than photorealistic
  renders. You can still upload or paste a URL for any image or video.

## Project layout

```
server.ts               Express server + Vite middleware + the /api/claude endpoint
services/claudeService  All Claude-backed features (browser side)
services/speech.ts      Browser speech synthesis for voiceover previews
components/             The four wizard steps: Topic -> Record -> Render -> Download
utils/canvas.ts         Frame-by-frame canvas drawing for the video
utils/audio.ts          WAV encoding and the offline stinger synthesiser
```
