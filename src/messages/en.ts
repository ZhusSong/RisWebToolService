import type zhCN from "./zh-CN";

const messages = {
    "site": {
        "name": "Tuotuo Tools",
        "description": "Simple, practical online tools"
    },
    modelViewer: {
        inspector: {
            animationCategory: "Animation category (model clips)",
            unnamedAnimation: "Unnamed animation",
            playAnimation: "Play / resume",
            pauseAnimation: "Pause",
            stopAnimation: "Stop and reset pose",
            noAnimations: "This model has no animation clips.",
            animationHint: "Choose a named model clip. Switching restarts looping playback; stop restores the initial pose. Actions are not automatically classified or split.",
            openFolder: "Choose model folder",
            folderHint: "Drop the whole model folder, or the model, BIN and textures folder together. Keep the original folder structure and include only one main model.",
            directoryError: "Could not read the entire folder. Use Choose model folder, or select the required resource files and retry. Folders are limited to 10,000 entries and 64 nested levels.",
            missing: "Missing local resource. Select it together with the model: ",
            compression: "Draco, Meshopt and KTX2 compression are not supported yet. Export an uncompressed model.",
            external: "Remote resource URLs are not allowed. Use local resources instead.",
            gltfError: "Could not read GLB/glTF. Check the version, companion files and images.",
            gltfNote: "glTF: vertices and triangles are counted per mesh instance in the default scene, including repeated shared meshes. Dimensions are the default-pose bounds after node transforms, in model coordinate units.",
            gltfMaterials: "Materials and textures are displayed. Unique skin bones and imported animation clips are counted; animation clips can be selected and played. Uncompressed glTF 2.0 only.",
            controls: "Left drag: rotate · Right drag: pan · Wheel: zoom in / out",
            resetView: "Reset view",
            viewLabel: "3D model",
            renderError: "Unable to render. Check WebGL support or select the file again.",
            noFaces: "This file has no polygon faces to render.",
            "open": "Choose model and resources",
            "clear": "Clear",
            "files": "Files",
            "none": "None",
            "objects": "Objects",
            "groups": "Groups",
            "materials": "Material references",
            "libraries": "MTL references (not loaded)",
            "drop": "Drop an OBJ, GLB or glTF model",
            "local": "Files are parsed locally in your browser and are not uploaded.",
            "loading": "Parsing…",
            "success": "Parsing complete",
            "hint": "Select one model and its BIN/images together. Total limit: {limit} MiB.",

            "details": "Details",
            "waiting": "Waiting for a model",
            "vertices": "Vertices",
            "faces": "Polygon faces",
            "triangles": "Triangles",
            "size": "size",
            "bones": "Bones",
            "animations": "Animations",
            "unsupported": "Not supported by OBJ",
            "typeError": "Select one OBJ, GLB or glTF model. OBJ currently accepts a single file only.",
            "sizeError": "Files exceed {limit} MiB in total. Use a smaller model.",
            "parseError": "Parsing failed. Check UTF-8 encoding, vertex coordinates and face indices.",
            "timeout": "Parsing timed out. Please use a smaller model.",
            "countNote": "Vertices count v records; each n-sided face counts as n−2 triangles, without checking degeneracy or self-intersection. Dimensions use the bounds of all vertices in model units, displayed to at most six decimal places.",
            "materialNote": "Only object, group and material reference names are extracted. MTL files, textures, bones and animations are not loaded.",
            "ignored": "Directives excluded from statistics"
        },
        "title": "3D model viewer",
        "format": "Supported format",
        "status": "OBJ data inspection",
        "detail": "Drop an OBJ file to inspect geometry data locally in your browser.",
        "about": "About model formats",
        "body": "Supports OBJ and glTF 2.0 (GLB/glTF). OBJ uses gray shading; GLB/glTF preserves hierarchy, materials and textures. Include external BIN files and images. Animation clips can be selected and played.",
        "back": "Back to creative tools"
    },
    "navigation": {
        creativeTools: "Creative tools",
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
        modelViewer: {
            "title": "Model viewer",
            "description": "View local OBJ, GLB and glTF models and inspect geometry and scene data.",
            "open": "Open tool"
        },
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
