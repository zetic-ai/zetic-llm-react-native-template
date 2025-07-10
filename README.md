# Zetic LLM Template for React Native

A LLM React Native application (iOS and Android) template built with TypeScript and Swift/Kotlin, following current React Native development best practices.

## React Native Environment
```bash
[✓] Node.js (18 or higher)
[✓] React Native CLI (latest)
[✓] iOS Development Environment
    [✓] Xcode 16.3+
    [✓] CocoaPods
[✓] Android Development Environment  
    [✓] Android Studio 2024.3+
    [✓] Android SDK (API 24+)
    [✓] Android Emulator or Device
```

## Project Structure

```bash
zetic-llm-react-native-template/
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── package-lock.json
├── metro.config.js
├── babel.config.js
├── tsconfig.json
├── App.tsx
├── android/
├── ios/
└── src/
    └── consstatns.ts/

```

## Dependency

Check in `package.json`

```json
{
    "dependencies": {
        // ...
        "react-native-zetic-mlange": "https://github.com/zetic-ai/react-native-zetic-mlange.git",
        // ...
    }
}
```

## 🚀 Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/zetic-ai/zetic-llm-react-native-template.git
cd zetic-llm-react-native-template
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install iOS dependencies
cd ios && pod install && cd ..
```

### 3. Configure Credentials

Update your SDK credentials in `src/constants.ts`:

> If you have no token for SDK, Check [ZeticAI personal settings](https://mlange.zetic.ai/settings?tab=pat)

```typescript
// TODO: Replace with your actual credentials
export const PERSONAL_ACCESS_KEY = 'YOUR_PERSONAL_ACCESS_TOKEN';
export const MODEL_KEY = 'YOUR_MODEL_KEY';
```

### 4. Build and Run

```bash
# Clear Metro cache (recommended)
npx react-native start --reset-cache

# Run on iOS (requires macOS)
npx react-native run-ios

# Run on Android
npx react-native run-android

# Run only on real device for best performance
```

## 📚 Documentation & Support

- [ZeticAI Guide](https://docs.zetic.ai) - Zetic AI Docs
- [React Native Documentation](https://reactnative.dev/docs/getting-started) - React Native Official Docs
- Feel free to ask us. Create an issue or mail to us ([software@zetic.ai](mailto:software@zetic.ai))

## 📄 License

This project is licensed under the MIT License - see the [MIT LICENSE](LICENSE) file for details.
