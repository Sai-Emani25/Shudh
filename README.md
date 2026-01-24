<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

[![Deploy Vite app to GitHub Pages](https://github.com/Sai-Emani25/Shudh/actions/workflows/deploy.yml/badge.svg)](https://github.com/Sai-Emani25/Shudh/actions/workflows/deploy.yml)

# Shudh – Pure Ingredient Guardian

Shudh is a smart ingredient scanner that helps you quickly understand what goes into the products you use. Paste an ingredient list or scan a label and Shudh breaks down the components, surfaces potential concerns, and highlights what’s clean and safe.

The app is built with React + Vite and uses Google Gemini via the `@google/genai` SDK.

## Features

- Ingredient list analysis with clear, human-readable summaries
- Risk and concern highlighting for common additives
- Camera-based optical scanner for product labels
- Clean, focused UI optimized for quick checks

## Tech Stack

- React + TypeScript
- Vite dev/build tooling
- Google Gemini (`@google/genai`)

## Running Locally

**Prerequisites**

- Node.js (LTS recommended)
- npm (comes with Node)

**Setup**

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the project root and set your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

The app will be available on the port Vite prints in the terminal (by default `http://localhost:5173` unless overridden).

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The output will be generated in the `dist` directory.

## Deployment – GitHub Pages

This repo is configured to deploy automatically to GitHub Pages using GitHub Actions.

### How it works

- Vite is configured with `base: '/Shudh/'` so the app serves correctly from `https://<username>.github.io/Shudh/`.
- The workflow defined in `.github/workflows/deploy.yml`:
  - Installs dependencies
  - Runs `npm run build`
  - Uploads the `dist` folder as a Pages artifact
  - Deploys it to GitHub Pages

### Enabling GitHub Pages

1. Push changes to the `main` branch of this repository.
2. In GitHub, go to **Settings → Pages** for this repo.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Check the **Actions** tab for the "Deploy Vite app to GitHub Pages" workflow and wait for it to succeed.

Once the workflow completes, the site will be available at:

`https://sai-emani25.github.io/Shudh/`

## Environment Variables

- `GEMINI_API_KEY` – required. Your Google Gemini API key used for ingredient analysis.

Create or update `.env.local` (not committed to git) with your key before running or deploying.
