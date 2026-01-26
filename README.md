# 🌿 Shudh - Pure Ingredient Guardian

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

**Shudh** revolutionizes how you evaluate everyday products by instantly analyzing ingredients in **food**, **cosmetics**, and **medicine** for health risks, harmful additives, and overall safety. Simply point your camera at any product label or enter a product name to get a comprehensive safety analysis in seconds.

> *"Unmasking the chemistry in your world."*

---

## ✨ Features

- **🎯 Multi-Category Analysis**: Supports Food, Cosmetics, and Medicine products
- **🤖 AI-Powered Intelligence**: Uses Google Gemini AI for deep ingredient analysis
- **📸 Smart Image Scanning**: Upload product photos or use your camera to scan labels
- **🔍 Comprehensive Risk Assessment**: Get detailed breakdowns of each ingredient with:
  - Safety flags (Red/Yellow/Green)
  - Hazard levels and potential risks
  - Health benefits and long-term effects
  - Expert-verified sources
- **📊 Safety Score**: Clear 0-100 rating based on ingredient composition
- **🎨 Category-Specific Theming**: Distinct UI themes for Food (green), Cosmetics (pink), and Medicine (blue)
- **🔗 Shareable Results**: Generate shareable links with encoded analysis data
- **⚡ Fast & Responsive**: Built with Vite for lightning-fast performance
- **📱 Mobile-First Design**: Seamless experience across all devices

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2** with **TypeScript 5.8** - Modern component architecture
- **Vite 6.2** - Ultra-fast build tool and dev server
- **HTML5 Camera API** - Real-time image capture
- **Responsive CSS** - Mobile-first design

### AI & Services
- **Google Gemini AI (@google/genai)** - Advanced ingredient analysis
- **Custom ML prompts** - Specialized for food safety and ingredient evaluation

### Build & Development
- **TypeScript** - Type-safe development
- **Vite** - Module bundler and dev server
- **Node.js** - Runtime environment

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sai-Emani25/Shudh.git
   cd Shudh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Gemini API**
   
   You'll need a Google Gemini API key to use the analysis features:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Generate an API key (free tier available)
   - Create a `.env` file in the project root:
     ```bash
     echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
     ```
   - Replace `your_actual_api_key_here` with your actual API key
   
   **Note**: The `.env` file is already included in `.gitignore` to keep your API key secure.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## 📖 How It Works

1. **Select Category**: Choose between Food, Cosmetics, or Medicine
2. **Input Product**: 
   - Upload a photo of the ingredient label
   - Use your device camera to capture the label
   - Enter product name for database lookup
3. **AI Analysis**: Gemini AI processes the input and analyzes:
   - Individual ingredient safety profiles
   - Chemical composition and hazard levels
   - Potential health risks and benefits
   - Long-term health effects
4. **View Results**: Get a comprehensive report including:
   - Overall safety score (0-100)
   - Color-coded flags (🟢 Safe, 🟡 Caution, 🔴 Hazardous)
   - Detailed ingredient breakdowns
   - Product labels and certifications
   - Verified sources for further reading

---

## 📁 Project Structure

```
Shudh/
├── components/           # React components
│   ├── AnalysisView.tsx # Results display component
│   └── CameraScanner.tsx# Image capture component
├── services/            # Business logic & API calls
│   └── geminiService.ts # Google Gemini AI integration
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── constants.tsx        # App constants & themes
├── index.tsx            # Application entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies & scripts
```

---

## 🎯 Status & Roadmap

### ✅ Completed Features
- Core scanning engine with image upload and camera support
- AI-powered ingredient analysis using Google Gemini
- Multi-category support (Food, Cosmetics, Medicine)
- Category-specific theming and user experience
- Safety scoring system with color-coded flags
- Shareable result links with encoded data

### 🔮 Upcoming Features
- [ ] Barcode scanning (UPC/EAN) for quick product lookup
- [ ] User profiles & analysis history
- [ ] Offline mode with local ingredient database
- [ ] Multi-language support (Hindi + regional languages)
- [ ] Browser extension for on-the-go checking
- [ ] Android/iOS native applications
- [ ] Community-driven ingredient database
- [ ] Public API for third-party integration

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the project**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

Please ensure your code follows the existing style and includes appropriate tests.

---

## 🐛 Troubleshooting

### API Key Issues
- Ensure your Google Gemini API key is valid and has not exceeded quota
- Check that the API key is properly configured in `services/geminiService.ts`

### Camera Not Working
- Grant camera permissions in your browser
- Use HTTPS or localhost (camera access requires secure context)

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Ensure you're using Node.js v16 or higher

---

## 📄 License

This project is licensed under the **MIT License** - free to use, modify, and distribute.

---

## 👨‍💻 Author

**Sai Emani**
- GitHub: [@Sai-Emani25](https://github.com/Sai-Emani25)
- Location: Hosapete, Karnataka, India

---

<div align="center">

**Built with ❤️ for a healthier India! 🇮🇳**

*Making ingredient transparency accessible to everyone*

</div>
