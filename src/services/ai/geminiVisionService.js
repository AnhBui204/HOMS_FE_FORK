/**
 * Analyzes an image or video using the Google Gemini API (REST fallback)
 * adapted for HOMS_FE Survey Input automated extraction
 *
 * Optimizations applied:
 *  1. Client-side image compression (max 1000px / JPEG 80) before encoding —
 *     phone photos drop from ~8 MB to ~100–200 KB, drastically cutting upload time.
 *  2. Compact, dense prompt — fewer input tokens = faster Time-To-First-Token.
 *  3. thinkingBudget: 0 — disables gemini-2.5-flash's extended reasoning pass,
 *     which is the single largest source of latency for structured extraction.
 *
 * @param {File|File[]} file - The file(s) to analyze
 * @returns {Promise<string>} - The raw JSON string returned by Gemini
 */

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status !== 429 && res.status >= 500 && i < retries - 1) {
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      continue;
    }
    return res; // let the calling block read the error
  }
};

/**
 * Compress an image File to max 1000px on the longest side at JPEG quality 80.
 * Video processing extracts frames instead.
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

/**
 * Extracts evenly spaced frames from a video file.
 * Note: This runs entirely client-side and may be slow for large videos.
 * This function looks at the duration and mathematically seeks through the video to extract 5 perfectly spaced snapshot frames.
 * It draws these frames into a canvas and converts them to JPEG files (maximum 1000px resolution).
 * The Result: A massive 60MB MP4 video is deleted from memory, and what gets passed to Gemini is just 5 small JPEG images (~150KB each).
 * @param {File} videoFile
 * @param {number} maxFrames 
 * @returns {Promise<File[]>} Array of JPEG images
 */
const extractVideoFrames = (videoFile, maxFrames = 5) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      const frames = [];
      const interval = duration / (maxFrames + 1);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let width = video.videoWidth;
      let height = video.videoHeight;
      const MAX_PX = 1000;
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_PX);
          width = MAX_PX;
        } else {
          width = Math.round((width / height) * MAX_PX);
          height = MAX_PX;
        }
      }
      canvas.width = width;
      canvas.height = height;

      // Sequential seeking to extract frames
      for (let i = 1; i <= maxFrames; i++) {
        video.currentTime = interval * i;
        
        await new Promise(r => {
          const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(); };
          video.addEventListener('seeked', onSeeked);
        });
        
        ctx.drawImage(video, 0, 0, width, height);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
        if (blob) {
          frames.push(new File([blob], `${videoFile.name}_frame_${i}.jpg`, { type: 'image/jpeg' }));
        }
      }
      URL.revokeObjectURL(url);
      resolve(frames);
    };
    
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load video: ${videoFile.name}`)); };
    video.src = url;
  });
};

export const analyzeMedia = async (file) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('System is missing GEMINI AI API Key configuration.');
  }

  const fileArray = Array.isArray(file) ? file : [file];
  if (fileArray.length === 0) {
    throw new Error('No files provided for analysis.');
  }

  // ── 0. Strict Video Pre-check & Frame Extraction ─────────────────────────
  const processedFiles = [];
  for (const f of fileArray) {
    if (f.type.startsWith('video/')) {
      // 150MB absolute cap to prevent memory crash before extraction
      if (f.size > 150 * 1024 * 1024) throw new Error(`Video ${f.name} exceeds 150MB limit. Please trim it.`);
      const frames = await extractVideoFrames(f, 5); // Take 5 frames
      processedFiles.push(...frames);
    } else {
      processedFiles.push(f);
    }
  }

  // ── 1. Compress extracted frames & images in parallel ───────────────────
  const compressedFiles = await Promise.all(processedFiles.map(compressImage));

  // ── 2. Convert to Base64 & Enforce Maximum Total Payload (~18MB) ────────
  let totalBase64Size = 0;
  const MAX_PAYLOAD_SIZE = 18 * 1024 * 1024; // 18MB Safe Limit

  const mediaParts = await Promise.all(
    compressedFiles.map(async (f) => {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      
      // Estimate byte size from Base64 string length
      totalBase64Size += (base64Data.length * 3) / 4;
      if (totalBase64Size > MAX_PAYLOAD_SIZE) {
         throw new Error('The total size of the uploaded media is too large. Please upload fewer items or a shorter video.');
      }
      
      return { inlineData: { mimeType: f.type, data: base64Data } };
    })
  );

  const imageCount = compressedFiles.length;
  const multiImageNote =
    imageCount > 1
      ? `${imageCount} media frames (index 0–${imageCount - 1}). In "imageIndices" list ALL indices where item appears; in "boundingBoxes" one entry per source image.`
      : `1 media frame. Set "imageIndices":[0] and one bounding box for every item.`;

  // ── 3. Structured Output Schema & Prompt ─────────────────────────────────
  const responseSchema = {
    type: "OBJECT",
    properties: {
      _reasoning: { type: "STRING", description: "Chain-of-thought: briefly explain what you see, use visual references for scale, and estimate sizes/weights before listing items." },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Tên đồ vật bằng tiếng Việt" },
            category: { type: "STRING", enum: ["primary", "secondary"] },
            actualWeight: { type: "NUMBER", description: "Weight in kg" },
            actualVolume: { type: "NUMBER", description: "Volume in m3" },
            actualDimensions: {
              type: "OBJECT",
              properties: {
                length: { type: "NUMBER" },
                width: { type: "NUMBER" },
                height: { type: "NUMBER" }
              }
            },
            condition: { type: "STRING", enum: ["GOOD", "FRAGILE", "DAMAGED"] },
            notes: { type: "STRING" },
            imageIndices: {
              type: "ARRAY",
              items: { type: "INTEGER" }
            },
            boundingBoxes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  imageIndex: { type: "INTEGER" },
                  centerX: { type: "NUMBER" },
                  centerY: { type: "NUMBER" },
                  width: { type: "NUMBER" },
                  height: { type: "NUMBER" }
                }
              }
            }
          },
          required: ["name", "category", "actualWeight", "actualVolume"]
        }
      },
      totalActualWeight: { type: "NUMBER" },
      totalActualVolume: { type: "NUMBER" },
      totalActualItems: { type: "INTEGER" },
      suggestedVehicles: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            vehicleType: { type: "STRING", enum: ["500KG", "1TON", "1.5TON", "2TON"] },
            count: { type: "INTEGER" }
          },
          required: ["vehicleType", "count"]
        }
      },
      suggestedStaffCount: { type: "INTEGER" },
      notes: { type: "STRING" }
    },
    required: ["_reasoning", "items", "totalActualWeight", "totalActualVolume", "totalActualItems", "suggestedVehicles", "suggestedStaffCount"]
  };

  const prompt = `You are a Vietnamese moving logistics expert.
Analyze the media. Identify ALL visible items. ALL text (name, notes) MUST be in Vietnamese.
${multiImageNote}

CRITICAL RULES FOR DUPLICATES:
- DO NOT count the same identical physical object multiple times if it appears in different frames!
- If an object is seen across multiple frames, list it ONLY ONCE in the JSON and put all the frame numbers into its "imageIndices" array.

Examples of realistic estimations:
- Tủ lạnh 2 cánh (Side-by-side fridge): Weight ~95kg, Volume ~1.2m³
- Giường đôi (Queen bed frame): Weight ~45kg, Volume ~0.8m³, usually disassemblable
- Hộp giấy (Carton box): Weight ~15kg, Volume ~0.1m³
- Xe máy (Motorbike): Weight ~110kg, Volume ~1.0m³

Rules:
- category: "primary" for large/heavy items (bed, sofa, fridge, TV, wardrobe, washing machine, motorbike); "secondary" for small items (books, clothes, bowls, lamps, fans, plants, mirrors, curtains, toys, shoes, boxes, toiletries, small appliances).
- Realistic non-zero numbers for weight (kg), volume (m³), dimensions (cm). Look for reference objects to estimate scale.
- suggestedVehicles: Recommend an array of optimal vehicles (e.g. [{"vehicleType": "1TON", "count": 1}]). Allowed types: "500KG" ≤400kg/1.5m³ | "1TON" ≤800kg/3m³ | "1.5TON" ≤1200kg/5m³ | "2TON" heavier. Feel free to mix types (e.g. 1 500KG + 1 2TON) to optimally handle the volume.
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
      responseSchema: responseSchema,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
    const response = await fetchWithRetry(endpoint, {
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
