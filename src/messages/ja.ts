import type zhCN from "./zh-CN";

const messages = {
    "site": {
        "name": "Tuotuoツール",
        "description": "シンプルで便利なオンラインツール集"
    },
    modelViewer: {
        inspector: {
            fbxError: "FBXを読み込めませんでした。バージョン、テクスチャ、モデルデータを確認し、FBX 7.xで再出力してください。",
            sceneNote: "シーンのメッシュごとに頂点・三角形を集計します。サイズはノード変換適用後の読み込み時の姿勢の境界ボックスで、モデル座標の単位です。",
            sceneMaterials: "GLB/glTFとFBXのマテリアル、テクスチャ、ボーン集計、クリップ再生に対応します。FBX固有のマテリアルや制約は完全に再現できない場合があります。外部テクスチャも指定してください。",
            animationCategory: "アニメーション種別（モデル内クリップ）",
            unnamedAnimation: "名前のないアニメーション",
            playAnimation: "再生 / 再開",
            pauseAnimation: "一時停止",
            stopAnimation: "停止して初期姿勢に戻す",
            noAnimations: "このモデルにはアニメーションクリップがありません。",
            animationHint: "モデル内のクリップ名で選択します。切り替えると最初からループ再生し、停止すると初期姿勢に戻ります。動作の自動分類・分割は行いません。",
            openFolder: "モデルフォルダーを選択",
            folderHint: "モデルフォルダー全体、またはモデル・BIN・texturesフォルダーを一緒にドラッグしてください。元の階層を保ち、メインモデルは1つだけ含めてください。",
            directoryError: "フォルダー全体を読み込めませんでした。「モデルフォルダーを選択」を使うか、必要な関連ファイルを選択して再試行してください。上限は10,000項目、64階層です。",
            missing: "不足しているローカルリソースを一緒に選択してください：",
            compression: "Draco・Meshopt・KTX2圧縮には未対応です。非圧縮モデルを書き出してください。",
            external: "外部URLのリソースは読み込めません。ローカルリソースを使用してください。",
            gltfError: "GLB/glTFの読み込みに失敗しました。バージョン、関連ファイル、画像を確認してください。",
            gltfNote: "glTF：既定シーンのメッシュごとに頂点・三角形を集計します（共有メッシュは重複集計）。サイズはノード変換適用後の既定ポーズの境界ボックスで、モデル座標の単位です。",
            gltfMaterials: "マテリアルとテクスチャを表示します。スキンが参照する固有ボーンとアニメーションクリップを集計し、クリップを選んで再生できます。非圧縮glTF 2.0のみ対応。",
            controls: "左ドラッグ：回転 · 右ドラッグ：平行移動 · ホイール：拡大 / 縮小",
            resetView: "視点をリセット",
            viewLabel: "3Dモデル",
            renderError: "表示できません。WebGL対応を確認するか、ファイルを再選択してください。",
            noFaces: "描画できるポリゴン面がありません。",
            "open": "モデルと関連ファイルを選択",
            "clear": "クリア",
            "files": "ファイル一覧",
            "none": "なし",
            "objects": "オブジェクト",
            "groups": "グループ",
            "materials": "マテリアル参照",
            "libraries": "MTL参照（未読み込み）",
            "drop": "OBJ・GLB・glTF・FBXモデルをドロップ",
            "local": "ファイルはブラウザー内で解析し、サーバーにアップロードしません。",
            "loading": "解析中…",
            "success": "解析完了",
            "hint": "主モデル1個と関連するBIN・画像を一緒に選択してください。合計{limit} MiBまで。",

            "details": "詳細",
            "waiting": "モデルの読み込み待ち",
            "vertices": "頂点数",
            "faces": "ポリゴン面数",
            "triangles": "三角形数",
            "size": "サイズ",
            "bones": "ボーン",
            "animations": "アニメーション",
            "unsupported": "OBJ形式では非対応",
            "typeError": "OBJ・GLB・glTF・FBXの主ファイルを1個選択してください。OBJは単一ファイルのみ対応。",
            "sizeError": "ファイルの合計が{limit} MiBを超えています。小さいモデルを使用してください。",
            "parseError": "解析に失敗しました。UTF-8の文字コード、頂点座標、面のインデックスを確認してください。",
            "timeout": "解析がタイムアウトしました。小さいモデルを使用してください。",
            "countNote": "頂点数はv行の数です。n角形をn−2個の三角形として数え、縮退や自己交差は検査しません。サイズは全頂点の境界ボックスをモデル単位で示し、小数点以下最大6桁で表示します。",
            "materialNote": "オブジェクト・グループ・マテリアルの参照名のみを抽出します。MTL、テクスチャ、ボーン、アニメーションは読み込みません。",
            "ignored": "集計対象外の命令"
        },
        "title": "3Dモデルビューア",
        "format": "対応形式",
        "status": "OBJデータ解析",
        "detail": "OBJファイルをドロップして、ブラウザー内で形状データを確認できます。",
        "about": "モデル形式について",
        "body": "OBJ、FBX、glTF 2.0（GLB/glTF）に対応。OBJは灰色で表示し、GLB/glTFは階層・マテリアル・テクスチャを保持します。外部BINと画像も一緒に指定してください。アニメーションクリップを選んで再生できます。",
        "back": "制作ツールに戻る"
    },
    "navigation": {
        creativeTools: "制作ツール",
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
        fileConverter: {
            noTables: "罫線付き表は検出されませんでした。Excel には各ページの文字とページ画像を含み、表は再構成していません。",
            title: "文書形式変換", description: "Word・Excel・PowerPoint を PDF に、PDF を Word・Excel・スライドに変換します。ログイン・AI は不要です。", open: "変換を開く",
            choose: "文書を選択", format: "出力形式", convert: "変換する", working: "変換中…", download: "結果をダウンロード",
            size: "空でない 5 MiB 以下のファイルを選択してください。", busy: "混雑しています。時間をおいて再試行してください。", invalid: "読み取れません。形式、内容、制限を確認してください。", unavailable: "変換サービスを利用できません。後で再試行してください。",
            pageLimit: "入力 PDF または Office からの PDF 出力は最大 20 ページです。文書を分割してください。", scannedPdf: "スキャン・文字のないページは編集可能な Word/Excel に変換できません。画像スライドには対応しています。", unsafeOffice: "暗号化・マクロ・埋め込みオブジェクト・外部データリンクは非対応です。", outputLimit: "出力が 16 MiB を超えています。文書を分割してください。",
            limits: "1 ファイル最大 5 MiB、PDF 最大 20 ページ。DOC/DOCX・XLS/XLSX・PPT/PPTX・ODT/ODS/ODP から PDF は配置・画像・表を可能な範囲で保持します。フォントや改ページは変わる場合があります。PDF から Word は編集可能な内容を再構成し、Excel は罫線付き表・各ページの文字・照合用ページ画像を出力します（数式・元ブック構造は復元しません）。PPTX は各ページを編集不可の画像として配置します。OCR は非対応です。その他の変換は文字の再配置で、最大 60,000 文字です。",
            privacy: "ファイルはサーバーへ送信して一時処理します。AI は使用せず、ファイルや変換履歴は保存しません。移動・再読み込みでダウンロードリンクは無効になります。保存先はブラウザー設定に従います。",
        },
        modelViewer: {
            "title": "モデルビューア",
            "description": "ローカルのOBJ・GLB・glTF・FBXを表示し、形状とシーン情報を確認。",
            "open": "ツールを開く"
        },
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
        ristoolAI: {
            title: "RISTOOL AI · プライベートゲートウェイ",
            description: "ログインして自分のトークンとモデルを選び、AI とチャットできます。",
            open: "ゲートウェイを開く（新しいタブ）",
        },
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
            requestTooLarge: "リクエストが大きすぎます。テキストを短くして再試行してください。",
            "quotaExceeded": "今月の翻訳利用枠を使い切りました。来月再度お試しください。",
            "unavailable": "翻訳サービスを一時的に利用できません。しばらくしてから再試行してください。",
            "timeout": "翻訳がタイムアウトしました。再試行してください。",
            "network": "通信に失敗しました。ネットワークを確認して再試行してください。",
            "copyFailed": "コピーに失敗しました。訳文を選択して手動でコピーしてください。"
        }
    }
} satisfies typeof zhCN;

export default messages;
