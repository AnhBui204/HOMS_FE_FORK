/**
 * Analyzes an image or video using the Google Gemini API (REST fallback)
 * adapted for HOMS_FE Survey Input automated extraction
 *
 * Optimizations applied:
 *  1. Client-side image compression (max 900px / JPEG 75) before encoding —
 *     phone photos drop from ~8 MB to ~100–200 KB, drastically cutting upload time.
 *  2. Compact, dense prompt — fewer input tokens = faster Time-To-First-Token.
 *  3. thinkingBudget: 0 — disables gemini-2.5-flash's extended reasoning pass,
 *     which is the single largest source of latency for structured extraction.
 *
 * @param {File|File[]} file - The file(s) to analyze
 * @returns {Promise<string>} - The raw JSON string returned by Gemini
 */

/**
 * Compress an image File to max 900px on the longest side at JPEG quality 75.
 * Videos are returned as-is (canvas API cannot decode arbitrary video frames).
 */
const compressImage = (file) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const MAX_PX = 1000;
    const QUALITY = 0.8;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_PX);
          width = MAX_PX;
        } else {
          width = Math.round((width / height) * MAX_PX);
          height = MAX_PX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export const analyzeMedia = async (file) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Hệ thống thiếu cấu hình API Key GEMINI AI.');
  }

  const fileArray = Array.isArray(file) ? file : [file];
  if (fileArray.length === 0) {
    throw new Error('Chưa có file nào được cung cấp.');
  }

  // ── 1. Compress images in parallel before base64 encoding ────────────────
  const compressedFiles = await Promise.all(fileArray.map(compressImage));

  // ── 2. Convert all files to Base64 parts in parallel ─────────────────────
  const mediaParts = await Promise.all(
    compressedFiles.map(async (f) => {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      return { inlineData: { mimeType: f.type, data: base64Data } };
    })
  );

  const imageCount = fileArray.length;
  const multiImageNote =
    imageCount > 1
      ? `${imageCount} media files (index 0–${imageCount - 1}). In "imageIndices" list ALL indices where item appears; in "boundingBoxes" one entry per source image.`
      : `1 media file. Set "imageIndices":[0] and one bounding box for every item.`;

  // ── 3. Compact prompt — fewer tokens → faster TTFT ───────────────────────
  const prompt = `You are a Vietnamese moving logistics expert.
Analyze the media. Identify ALL visible items. ALL text (name, notes) MUST be in Vietnamese.
${multiImageNote}
Return ONLY valid JSON in this exact shape (no markdown, no extra fields):
{
  "items": [{
    "name": "Tên đồ vật",
    "category": "primary",
    "actualWeight": 25,
    "actualVolume": 0.5,
    "actualDimensions": {"length": 190, "width": 90, "height": 40},
    "condition": "GOOD",
    "notes": "Ghi chú",
    "imageIndices": [0],
    "boundingBoxes": [{"imageIndex": 0, "centerX": 0.5, "centerY": 0.5, "width": 0.3, "height": 0.3}]
  }],
  "totalActualWeight": 25,
  "totalActualVolume": 0.5,
  "totalActualItems": 1,
  "suggestedVehicle": "500KG",
  "suggestedStaffCount": 2,
  "notes": "Ghi chú tổng quan"
}
Rules:
- category: "primary" for large/heavy items (bed, sofa, fridge, TV, wardrobe, washing machine, motorbike); "secondary" for small items (books, clothes, bowls, lamps, fans, plants, mirrors, curtains, toys, shoes, boxes, toiletries, small appliances).
- Realistic non-zero numbers for weight (kg), volume (m³), dimensions (cm).
- suggestedVehicle: "500KG" ≤400kg/1.5m³ | "1TON" ≤800kg/3m³ | "1.5TON" ≤1200kg/5m³ | "2TON" heavier.
- suggestedStaffCount: min 2, +1 per ~300 kg or bulky item (piano, side-by-side fridge, large sofa set), max 6.
- boundingBoxes: centerX/Y/width/height normalized 0–1. Always include for image items.`;

  // ── 4. Call gemini-2.5-flash with thinking disabled ───────────────────────
  // thinkingBudget: 0 turns off the extended reasoning pass — the largest
  // single source of latency for structured JSON extraction tasks.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [...mediaParts, { text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to analyze media');
    }

    const parts = data.candidates?.[0]?.content?.parts;
    if (parts?.length > 0) return parts[0].text;

    throw new Error('Empty response from AI completely.');
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};
