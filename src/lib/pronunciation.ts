import "server-only";
import { pinyin } from "pinyin-pro";
import type Kuroshiro from "kuroshiro";

export type Pronunciation = {
    kind: "pinyin" | "romaji";
    text: string;
};

// Sharing the initialization promise prevents concurrent dictionary loads.
let japaneseConverter: Promise<Kuroshiro> | undefined;

function getJapaneseConverter(): Promise<Kuroshiro> {
    if (!japaneseConverter) {
        japaneseConverter = (async () => {
            const [{ default: KuroshiroClass }, { default: Analyzer }] =
                await Promise.all([
                    import("kuroshiro"),
                    import("kuroshiro-analyzer-kuromoji"),
                ]);
            const converter = new KuroshiroClass();
            await converter.init(new Analyzer());
            return converter;
        })().catch((error: unknown) => {
            // A transient dictionary failure can be retried on a later request.
            japaneseConverter = undefined;
            throw error;
        });
    }
    return japaneseConverter;
}

export async function generatePronunciation(
    text: string,
    language: string
): Promise<Pronunciation | null> {
    if (!text.trim() || (language !== "zh-CN" && language !== "ja")) {
        return null;
    }

    // Keep unexpectedly large provider responses out of the dictionary parser.
    if (Array.from(text).length > 10_000) {
        throw new Error("Pronunciation text exceeds limit.");
    }

    if (language === "zh-CN") {
        return {
            kind: "pinyin",
            text: pinyin(text, { toneType: "symbol", nonZh: "consecutive" }),
        };
    }

    const converter = await getJapaneseConverter();
    return {
        kind: "romaji",
        text: await converter.convert(text, {
            to: "romaji",
            mode: "spaced",
            romajiSystem: "hepburn",
        }),
    };
}
