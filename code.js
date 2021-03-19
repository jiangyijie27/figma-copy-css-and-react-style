/**
 * background-color
 * background
 * border
 * border-radius
 * box-shadow
 * color
 * filter
 * font-size font-weight font-style
 * height
 * letter-spacing
 * line-height
 * mix-blend-mode
 * opacity
 * text-shadow
 * width
 */
figma.showUI(__html__, { width: 0, height: 0 });
const defaultSetting = {
    colorHex: "short",
    quote: "single",
    lineBreak: "true",
    valueSubstitutionEnabled: "false",
    valueSubstitution: {},
};
let setting = JSON.parse(JSON.stringify(defaultSetting));
const storageKey = "setting";
const RADIUS_TYPES = ["RECTANGLE"];
const FONT_TYPES = ["TEXT"];
const BLEND_TYPES = [
    "RECTANGLE",
    "LINE",
    "ELLIPSE",
    "POLYGON",
    "STAR",
    "VECTOR",
    "TEXT",
];
const VECTOR_TYPES = ["VECTOR", "LINE", "REGULAR_POLYGON", "ELLIPSE"];
const GROUP_TYPES = ["GROUP", "BOOLEAN_OPERATION"];
const { selection } = figma.currentPage;
figma.clientStorage.getAsync(storageKey).then((result) => {
    if (result) {
        Object.keys(defaultSetting).forEach((key) => {
            let data = JSON.parse(result);
            setting[key] = data[key];
            if (!setting[key]) {
                setting[key] = defaultSetting[key];
            }
        });
        figma.clientStorage.setAsync(storageKey, JSON.stringify(setting));
    }
    else {
        figma.clientStorage.setAsync(storageKey, JSON.stringify(defaultSetting));
        setting = defaultSetting;
    }
    /**
     * number to 16
     * @param c r/g/b
     */
    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    /**
     * rgb to hex
     * @param r 0-1
     * @param g 0-1
     * @param b 0-1
     */
    const rgbToHex = ({ r, g, b, }) => {
        const val = "#" +
            componentToHex(Math.round(r * 255)) +
            componentToHex(Math.round(g * 255)) +
            componentToHex(Math.round(b * 255));
        if (setting.colorHex === "short" &&
            val.charAt(1) == val.charAt(2) &&
            val.charAt(3) == val.charAt(4) &&
            val.charAt(5) == val.charAt(6)) {
            return "#" + val.charAt(1) + val.charAt(3) + val.charAt(5);
        }
        return val;
    };
    /**
     * Convert CSS String to React style
     * @param str : CSS String
     */
    const toCamelCase = (str) => {
        // Lower cases the string
        return (str
            .toLowerCase() // Replaces any - or _ characters with a space
            .replace(/[-_]+/g, " ") // Removes any non alphanumeric characters
            .replace(/[^\w\s]/g, "") // Uppercases the first character in each group immediately following a space
            // (delimited by spaces)
            .replace(/ (.)/g, function ($1) {
            return $1.toUpperCase();
        }) // Removes spaces
            .replace(/ /g, ""));
    };
    /**
     * add px after number, return 0 if 0
     * @param num
     */
    const convertNumToPx = (num) => {
        return num !== 0 ? `${num}px` : num;
    };
    const convertColorToCSS = (paint, options) => {
        if (!paint || paint.visible === false) {
            return "";
        }
        const { type } = paint;
        if (type === "SOLID") {
            // if solid color
            const { color, opacity } = paint;
            let returnVal = "";
            if (opacity !== 1) {
                returnVal = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${Number(opacity.toFixed(2))})`;
            }
            else {
                returnVal = rgbToHex(color);
            }
            if (options && options.gradient) {
                returnVal = `linear-gradient(0deg, ${returnVal}, ${returnVal})`;
            }
            return returnVal;
        }
        else if (type === "IMAGE") {
            // if img return url(), figma does this as well
            return "url()";
        }
        else if (type === "GRADIENT_LINEAR") {
            // if linear gradient
            const { gradientTransform, gradientStops } = paint;
            let returnStr = "";
            let o = 0;
            let n = 1;
            if (!gradientTransform || !gradientStops) {
                return "";
            }
            let gradientTransformData = {
                m00: 1,
                m01: 0,
                m02: 0,
                m10: 0,
                m11: 1,
                m12: 0,
            };
            const delta = gradientTransform[0][0] * gradientTransform[1][1] -
                gradientTransform[0][1] * gradientTransform[1][0];
            if (delta !== 0) {
                const deltaVal = 1 / delta;
                gradientTransformData = {
                    m00: gradientTransform[1][1] * deltaVal,
                    m01: -gradientTransform[0][1] * deltaVal,
                    m02: (gradientTransform[0][1] * gradientTransform[1][2] -
                        gradientTransform[1][1] * gradientTransform[0][2]) *
                        deltaVal,
                    m10: -gradientTransform[1][0] * deltaVal,
                    m11: gradientTransform[0][0] * deltaVal,
                    m12: (gradientTransform[1][0] * gradientTransform[0][2] -
                        gradientTransform[0][0] * gradientTransform[1][2]) *
                        deltaVal,
                };
            }
            const rotationTruthy = gradientTransformData.m00 * gradientTransformData.m11 -
                gradientTransformData.m01 * gradientTransformData.m10 >
                0
                ? 1
                : -1;
            let rotationData = ((data, param) => ({
                x: data.m00 * param.x + data.m01 * param.y,
                y: data.m10 * param.x + data.m11 * param.y,
            }))(gradientTransformData, { x: 0, y: 1 });
            returnStr = `linear-gradient(${((Math.atan2(rotationData.y * rotationTruthy, rotationData.x * rotationTruthy) /
                Math.PI) *
                180).toFixed(2)}deg`;
            const temp = (Math.abs(rotationData.x) + Math.abs(rotationData.y)) /
                Math.hypot(rotationData.x, rotationData.y);
            n = 1 / temp;
            o = (temp - 1) / 2;
        }
    };
    if (figma.command === "css" ||
        figma.command === "react" ||
        figma.command === "tailwind") {
        if (!(selection && selection.length)) {
            figma.closePlugin("❗aPlease select and only select one element.");
        }
        else {
            const node = selection[0];
            let style = [];
            const { type } = node;
            /**
             * width, height
             */
            if (type !== "TEXT") {
                const { width, height } = node;
                style.push(`width: ${convertNumToPx(Number(width.toFixed(2)))};`);
                style.push(`height: ${convertNumToPx(Number(height.toFixed(2)))};`);
            }
            /**
             * font
             */
            if (FONT_TYPES.indexOf(type) > -1) {
                const { fontName, fontSize, lineHeight, letterSpacing, fills, textAlignHorizontal, textCase, textDecoration, } = node;
                /**
                 * fontSize
                 */
                style.push(`font-size: ${convertNumToPx(fontSize)};`);
                /**
                 * fontWeight
                 */
                if (typeof fontName === "object") {
                    const { style: fontWeight } = fontName;
                    // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
                    const fontWeightMapping = {
                        Thin: 100,
                        Hairline: 100,
                        Ultralight: 200,
                        Extralight: 200,
                        Light: 300,
                        Normal: 400,
                        Regular: 400,
                        Medium: 500,
                        Semibold: 600,
                        Demibold: 600,
                        Bold: 700,
                        Extrabold: 800,
                        Ultrabold: 800,
                        Black: 900,
                        Heavy: 900,
                        Extrablack: 950,
                        Ultrablack: 950,
                    };
                    if (fontWeightMapping[fontWeight] &&
                        fontWeightMapping[fontWeight] !== 400) {
                        style.push(`font-weight: ${fontWeightMapping[fontWeight]};`);
                    }
                }
                /**
                 * lineHeight
                 */
                if (typeof lineHeight === "object") {
                    const { unit, value } = lineHeight;
                    if (unit === "PIXELS") {
                        style.push(`line-height: ${convertNumToPx(value)};`);
                    }
                    else if (unit === "PERCENT") {
                        style.push(`line-height: ${Number(value.toFixed(0))}%;`);
                    }
                }
                /**
                 * letterSpacing
                 */
                if (typeof letterSpacing === "object") {
                    const { unit, value } = letterSpacing;
                    if (value !== 0) {
                        if (unit === "PIXELS") {
                            style.push(`letter-spacing: ${convertNumToPx(value)};`);
                        }
                        else {
                            style.push(`letter-spacing: ${value / 100}em;`);
                        }
                    }
                }
                /**
                 * textAlign
                 */
                if (textAlignHorizontal !== "LEFT") {
                    const textAlign = (textAlignHorizontal === "JUSTIFIED"
                        ? "justify"
                        : textAlignHorizontal.toLowerCase());
                    style.push(`text-align: ${textAlign};`);
                }
                /**
                 * textDecoration
                 */
                if (typeof textDecoration === "string" && textDecoration !== "NONE") {
                    style.push(`text-decoration: ${textDecoration.toLowerCase()};`);
                }
                /**
                 * textTransform
                 */
                if (textCase !== "ORIGINAL") {
                    const textTransformMapping = {
                        UPPER: "uppercase",
                        LOWER: "lowercase",
                        TITLE: "capitalize",
                    };
                    style.push(`text-transform: ${textTransformMapping[textCase]};`);
                }
                /**
                 * color
                 */
                if (fills &&
                    Array.isArray(fills) &&
                    fills.length === 1 &&
                    fills[0].type === "SOLID") {
                    style.push(`color: ${convertColorToCSS(fills[0])};`);
                }
            }
            /**
             * blend-mode
             */
            if (BLEND_TYPES.indexOf(type) > -1) {
                let blendMode = "";
                if ("blendMode" in node) {
                    blendMode = node.blendMode;
                }
                if (blendMode !== "PASS_THROUGH") {
                    style.push(`mix-blend-mode: ${blendMode.toLowerCase().replace("_", "-")};`);
                }
            }
            /**
             * background
             */
            if (type !== "TEXT") {
                let fills;
                if ("fills" in node) {
                    fills = node.fills;
                }
                if (fills && Array.isArray(fills)) {
                    // 最简单的情况，纯色背景
                    if (fills.length === 1) {
                        style.push(`background${fills[0].type === "SOLID" ? "-color" : ""}: ${convertColorToCSS(fills[0])};`);
                    }
                    else if (fills.length > 1) {
                        const c = fills.map((fill, index) => convertColorToCSS(fill, {
                            gradient: index > 0 && fill.type === "SOLID",
                        }));
                        style.push(`background: ${c
                            .filter((o) => o)
                            .reverse()
                            .join(", ")};`);
                    }
                }
            }
            /**
             * strokes
             */
            let strokes;
            if ("strokes" in node) {
                strokes = node.strokes;
            }
            const strokeColor = convertColorToCSS(strokes[0]);
            let strokeWeight;
            if ("strokeWeight" in node) {
                strokeWeight = node.strokeWeight;
            }
            if (strokes &&
                strokes.length === 1 &&
                strokes[0].type === "SOLID" &&
                strokes[0].visible) {
                style.push(`border: ${strokeWeight}px solid ${strokeColor};`);
            }
            /**
             * Radius
             */
            let bottomLeftRadius;
            let bottomRightRadius;
            let cornerRadius;
            let topLeftRadius;
            let topRightRadius;
            if ("bottomLeftRadius" in node) {
                bottomLeftRadius = node.bottomLeftRadius;
            }
            if ("bottomRightRadius" in node) {
                bottomRightRadius = node.bottomRightRadius;
            }
            if ("cornerRadius" in node) {
                cornerRadius = node.cornerRadius;
            }
            if ("topLeftRadius" in node) {
                topLeftRadius = node.topLeftRadius;
            }
            if ("topRightRadius" in node) {
                topRightRadius = node.topRightRadius;
            }
            // 如果四个 radius 不同，则 cornerRadius 会是 symbol
            if (typeof cornerRadius === "number" && cornerRadius !== 0) {
                style.push(`border-radius: ${convertNumToPx(cornerRadius)};`);
            }
            else {
                const rad = `${convertNumToPx(topLeftRadius)} ${convertNumToPx(topRightRadius)} ${convertNumToPx(bottomRightRadius)} ${convertNumToPx(bottomLeftRadius)}`;
                if (rad !== "0 0 0 0" &&
                    rad !== "undefinedpx undefinedpx undefinedpx undefinedpx") {
                    style.push(`border-radius: ${convertNumToPx(topLeftRadius)} ${convertNumToPx(topRightRadius)} ${convertNumToPx(bottomRightRadius)} ${convertNumToPx(bottomLeftRadius)};`);
                }
            }
            /**
             * boxShadow
             */
            let effects;
            if ("effects" in node) {
                effects = node.effects;
            }
            const shadows = effects.filter((o) => o.type === "DROP_SHADOW" ||
                (type !== "TEXT" && o.type === "INNER_SHADOW"));
            if (shadows.length) {
                const shadowsStr = shadows.map(
                // @ts-ignore
                ({ color, offset, radius, spread, visible, type }) => {
                    let colorVal = "";
                    if (!visible) {
                        return "";
                    }
                    if (color.a === 1) {
                        colorVal = rgbToHex(color);
                    }
                    else {
                        colorVal = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${Number(color.a.toFixed(2))})`;
                    }
                    return `${type === "INNER_SHADOW" ? "inset " : ""}${convertNumToPx(offset.x)} ${convertNumToPx(offset.y)} ${convertNumToPx(radius)} ${convertNumToPx(spread)} ${colorVal}`;
                });
                if (type === "TEXT") {
                    style.push(`text-shadow: ${shadowsStr.filter((o) => o).join(", ")};`);
                }
                else {
                    style.push(`box-shadow: ${shadowsStr
                        .reverse()
                        .filter((o) => o)
                        .join(", ")};`);
                }
            }
            /**
             * filter
             * Array effects contains at most 1
             */
            const filter = effects.find((o) => o.type === "LAYER_BLUR");
            if (filter && filter.visible) {
                style.push(`filter: blur(${filter.radius}px);`);
            }
            /**
             * background-filter
             * Array effects contains at most 1
             */
            const backgroundFilter = effects.find((o) => o.type === "BACKGROUND_BLUR");
            if (backgroundFilter && backgroundFilter.visible) {
                style.push(`backdrop-filter: blur(${backgroundFilter.radius}px);`);
            }
            const styleNotSubstituted = [];
            style.forEach((o) => {
                if (o.includes("solid")) {
                    // 将 border 规则拆分为原子类可以识别的规则
                    styleNotSubstituted.push(`border-width: ${strokeWeight}px;`);
                    styleNotSubstituted.push(`border-style: solid;`);
                    styleNotSubstituted.push(`border-color: ${strokeColor};`);
                }
                else {
                    styleNotSubstituted.push(o);
                }
            });
            /**
             * value substitute
             */
            if (setting.valueSubstitutionEnabled) {
                try {
                    const substitutions = JSON.parse(setting.valueSubstitution);
                    style = style.map((o) => {
                        let temp = o;
                        Object.keys(substitutions).forEach((p) => {
                            temp = temp.split(p).join(substitutions[p]);
                        });
                        return temp;
                    });
                }
                catch (error) { }
            }
            if (figma.command === "css") {
                figma.ui.postMessage({ copiedText: style.join("\n"), type: "css" });
            }
            else if (figma.command === "react") {
                const quoteStr = setting.quote === "single" ? "'" : '"';
                const copiedTexts = [];
                style.forEach((cssExpression) => {
                    const ex = cssExpression.replace(";", "").split(": ");
                    const exText = toCamelCase(ex[0]) + ": " + quoteStr + ex[1] + quoteStr + ",";
                    copiedTexts.push(exText);
                });
                figma.ui.postMessage({
                    copiedText: copiedTexts.join(setting.lineBreak ? "\n" : " "),
                    type: "react",
                });
            }
            else if (figma.command === "tailwind") {
                const tailwindConfig = {
                    // 对以下文件进行 className 的 tree-shaking，支持字面量与三元
                    purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
                    important: "body",
                    // https://tailwindcss.com/docs/presets#creating-a-preset
                    presets: [],
                    darkMode: false,
                    theme: {
                        // 待设计规范引入
                        screens: false,
                        colors: {
                            transparent: "transparent",
                            current: "currentColor",
                            black: "#000",
                            white: "#fff",
                            green: "#07c160",
                            orange: "#eda20c",
                            blue: "#2b7bd6",
                            red: "#d9514c",
                            gray: {
                                0: "#ffffff",
                                50: "#fafafa",
                                100: "#f2f2f2",
                                200: "#ebebeb",
                                300: "#e6e6e6",
                                400: "#e0e0e0",
                                500: "#d6d6d6",
                                600: "#c7c7c7",
                                700: "#a3a3a3",
                                800: "#6b6b6b",
                                900: "#1f1f1f",
                            },
                            "tp-gray": {
                                0: "rgba(0, 0, 0, 0)",
                                50: "rgba(0, 0, 0, 0.02)",
                                100: "rgba(0, 0, 0, 0.06)",
                                200: "rgba(0, 0, 0, 0.08)",
                                300: "rgba(0, 0, 0, 0.1)",
                                400: "rgba(0, 0, 0, 0.12)",
                                500: "rgba(0, 0, 0, 0.16)",
                                600: "rgba(0, 0, 0, 0.22)",
                                700: "rgba(0, 0, 0, 0.36)",
                                800: "rgba(0, 0, 0, 0.58)",
                                900: "rgba(0, 0, 0, 0.88)",
                            },
                        },
                        spacing: {
                            0: "0",
                            1: "1px",
                            2: "2px",
                            4: "4px",
                            8: "8px",
                            12: "12px",
                            16: "16px",
                            20: "20px",
                            24: "24px",
                            28: "28px",
                            30: "30px",
                            32: "32px",
                            36: "36px",
                            40: "40px",
                            42: "42px",
                            48: "48px",
                            52: "52px",
                            56: "56px",
                            64: "64px",
                            84: "84px",
                            100: "100px",
                            120: "120px",
                        },
                        // 待设计规范引入
                        animation: {
                            none: "none",
                        },
                        backgroundColor: (theme) => theme("colors"),
                        // 可加入 gradients，待设计规范引入
                        backgroundImage: {
                            none: "none",
                        },
                        backgroundOpacity: (theme) => theme("opacity"),
                        // 暂且无用
                        backgroundPosition: false,
                        backgroundSize: {
                            auto: "auto",
                            cover: "cover",
                            contain: "contain",
                        },
                        borderColor: (theme) => (Object.assign(Object.assign({}, theme("colors")), { DEFAULT: theme("colors.gray.200", "currentColor") })),
                        borderOpacity: (theme) => theme("opacity"),
                        borderRadius: {
                            none: "0px",
                            2: "2px",
                            4: "4px",
                            8: "8px",
                            12: "12px",
                            24: "24px",
                            52: "52px",
                            full: "9999px",
                        },
                        borderWidth: {
                            DEFAULT: "1px",
                            0: "0px",
                            2: "2px",
                            4: "4px",
                            8: "8px",
                        },
                        boxShadow: {
                            0: "0 0 0 1px rgba(223, 223, 223, 0.45)",
                            1: "0 0 0 1px rgba(223, 223, 223, 0.5), 0 3px 6px 0 rgba(0, 0, 0, 0.04)",
                            2: "0 0 0 1px rgba(219, 219, 219, 0.55),0 3px 5px 0 rgba(0, 0, 0, 0.05), 0 6px 15px 0 rgba(0, 0, 0, 0.05)",
                            3: "0 0 0 1px rgba(219, 219, 219, 0.7), 0 8px 20px 0 rgba(0, 0, 0, 0.08), 0 4px 10px 0 rgba(0, 0, 0, 0.07)",
                            4: "0 0 0 1px rgba(107, 107, 107, 0.15), 0 10px 36px 0 rgba(0, 0, 0, 0.1), 0 6px 15px 0 rgba(0, 0, 0, 0.07)",
                            none: "none",
                        },
                        container: false,
                        cursor: {
                            auto: "auto",
                            default: "default",
                            pointer: "pointer",
                            "not-allowed": "not-allowed",
                        },
                        // 暂且无用
                        divideColor: false,
                        divideOpacity: false,
                        divideWidth: false,
                        fill: { current: "currentColor" },
                        flex: {
                            1: "1 1 0%",
                            auto: "1 1 auto",
                            initial: "0 1 auto",
                            none: "none",
                        },
                        flexGrow: {
                            0: "0",
                            DEFAULT: "1",
                        },
                        flexShrink: {
                            0: "0",
                            DEFAULT: "1",
                        },
                        // 不提供 fontFamily
                        fontFamily: false,
                        // 不提供 fontSize + lineHeight 的组合
                        fontSize: {
                            12: "12px",
                            13: "13px",
                            14: "14px",
                            17: "17px",
                            18: "18px",
                            20: "20px",
                            22: "22px",
                            24: "24px",
                            28: "28px",
                            32: "32px",
                        },
                        fontWeight: {
                            // thin: "100",
                            // extralight: "200",
                            // light: "300",
                            normal: "400",
                            medium: "500",
                            // semibold: "600",
                            bold: "600",
                        },
                        gap: (theme) => theme("spacing"),
                        gradientColorStops: (theme) => theme("colors"),
                        gridAutoColumns: {
                            auto: "auto",
                            min: "min-content",
                            max: "max-content",
                            fr: "minmax(0, 1fr)",
                        },
                        gridAutoRows: {
                            auto: "auto",
                            min: "min-content",
                            max: "max-content",
                            fr: "minmax(0, 1fr)",
                        },
                        gridColumn: {
                            auto: "auto",
                            "span-1": "span 1 / span 1",
                            "span-2": "span 2 / span 2",
                            "span-3": "span 3 / span 3",
                            "span-4": "span 4 / span 4",
                            "span-5": "span 5 / span 5",
                            "span-6": "span 6 / span 6",
                            "span-7": "span 7 / span 7",
                            "span-8": "span 8 / span 8",
                            "span-9": "span 9 / span 9",
                            "span-10": "span 10 / span 10",
                            "span-11": "span 11 / span 11",
                            "span-12": "span 12 / span 12",
                            "span-full": "1 / -1",
                        },
                        gridColumnEnd: {
                            auto: "auto",
                            1: "1",
                            2: "2",
                            3: "3",
                            4: "4",
                            5: "5",
                            6: "6",
                            7: "7",
                            8: "8",
                            9: "9",
                            10: "10",
                            11: "11",
                            12: "12",
                            13: "13",
                        },
                        gridColumnStart: {
                            auto: "auto",
                            1: "1",
                            2: "2",
                            3: "3",
                            4: "4",
                            5: "5",
                            6: "6",
                            7: "7",
                            8: "8",
                            9: "9",
                            10: "10",
                            11: "11",
                            12: "12",
                            13: "13",
                        },
                        gridRow: {
                            auto: "auto",
                            "span-1": "span 1 / span 1",
                            "span-2": "span 2 / span 2",
                            "span-3": "span 3 / span 3",
                            "span-4": "span 4 / span 4",
                            "span-5": "span 5 / span 5",
                            "span-6": "span 6 / span 6",
                            "span-full": "1 / -1",
                        },
                        gridRowStart: {
                            auto: "auto",
                            1: "1",
                            2: "2",
                            3: "3",
                            4: "4",
                            5: "5",
                            6: "6",
                            7: "7",
                        },
                        gridRowEnd: {
                            auto: "auto",
                            1: "1",
                            2: "2",
                            3: "3",
                            4: "4",
                            5: "5",
                            6: "6",
                            7: "7",
                        },
                        gridTemplateColumns: {
                            none: "none",
                            1: "repeat(1, minmax(0, 1fr))",
                            2: "repeat(2, minmax(0, 1fr))",
                            3: "repeat(3, minmax(0, 1fr))",
                            4: "repeat(4, minmax(0, 1fr))",
                            5: "repeat(5, minmax(0, 1fr))",
                            6: "repeat(6, minmax(0, 1fr))",
                            7: "repeat(7, minmax(0, 1fr))",
                            8: "repeat(8, minmax(0, 1fr))",
                            9: "repeat(9, minmax(0, 1fr))",
                            10: "repeat(10, minmax(0, 1fr))",
                            11: "repeat(11, minmax(0, 1fr))",
                            12: "repeat(12, minmax(0, 1fr))",
                        },
                        gridTemplateRows: {
                            none: "none",
                            1: "repeat(1, minmax(0, 1fr))",
                            2: "repeat(2, minmax(0, 1fr))",
                            3: "repeat(3, minmax(0, 1fr))",
                            4: "repeat(4, minmax(0, 1fr))",
                            5: "repeat(5, minmax(0, 1fr))",
                            6: "repeat(6, minmax(0, 1fr))",
                        },
                        height: (theme) => (Object.assign(Object.assign({ auto: "auto" }, theme("spacing")), { "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", full: "100%", screen: "100vh" })),
                        inset: (theme, { negative }) => (Object.assign(Object.assign(Object.assign({ auto: "auto" }, theme("spacing")), negative(theme("spacing"))), { "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%", "-1/2": "-50%", "-1/3": "-33.333333%", "-2/3": "-66.666667%", "-1/4": "-25%", "-2/4": "-50%", "-3/4": "-75%", "-full": "-100%" })),
                        keyframes: false,
                        letterSpacing: {
                            0: "0",
                            1: "1px",
                            2: "2px",
                            4: "4px",
                        },
                        lineHeight: {
                            none: "1",
                            12: "12px",
                            16: "16px",
                            18: "18px",
                            20: "20px",
                            24: "24px",
                            28: "28px",
                            32: "32px",
                            36: "36px",
                            42: "42px",
                            48: "48px",
                            52: "52px",
                            64: "64px",
                        },
                        listStyleType: {
                            none: "none",
                            disc: "disc",
                            decimal: "decimal",
                        },
                        margin: (theme, { negative }) => (Object.assign(Object.assign({ auto: "auto" }, theme("spacing")), negative(theme("spacing")))),
                        maxHeight: (theme) => (Object.assign(Object.assign({}, theme("spacing")), { full: "100%", screen: "100vh" })),
                        maxWidth: (theme, { breakpoints }) => (Object.assign({ full: "100%" }, breakpoints(theme("screens")))),
                        minHeight: {
                            0: "0px",
                            full: "100%",
                            screen: "100vh",
                        },
                        minWidth: {
                            0: "0px",
                            full: "100%",
                        },
                        // 暂且无用
                        objectPosition: false,
                        opacity: {
                            0: "0",
                            5: "0.05",
                            10: "0.1",
                            20: "0.2",
                            25: "0.25",
                            30: "0.3",
                            40: "0.4",
                            50: "0.5",
                            60: "0.6",
                            70: "0.7",
                            75: "0.75",
                            80: "0.8",
                            90: "0.9",
                            95: "0.95",
                            100: "1",
                        },
                        // 暂且无用
                        order: false,
                        // 暂且无用
                        outline: false,
                        padding: (theme) => theme("spacing"),
                        // 暂且无用
                        placeholderColor: false,
                        // 暂且无用
                        placeholderOpacity: false,
                        ringColor: (theme) => (Object.assign({ DEFAULT: theme("colors.blue.500", "#3b82f6") }, theme("colors"))),
                        ringOffsetColor: (theme) => theme("colors"),
                        ringOffsetWidth: {
                            0: "0px",
                            1: "1px",
                            2: "2px",
                            4: "4px",
                            8: "8px",
                        },
                        ringOpacity: (theme) => (Object.assign({ DEFAULT: "0.5" }, theme("opacity"))),
                        ringWidth: {
                            DEFAULT: "3px",
                            0: "0px",
                            1: "1px",
                            2: "2px",
                            4: "4px",
                            8: "8px",
                        },
                        rotate: {
                            "-180": "-180deg",
                            "-90": "-90deg",
                            "-45": "-45deg",
                            45: "45deg",
                            90: "90deg",
                            180: "180deg",
                        },
                        scale: {
                            0: "0",
                            50: ".5",
                            75: ".75",
                            90: ".9",
                            95: ".95",
                            100: "1",
                            105: "1.05",
                            110: "1.1",
                            125: "1.25",
                            150: "1.5",
                        },
                        // 暂且无用
                        skew: false,
                        space: (theme, { negative }) => (Object.assign(Object.assign({}, theme("spacing")), negative(theme("spacing")))),
                        // 暂且无用
                        stroke: false,
                        // 暂且无用
                        strokeWidth: false,
                        textColor: (theme) => theme("colors"),
                        textOpacity: (theme) => theme("opacity"),
                        transformOrigin: {
                            center: "center",
                            top: "top",
                            "top-right": "top right",
                            right: "right",
                            "bottom-right": "bottom right",
                            bottom: "bottom",
                            "bottom-left": "bottom left",
                            left: "left",
                            "top-left": "top left",
                        },
                        transitionDelay: {
                            75: "75ms",
                            100: "100ms",
                            150: "150ms",
                            200: "200ms",
                            300: "300ms",
                            500: "500ms",
                            700: "700ms",
                            1000: "1000ms",
                        },
                        transitionDuration: {
                            DEFAULT: "150ms",
                            75: "75ms",
                            100: "100ms",
                            150: "150ms",
                            200: "200ms",
                            300: "300ms",
                            500: "500ms",
                            700: "700ms",
                            1000: "1000ms",
                        },
                        transitionProperty: {
                            none: "none",
                            all: "all",
                            DEFAULT: "background-color, border-color, color, fill, stroke, opacity, box-shadow, transform",
                            colors: "background-color, border-color, color, fill, stroke",
                            opacity: "opacity",
                            shadow: "box-shadow",
                            transform: "transform",
                        },
                        transitionTimingFunction: {
                            DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
                            linear: "linear",
                            in: "cubic-bezier(0.4, 0, 1, 1)",
                            out: "cubic-bezier(0, 0, 0.2, 1)",
                            "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
                        },
                        translate: (theme, { negative }) => (Object.assign(Object.assign(Object.assign({}, theme("spacing")), negative(theme("spacing"))), { "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%", "-1/2": "-50%", "-1/3": "-33.333333%", "-2/3": "-66.666667%", "-1/4": "-25%", "-2/4": "-50%", "-3/4": "-75%", "-full": "-100%" })),
                        width: (theme) => (Object.assign(Object.assign({ auto: "auto" }, theme("spacing")), { 84: "84px", 120: "120px", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%", screen: "100vw" })),
                        zIndex: {
                            auto: "auto",
                            0: "0",
                            10: "10",
                            20: "20",
                            30: "30",
                            40: "40",
                            50: "50",
                        },
                    },
                    variantOrder: [
                        "first",
                        "last",
                        "odd",
                        "even",
                        "visited",
                        "checked",
                        "group-hover",
                        "group-focus",
                        "focus-within",
                        "hover",
                        "focus",
                        "focus-visible",
                        "active",
                        "disabled",
                    ],
                    variants: {
                        accessibility: ["responsive", "focus-within", "focus"],
                        alignContent: ["responsive"],
                        alignItems: ["responsive"],
                        alignSelf: ["responsive"],
                        animation: ["responsive"],
                        appearance: ["responsive"],
                        backgroundAttachment: ["responsive"],
                        backgroundClip: ["responsive"],
                        backgroundColor: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        backgroundImage: ["responsive"],
                        backgroundOpacity: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        backgroundPosition: ["responsive"],
                        backgroundRepeat: ["responsive"],
                        backgroundSize: ["responsive"],
                        borderCollapse: ["responsive"],
                        borderColor: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        borderOpacity: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        borderRadius: ["responsive"],
                        borderStyle: ["responsive"],
                        borderWidth: ["responsive"],
                        boxShadow: [
                            "responsive",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        boxSizing: ["responsive"],
                        clear: ["responsive"],
                        container: ["responsive"],
                        cursor: ["responsive"],
                        display: ["responsive"],
                        divideColor: ["responsive", "dark"],
                        divideOpacity: ["responsive", "dark"],
                        divideStyle: ["responsive"],
                        divideWidth: ["responsive"],
                        fill: ["responsive"],
                        flex: ["responsive"],
                        flexDirection: ["responsive"],
                        flexGrow: ["responsive"],
                        flexShrink: ["responsive"],
                        flexWrap: ["responsive"],
                        float: ["responsive"],
                        fontFamily: ["responsive"],
                        fontSize: ["responsive"],
                        fontSmoothing: ["responsive"],
                        fontStyle: ["responsive"],
                        fontVariantNumeric: ["responsive"],
                        fontWeight: ["responsive"],
                        gap: ["responsive"],
                        gradientColorStops: ["responsive", "dark", "hover", "focus"],
                        gridAutoColumns: ["responsive"],
                        gridAutoFlow: ["responsive"],
                        gridAutoRows: ["responsive"],
                        gridColumn: ["responsive"],
                        gridColumnEnd: ["responsive"],
                        gridColumnStart: ["responsive"],
                        gridRow: ["responsive"],
                        gridRowEnd: ["responsive"],
                        gridRowStart: ["responsive"],
                        gridTemplateColumns: ["responsive"],
                        gridTemplateRows: ["responsive"],
                        height: ["responsive"],
                        inset: ["responsive"],
                        justifyContent: ["responsive"],
                        justifyItems: ["responsive"],
                        justifySelf: ["responsive"],
                        letterSpacing: ["responsive"],
                        lineHeight: ["responsive"],
                        listStylePosition: ["responsive"],
                        listStyleType: ["responsive"],
                        margin: ["responsive"],
                        maxHeight: ["responsive"],
                        maxWidth: ["responsive"],
                        minHeight: ["responsive"],
                        minWidth: ["responsive"],
                        objectFit: ["responsive"],
                        objectPosition: ["responsive"],
                        opacity: [
                            "responsive",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        order: ["responsive"],
                        outline: ["responsive", "focus-within", "focus"],
                        overflow: ["responsive"],
                        overscrollBehavior: ["responsive"],
                        padding: ["responsive"],
                        placeContent: ["responsive"],
                        placeItems: ["responsive"],
                        placeSelf: ["responsive"],
                        placeholderColor: ["responsive", "dark", "focus"],
                        placeholderOpacity: ["responsive", "dark", "focus"],
                        pointerEvents: ["responsive"],
                        position: ["responsive"],
                        resize: ["responsive"],
                        ringColor: ["responsive", "dark", "focus-within", "focus"],
                        ringOffsetColor: ["responsive", "dark", "focus-within", "focus"],
                        ringOffsetWidth: ["responsive", "focus-within", "focus"],
                        ringOpacity: ["responsive", "dark", "focus-within", "focus"],
                        ringWidth: ["responsive", "focus-within", "focus"],
                        rotate: ["responsive", "hover", "focus"],
                        scale: ["responsive", "hover", "focus"],
                        skew: ["responsive", "hover", "focus"],
                        space: ["responsive"],
                        stroke: ["responsive"],
                        strokeWidth: ["responsive"],
                        tableLayout: ["responsive"],
                        textAlign: ["responsive"],
                        textColor: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        textDecoration: [
                            "responsive",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        textOpacity: [
                            "responsive",
                            "dark",
                            "group-hover",
                            "focus-within",
                            "hover",
                            "focus",
                        ],
                        textOverflow: ["responsive"],
                        textTransform: ["responsive"],
                        transform: ["responsive"],
                        transformOrigin: ["responsive"],
                        transitionDelay: ["responsive"],
                        transitionDuration: ["responsive"],
                        transitionProperty: ["responsive"],
                        transitionTimingFunction: ["responsive"],
                        translate: ["responsive", "hover", "focus"],
                        userSelect: ["responsive"],
                        verticalAlign: ["responsive"],
                        visibility: ["responsive"],
                        whitespace: ["responsive"],
                        width: ["responsive"],
                        wordBreak: ["responsive"],
                        zIndex: ["responsive", "focus-within", "focus"],
                    },
                    plugins: [],
                };
                const tailwindReplacements = {};
                const { spacing, fontSize, fontWeight, lineHeight, colors, borderWidth, borderRadius, } = tailwindConfig.theme;
                // spacing - width height
                Object.keys(spacing).forEach((key) => {
                    tailwindReplacements[`width: ${spacing[key]};`] = `w-${key}`;
                    tailwindReplacements[`height: ${spacing[key]};`] = `h-${key}`;
                });
                // font-size
                Object.keys(fontSize).forEach((key) => {
                    tailwindReplacements[`font-size: ${fontSize[key]};`] = `text-${key}`;
                });
                // font-weight
                Object.keys(fontWeight).forEach((key) => {
                    tailwindReplacements[`font-weight: ${fontWeight[key]};`] = `font-${key}`;
                });
                // line-height
                Object.keys(lineHeight).forEach((key) => {
                    tailwindReplacements[`line-height: ${lineHeight[key]};`] = `leading-${key}`;
                });
                // colors
                Object.keys(colors).forEach((key) => {
                    if (typeof colors[key] === "string") {
                        tailwindReplacements[`color: ${colors[key]};`] = `text-${key}`;
                        tailwindReplacements[`background-color: ${colors[key]};`] = `bg-${key}`;
                        tailwindReplacements[`border-color: ${colors[key]};`] = `border-${key}`;
                    }
                    else {
                        Object.keys(colors[key]).forEach((k) => {
                            tailwindReplacements[`color: ${colors[key][k]};`] = `text-${key}-${k}`;
                            tailwindReplacements[`background-color: ${colors[key][k]};`] = `bg-${key}-${k}`;
                            tailwindReplacements[`border-color: ${colors[key][k]};`] = `bg-${key}-${k}`;
                        });
                    }
                });
                // border-width
                Object.keys(borderWidth).forEach((key) => {
                    tailwindReplacements[`border-width: ${borderWidth[key]};`] = `border${key === "DEFAULT" ? "" : `-${key}`}`;
                });
                // border-style
                tailwindReplacements["border-style: solid;"] = "border-solid";
                // border-radius
                Object.keys(borderRadius).forEach((key) => {
                    tailwindReplacements[`border-radius: ${borderRadius[key]};`] = `rounded-${key}`;
                });
                let unusedStyle = [];
                let finalClassName = [];
                styleNotSubstituted.forEach((o) => {
                    if (tailwindReplacements[o]) {
                        finalClassName.push(tailwindReplacements[o]);
                    }
                    else {
                        unusedStyle.push(o);
                    }
                });
                console.log(finalClassName, unusedStyle, tailwindReplacements);
                figma.ui.postMessage({
                    copiedText: finalClassName.join(" "),
                    unusedStyle,
                    type: "tailwind",
                });
            }
        }
    }
    else if (figma.command === "setting") {
        figma.ui.postMessage({ setting: true, data: setting });
        figma.ui.resize(700, 600);
        figma.ui.show();
    }
});
figma.ui.onmessage = (message) => {
    if (message.quit) {
        if (message.type === "react" || message.type === "css") {
            figma.closePlugin(`💅 ${message.type === "react" ? "React" : "CSS"} style copied`);
        }
        else if (message.type === "tailwind") {
            figma.closePlugin(`💅 tailwind class copied${message.unused && message.unused.length
                ? `, ${message.unused.join("")}`
                : ""}`);
        }
    }
    else if (message.updateSetting) {
        figma.clientStorage.setAsync(storageKey, JSON.stringify(message.updateSetting));
        figma.closePlugin("😀 Settings applied");
    }
    else if (message.cancelSetting) {
        figma.closePlugin("Settings canceled");
    }
};
