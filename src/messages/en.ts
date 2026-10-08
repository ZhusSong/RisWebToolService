import type zhCN from "./zh-CN";

const messages = {
    "site": {
        "name": "Tuotuo Tools",
        "description": "Simple, practical online tools"
    },
    "navigation": {
        "label": "Main navigation",
        "home": "Home",
        "categories": "Categories",
        "textTools": "Text tools",
        "websites": "Web directory",
        "searchTools": "Search tools",
        "aiNavigation": "AI tools",
        "entertainment": "Entertainment"
    },
    "tools": {
        "textCounter": {
            "title": "Character counter",
            "description": "Count characters and punctuation. Import TXT and Word documents.",
            "open": "Open tool"
        },
        "translator": {
            "title": "Text translation",
            "description": "Translate between Chinese, English and Japanese with automatic source language detection.",
            "open": "Open tool"
        }
    },
    "websites": {
        "bilibili": {
            "title": "Bilibili",
            "description": "Visit Bilibili and discover videos you enjoy.",
            "open": "Visit website (new tab)"
        },
        "google": {
            "title": "Google Search",
            "description": "Search the web, images and more with Google.",
            "open": "Visit website (new tab)"
        },
        "chatgpt": {
            "title": "ChatGPT",
            "description": "Chat, write and code with ChatGPT.",
            "open": "Visit website (new tab)"
        },
        "claude": {
            "title": "Claude",
            "description": "Chat, analyze documents and code with Claude.",
            "open": "Visit website (new tab)"
        },
        "deepseek": {
            "title": "DeepSeek",
            "description": "Visit DeepSeek to chat with an AI assistant.",
            "open": "Visit website (new tab)"
        }
    },
    "translator": {
        "title": "Text translation",
        "backHome": "Back to home",
        "sourceLanguage": "Source language",
        "targetLanguage": "Target language",
        "sourceLabel": "Source text",
        "resultLabel": "Translation",
        "sourcePlaceholder": "Type or paste text to translate…",
        "resultPlaceholder": "Your translation will appear here",
        "translate": "Translate",
        "translating": "Translating…",
        "copy": "Copy translation",
        "copied": "Copied",
        "clear": "Clear",
        "characterLimit": "Up to 2,000 characters per request",
        "provider": "Translation powered by Google Cloud Translation",
        "privacy": "When you translate, your source text is sent to Google. This site does not save source text or translations. It records usage counts, volume and visit statistics. See the footer for IP information.",
        "languages": {
            "auto": "Detect automatically",
            "zh-CN": "Simplified Chinese",
            "en": "English",
            "ja": "Japanese"
        },
        "pronunciation": {
            "pinyin": "Chinese pinyin",
            "romaji": "Japanese romaji",
            "hint": "Pronunciations are approximate. Readings of characters, personal names and place names may vary.",
            "unavailable": "Pronunciation is temporarily unavailable. You can still use the translation."
        },
        "speech": {
            "read": "Read aloud",
            "stop": "Stop reading",
            "speaking": "Reading aloud…",
            "unsupported": "Your browser does not support speech synthesis.",
            "loadingVoices": "Looking for available voices. If none load, check your device speech settings.",
            "missingVoice": "No voice is available for this language. Add it in your device speech settings.",
            "failed": "Could not read aloud. Check audio or network settings and try again.",
            "hint": "Voices are provided by your browser or device. Some require an internet connection."
        },
        "errors": {
            "emptyText": "Enter some text to translate.",
            "textTooLong": "The source exceeds 2,000 characters. Please shorten it.",
            "invalidLanguage": "Select a supported language.",
            "sameLanguage": "Source and target languages must be different.",
            "rateLimited": "Too many translation requests. Please try again later.",
            "quotaExceeded": "The monthly translation quota has been used up. Please try again next month.",
            "unavailable": "Translation is temporarily unavailable. Please try again later.",
            "timeout": "The translation request timed out. Please try again.",
            "network": "Request failed. Check your network and try again.",
            "copyFailed": "Copy failed. Please select and copy the translation manually."
        }
    }
} satisfies typeof zhCN;

export default messages;
