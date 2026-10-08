import type zhCN from "./zh-CN";

const messages = {
    "site": {
        "name": "Tuotuoツール",
        "description": "シンプルで便利なオンラインツール集"
    },
    "navigation": {
        "label": "メインナビゲーション",
        "home": "ホーム",
        "categories": "カテゴリー",
        "textTools": "テキストツール",
        "websites": "サイト集",
        "searchTools": "検索ツール",
        "aiNavigation": "AIツール",
        "entertainment": "エンタメ"
    },
    "tools": {
        "textCounter": {
            "title": "文字数カウント",
            "description": "文字数と句読点を集計。TXT・Word文書の読み込みに対応。",
            "open": "ツールを開く"
        },
        "translator": {
            "title": "テキスト翻訳",
            "description": "中国語・英語・日本語を相互翻訳。原文の言語を自動判定。",
            "open": "ツールを開く"
        }
    },
    "websites": {
        "bilibili": {
            "title": "Bilibili",
            "description": "Bilibili公式サイトで、お気に入りの動画を見つけましょう。",
            "open": "サイトを開く（新しいタブ）"
        },
        "google": {
            "title": "Google検索",
            "description": "Googleでウェブページや画像などを検索。",
            "open": "サイトを開く（新しいタブ）"
        },
        "chatgpt": {
            "title": "ChatGPT",
            "description": "ChatGPTでAIチャット、文章作成、プログラミング。",
            "open": "サイトを開く（新しいタブ）"
        },
        "claude": {
            "title": "Claude",
            "description": "ClaudeでAIチャット、文書分析、プログラミング。",
            "open": "サイトを開く（新しいタブ）"
        },
        "deepseek": {
            "title": "DeepSeek",
            "description": "DeepSeekのAIアシスタントとチャット。",
            "open": "サイトを開く（新しいタブ）"
        }
    },
    "translator": {
        "title": "テキスト翻訳",
        "backHome": "ホームに戻る",
        "sourceLanguage": "原文の言語",
        "targetLanguage": "翻訳先の言語",
        "sourceLabel": "原文",
        "resultLabel": "訳文",
        "sourcePlaceholder": "翻訳するテキストを入力または貼り付けてください…",
        "resultPlaceholder": "翻訳結果がここに表示されます",
        "translate": "翻訳",
        "translating": "翻訳中…",
        "copy": "訳文をコピー",
        "copied": "コピーしました",
        "clear": "クリア",
        "characterLimit": "1回につき最大2,000文字",
        "provider": "翻訳サービス：Google Cloud Translation",
        "privacy": "翻訳時に原文をGoogleへ送信します。当サイトは原文・訳文を保存せず、利用回数・使用量・アクセス統計を記録します。IPの扱いはページ下部をご覧ください。",
        "languages": {
            "auto": "自動判定",
            "zh-CN": "簡体字中国語",
            "en": "英語",
            "ja": "日本語"
        },
        "pronunciation": {
            "pinyin": "中国語ピンイン",
            "romaji": "日本語ローマ字",
            "hint": "読み方は参考情報です。多音字・人名・地名は実際の読み方と異なる場合があります。",
            "unavailable": "読み方を生成できませんでした。訳文は引き続き利用できます。"
        },
        "speech": {
            "read": "訳文を読み上げ",
            "stop": "読み上げを停止",
            "speaking": "読み上げ中…",
            "unsupported": "このブラウザーは音声読み上げに対応していません。",
            "loadingVoices": "利用可能な音声を確認中です。読み込まれない場合は端末の音声設定をご確認ください。",
            "missingVoice": "この言語の音声がありません。端末の音声設定から追加してください。",
            "failed": "読み上げに失敗しました。音声やネットワーク設定を確認して再試行してください。",
            "hint": "音声はブラウザーまたは端末が提供します。一部の音声にはインターネット接続が必要です。"
        },
        "errors": {
            "emptyText": "翻訳するテキストを入力してください。",
            "textTooLong": "原文が2,000文字を超えています。短くして再試行してください。",
            "invalidLanguage": "対応している言語を選択してください。",
            "sameLanguage": "原文と翻訳先には異なる言語を選択してください。",
            "rateLimited": "翻訳リクエストが多すぎます。しばらくしてから再試行してください。",
            "quotaExceeded": "今月の翻訳利用枠を使い切りました。来月再度お試しください。",
            "unavailable": "翻訳サービスを一時的に利用できません。しばらくしてから再試行してください。",
            "timeout": "翻訳がタイムアウトしました。再試行してください。",
            "network": "通信に失敗しました。ネットワークを確認して再試行してください。",
            "copyFailed": "コピーに失敗しました。訳文を選択して手動でコピーしてください。"
        }
    }
} satisfies typeof zhCN;

export default messages;
