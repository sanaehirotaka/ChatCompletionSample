// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

hljs.addPlugin(new CopyButtonPlugin());

marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    tables: true,
    breaks: true,
    pedantic: false,
    sanitize: true,
    html: false,
    smartLists: false,
    smartypants: false
});

class MessageType {
    static system = 1;
    static assistant = 2;
    static user = 4;
}

class InlineDataType {
    static image = 1;
}

class TextReader {

    static #decoders = [
        new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }),
        new TextDecoder('shift_jis', { fatal: true }),
        new TextDecoder('euc-jp', { fatal: true })
    ];

    async decode(file) {
        const buffer = await file.arrayBuffer();
        for (let decoder of TextReader.#decoders) {
            try {
                return decoder.decode(buffer);
            } catch { }
        }
        return null;
    }
}
class FileReaderAsync {
    readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    readAsBinaryString(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsBinaryString(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function fetchAsJson(url, request) {
    const res = await fetch(url, request);
    if (res.status >= 400) {
        const errorJson = await res.json();
        throw new Error(errorJson?.detail ?? JSON.stringify(errorJson));
    }
    return await res.json();
}

async function postJsonAndFetchAsJson(url, obj = {}) {
    return await fetchAsJson(url, {
        "method": "POST",
        "headers": {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'RequestVerificationToken': requestToken
        },
        "body": JSON.stringify(obj)
    });
}

function sanitize(str) {
    const sanitizeInternal = str => {
        let result = "";
        let i = 0;
        let insideBackticks = false;
        while (i < str.length) {
            if (str[i] === '`' || str[i] === "\n" && insideBackticks) {
                insideBackticks = !insideBackticks;
                result += str[i];
            } else if (!insideBackticks && str[i] === '<') {
                result += "&lt;";
            } else if (!insideBackticks && str[i] === '>') {
                result += "&gt;";
            } else {
                result += str[i];
            }
            i++;
        }
        return result;
    }
    const startSymbol = "\n```";
    const endSymbol = "\n```";
    let buf = [];
    if (str.startsWith("```") || str.indexOf(startSymbol) !== -1) {
        let start = 0;
        let end = 0;
        while ((end = start == 0 && str.startsWith("```") ? 0 : str.indexOf(endSymbol, start)) !== -1) {
            buf.push(sanitizeInternal(str.substring(start, end + 1)));
            start = end + 1;
            if ((end = str.indexOf(endSymbol, start)) !== -1) {
                buf.push(str.substring(start, end + 1));
            } else {
                buf.push(sanitizeInternal(str.substring(start)));
                start = start.length;
                break;
            }
            start = end + 1;
        }
        buf.push(sanitizeInternal(str.substring(start)));
    } else {
        buf.push(sanitizeInternal(str));
    }
    return buf.join("");
}

/**
 * @param {String} str
 * @returns
 */
function createMarkdownDocument(str) {
    const sanitized = sanitize(str);
    const parser = new DOMParser();
    const doc = parser.parseFromString(marked.marked(sanitized), "text/html");
    // highlight.js
    doc.querySelectorAll("pre code").forEach(e => {
        hljs.highlightElement(e);
        hljs.lineNumbersBlock(e);
    });
    const df = document.createDocumentFragment();
    df.append(...doc.body.children);
    return df;
}
function random() {
    return Math.random() * (2 ** 31 - 1) >>> 0;
}
function newId(prefix = "") {
    return prefix + random()
}

class HealthCheck {

    #lastCheck;
    #checkSpan = 1000 * 60 * 5;

    constructor() {
        this.#lastCheck = new Date().getTime();
    }

    async checkRequest() {
        if ((this.#lastCheck + this.#checkSpan) < new Date().getTime()) {
            const p = fetch("/Health");
            this.#lastCheck = new Date().getTime();
            await p;
        }
    }
}

const healthCheck = new HealthCheck();

document.addEventListener("input", healthCheck.checkRequest.bind(healthCheck));
document.addEventListener("mousemove", healthCheck.checkRequest.bind(healthCheck));
