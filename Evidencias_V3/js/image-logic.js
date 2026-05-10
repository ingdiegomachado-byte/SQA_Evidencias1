/**
 * Evidencias SQA — image-logic.js
 * Lógica de procesamiento de imágenes, headers y miniaturas.
 */

const HEADER_HEIGHT = 100;

export async function processImageWithHeader(bitmap, contextLabel = "Captura de pantalla") {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let targetWidth = bitmap.width;
    if (targetWidth > 1280) targetWidth = 1280;
    if (targetWidth < 627 && bitmap.width < 627) targetWidth = bitmap.width;
    else if (targetWidth < 627) targetWidth = 627;

    const scale = targetWidth / bitmap.width;
    const targetHeight = bitmap.height * scale;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight + HEADER_HEIGHT;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    await drawEvidenceHeader(ctx, canvas.width, HEADER_HEIGHT, contextLabel);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, HEADER_HEIGHT, canvas.width, targetHeight);
    ctx.drawImage(bitmap, 0, HEADER_HEIGHT, targetWidth, targetHeight);
    
    return canvas;
}

async function drawEvidenceHeader(ctx, canvasWidth, headerHeight, contextLabel) {
    return new Promise(resolve => {
        ctx.save();
        ctx.fillStyle = "#002b55"; 
        ctx.fillRect(0, 0, canvasWidth, headerHeight);
        ctx.fillStyle = "#FF6B00";
        ctx.fillRect(0, headerHeight - 4, canvasWidth, 4);

        const logoImg = new Image();
        logoImg.onload = async () => {
            ctx.drawImage(logoImg, 15, 25, 70, 50);
            await finishHeader();
        };
        logoImg.onerror = async () => { 
            ctx.fillStyle = "#FF6B00";
            ctx.fillRect(15, 25, 70, 50);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px 'Segoe UI', sans-serif";
            ctx.fillText("SQA", 28, 40);
            await finishHeader();
        };
        logoImg.src = "Media/SQA.png";

        async function finishHeader() {
            ctx.textBaseline = "top";
            ctx.font = "bold 22px 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Evidencia de prueba QA", 100, 18);

            ctx.font = "600 14px 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("ID: " + contextLabel, 100, 45);

            ctx.font = "italic 13px 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#cbd5e0"; 
            const brow = await getBrowserVersion();
            const dateStr = formatDate(new Date());
            const os = getOS();
            const resolution = `${window.screen.width}x${window.screen.height}`;
            ctx.fillText(`📅 ${dateStr}    💻 ${brow.browserName} ${brow.fullVersion}    🌐 ${os}    🖥️ ${resolution}`, 100, 68);

            ctx.restore();
            resolve();
        }
    });
}

function pad(n) { return String(n).padStart(2, "0"); }

export function formatDate(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const ampm = h >= 12 ? "p.m." : "a.m.";
    let h12 = h % 12 || 12;
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${h12}:${pad(m)}:${pad(s)} ${ampm}`;
}

async function getBrowserVersion() {
    let browserName = "N/A", fullVersion = "N/A", ua = navigator.userAgent;
    try {
        if (navigator.userAgentData?.getHighEntropyValues) {
            const uaData = await navigator.userAgentData.getHighEntropyValues(['fullVersionList']);
            const info = uaData.fullVersionList?.find(b => b.brand === "Microsoft Edge" || b.brand === "Google Chrome");
            if (info) {
                browserName = info.brand.includes("Edge") ? "Edge" : "Chrome";
                fullVersion = info.version;
            }
        } else if (ua.indexOf("Edg/") !== -1) {
            browserName = "Edge";
            fullVersion = ua.split("Edg/")[1].split(" ")[0];
        } else if (ua.indexOf("Chrome/") !== -1) {
            browserName = "Chrome";
            fullVersion = ua.split("Chrome/")[1].split(" ")[0];
        }
    } catch (e) { }
    return { browserName, fullVersion };
}

function getOS() {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
    let os = "N/A";

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'macOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (!os && /Linux/.test(platform)) {
        os = 'Linux';
    }
    return os;
}

export async function buildThumbnail(dataUrl, maxWidth = 320) {
    if (!dataUrl) return dataUrl;
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;
            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
    });
}
