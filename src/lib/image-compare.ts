import html2canvas from "html2canvas";

export interface CompareResult {
  score: number; // 0-100 percentage
  matchingPixels: number;
  totalPixels: number;
  diffImageData?: ImageData;
}

/**
 * Captures an iframe's content as ImageData
 */
async function captureIframe(
  iframe: HTMLIFrameElement,
  width: number,
  height: number
): Promise<ImageData> {
  const doc = iframe.contentDocument;
  if (!doc || !doc.body) {
    throw new Error("Cannot access iframe content");
  }

  const canvas = await html2canvas(doc.body, {
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scale: 1,
    logging: false,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Cannot get canvas context");
  }

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Loads an image URL as ImageData
 */
async function loadImageAsData(
  imageUrl: string,
  width: number,
  height: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Cannot get canvas context"));
        return;
      }

      // Draw image scaled to target dimensions
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

/**
 * Compares two ImageData objects and returns similarity score
 * Uses pixel-by-pixel comparison similar to CSS Battle
 */
function compareImageData(
  imgData1: ImageData,
  imgData2: ImageData,
  generateDiff = false
): CompareResult {
  const data1 = imgData1.data;
  const data2 = imgData2.data;
  const totalPixels = imgData1.width * imgData1.height;

  let matchingPixels = 0;
  let diffData: Uint8ClampedArray | undefined;

  if (generateDiff) {
    diffData = new Uint8ClampedArray(data1.length);
  }

  // Compare pixel by pixel (RGBA values)
  for (let i = 0; i < data1.length; i += 4) {
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];
    const a1 = data1[i + 3];

    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];
    const a2 = data2[i + 3];

    // Check if pixels match (with small tolerance for anti-aliasing)
    const tolerance = 5;
    const matches =
      Math.abs(r1 - r2) <= tolerance &&
      Math.abs(g1 - g2) <= tolerance &&
      Math.abs(b1 - b2) <= tolerance &&
      Math.abs(a1 - a2) <= tolerance;

    if (matches) {
      matchingPixels++;
      if (diffData) {
        // Matching pixel - show as semi-transparent
        diffData[i] = r1;
        diffData[i + 1] = g1;
        diffData[i + 2] = b1;
        diffData[i + 3] = 100;
      }
    } else if (diffData) {
      // Non-matching pixel - highlight in red
      diffData[i] = 255;
      diffData[i + 1] = 0;
      diffData[i + 2] = 0;
      diffData[i + 3] = 200;
    }
  }

  const score = (matchingPixels / totalPixels) * 100;

  return {
    score: Math.round(score * 100) / 100,
    matchingPixels,
    totalPixels,
    diffImageData: diffData
      ? new ImageData(diffData as ImageDataArray, imgData1.width, imgData1.height)
      : undefined,
  };
}

/**
 * Compares an iframe's rendered content with a target image
 * Returns a similarity score (0-100) like CSS Battle
 */
export async function compareIframeToImage(
  iframe: HTMLIFrameElement,
  targetImageUrl: string,
  width = 400,
  height = 300,
  generateDiff = false
): Promise<CompareResult> {
  const [iframeData, targetData] = await Promise.all([
    captureIframe(iframe, width, height),
    loadImageAsData(targetImageUrl, width, height),
  ]);

  return compareImageData(iframeData, targetData, generateDiff);
}

/**
 * Creates a data URL from ImageData (for displaying diff)
 */
export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Cannot get canvas context");
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
