const zhCN = {
    site: {
        name: "坨坨工具",
        description: "简单实用的在线工具集合",
    },
    navigation: {
        label: "主要导航",
        home: "首页",
        categories: "分类",
        textTools: "文本工具",
    },
    tools: {
        textCounter: {
            title: "文本字数统计",
            description: "统计字符与标点，支持导入 TXT 和 Word 文档。",
            open: "打开工具",
        },
        translator: {
            title: "文本翻译",
            description: "支持中文、英文和日文互译，自动识别原文语言。",
            open: "打开工具",
        },
    },
    translator: {
        title: "文本翻译",
        backHome: "返回首页",
        sourceLanguage: "原文语言",
        targetLanguage: "目标语言",
        languages: {
            auto: "自动识别",
            "zh-CN": "简体中文",
            en: "英语",
            ja: "日语",
        },
        sourceLabel: "原文",
        resultLabel: "译文",
        sourcePlaceholder: "请输入或粘贴需要翻译的文字……",
        resultPlaceholder: "翻译结果将显示在这里",
        translate: "翻译",
        translating: "正在翻译……",
        copy: "复制译文",
        copied: "已复制",
        clear: "清空",
        characterLimit: "每次最多 2,000 个字符",
        provider: "由 Google Cloud Translation 提供翻译",
        privacy:
            "点击翻译后，原文会发送至 Google 进行处理。本站不保存原文和译文，仅记录使用次数与用量。",
        errors: {
            emptyText: "请先输入需要翻译的文字。",
            textTooLong: "原文超过 2,000 个字符，请缩短后重试。",
            invalidLanguage: "请选择支持的语言。",
            sameLanguage: "原文语言与目标语言相同，请重新选择。",
            rateLimited: "翻译请求过于频繁，请稍后再试。",
            quotaExceeded: "本站本月翻译额度已用完，请下个月再试。",
            unavailable: "翻译服务暂不可用，请稍后再试。",
            timeout: "翻译请求超时，请稍后重试。",
            network: "请求失败，请检查网络后重试。",
            copyFailed: "复制失败，请手动选择并复制译文。",
        },
    },
};

export default zhCN;