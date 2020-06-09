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
figma.clientStorage.getAsync(storageKey).then(result => {
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
        const val = ("#" +
            componentToHex(Math.round(r * 255)) +
            componentToHex(Math.round(g * 255)) +
            componentToHex(Math.round(b * 255)));
        if (setting.colorHex === "short" && (val.charAt(1) == val.charAt(2)) && (val.charAt(3) == val.charAt(4)) && (val.charAt(5) == val.charAt(6))) {
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
        return str.toLowerCase() // Replaces any - or _ characters with a space 
            .replace(/[-_]+/g, ' ') // Removes any non alphanumeric characters 
            .replace(/[^\w\s]/g, '') // Uppercases the first character in each group immediately following a space 
            // (delimited by spaces) 
            .replace(/ (.)/g, function ($1) {
            return $1.toUpperCase();
        }) // Removes spaces 
            .replace(/ /g, '');
    };
    /**
     * add px after number, return 0 if 0
     * @param num
     */
    const convertNumToPx = (num) => {
        return num !== 0 ? `${num}px` : num;
    };
    const convertColorToCSS = (paint, options) => {
        if (paint.visible === false) {
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
    if ((figma.command === "css" || figma.command === "react")) {
        if (!(selection && selection.length)) {
            figma.closePlugin("❗Please select and only select one element.");
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
                    if (fontWeightMapping[fontWeight] !== 400) {
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
                        style.push(`line-height: ${value}%;`);
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
                const { blendMode } = node;
                if (blendMode !== "PASS_THROUGH") {
                    style.push(`mix-blend-mode: ${blendMode.toLowerCase().replace("_", "-")};`);
                }
            }
            /**
             * background
             */
            if (type !== "TEXT") {
                const { fills } = node;
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
            const { strokes, strokeWeight } = node;
            if (strokes && strokes.length === 1 && strokes[0].type === "SOLID") {
                style.push(`border: ${strokeWeight}px solid ${convertColorToCSS(strokes[0])};`);
            }
            /**
             * Radius
             */
            if (RADIUS_TYPES.indexOf(type) > -1) {
                const { bottomLeftRadius, bottomRightRadius, cornerRadius, topLeftRadius, topRightRadius, } = node;
                // 如果四个 radius 不同，则 cornerRadius 会是 symbol
                if (typeof cornerRadius === "number") {
                    style.push(`border-radius: ${convertNumToPx(cornerRadius)};`);
                }
                else {
                    style.push(`border-radius: ${convertNumToPx(topLeftRadius)} ${convertNumToPx(topRightRadius)} ${convertNumToPx(bottomRightRadius)} ${convertNumToPx(bottomLeftRadius)};`);
                }
            }
            /**
             * boxShadow
             */
            const { effects } = node;
            const shadows = effects.filter((o) => o.type === "DROP_SHADOW" || (type !== "TEXT" && o.type === "INNER_SHADOW"));
            if (shadows.length) {
                const shadowsStr = shadows.map(({ color, offset, radius, visible, type }) => {
                    let colorVal = "";
                    if (!visible) {
                        return "";
                    }
                    if (color.a === 1) {
                        colorVal = rgbToHex(color);
                    }
                    else {
                        colorVal = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
                    }
                    return `${type === "INNER_SHADOW" ? "inset " : ""}${convertNumToPx(offset.x)} ${convertNumToPx(offset.y)} ${convertNumToPx(radius)} ${colorVal}`;
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
            /**
             * value substitute
             */
            if (setting.valueSubstitutionEnabled) {
                try {
                    const substitutions = JSON.parse(setting.valueSubstitution);
                    console.log(substitutions, "yijie");
                    style = style.map(o => {
                        let temp = o;
                        Object.keys(substitutions).forEach(p => {
                            temp = temp.split(p).join(substitutions[p]);
                        });
                        return temp;
                    });
                }
                catch (error) {
                }
            }
            if (figma.command === "css") {
                figma.ui.postMessage({ copiedText: style.join("\n"), type: "css" });
            }
            else if (figma.command === "react") {
                const quoteStr = setting.quote === "single" ? "'" : '"';
                const copiedTexts = [];
                style.forEach((cssExpression) => {
                    const ex = cssExpression.replace(';', '').split(': ');
                    const exText = toCamelCase(ex[0]) + ": " + quoteStr + ex[1] + quoteStr + ',';
                    copiedTexts.push(exText);
                });
                figma.ui.postMessage({ copiedText: copiedTexts.join(setting.lineBreak ? "\n" : " "), type: "react" });
            }
        }
    }
    else if (figma.command === "setting") {
        figma.ui.postMessage({ setting: true, data: setting });
        figma.ui.resize(500, 300);
        figma.ui.show();
    }
});
figma.ui.onmessage = (message) => {
    if (message.quit) {
        figma.closePlugin(`💅 ${message.type === "react" ? "React" : "CSS"} style copied`);
    }
    else if (message.updateSetting) {
        figma.clientStorage.setAsync(storageKey, JSON.stringify(message.updateSetting));
        figma.closePlugin("😀 Settings applied");
    }
    else if (message.cancelSetting) {
        figma.closePlugin("Settings canceled");
    }
};
