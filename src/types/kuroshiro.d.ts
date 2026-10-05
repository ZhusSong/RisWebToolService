// Installed stable releases do not include TypeScript declarations.
declare module "kuroshiro-analyzer-kuromoji" {
    export default class KuromojiAnalyzer {
        constructor(options?: { dictPath?: string });
        init(): Promise<void>;
        parse(text: string): Promise<unknown[]>;
    }
}

declare module "kuroshiro" {
    import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
    export default class Kuroshiro {
        init(analyzer: KuromojiAnalyzer): Promise<void>;
        convert(text: string, options: {
            to: "romaji";
            mode: "spaced";
            romajiSystem: "hepburn";
        }): Promise<string>;
    }
}
