<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Shudh: Pure Ingredient Guardian

Shudh is an AI-powered analytical tool that audits food ingredients for toxicological risks, specifically tailored for the Indian market. It detects hidden chemicals, parses complex labels, and provides health-impact scores.

View your app in AI Studio: https://ai.studio/apps/drive/1YGxxI7R-Sv6JxDHWatV-nMY04tLJchxL

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env` to your Gemini API key:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
3. Run the app:
   `npm run dev`

## Deployment

This project handles deployments automatically via GitHub Actions.

**Required Secrets:**
To enable the clinical audit engine on the live site, you must add the following secret in **Settings > Secrets and variables > Actions**:

- `GEMINI_API_KEY`: Your Google Gemini API Key.
