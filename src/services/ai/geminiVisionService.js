/**
 * Analyzes an image or video using the Google Gemini API (REST fallback)
 * adapted for HOMS_FE Survey Input automated extraction
 * 
 * @param {File} file - The file to analyze
 * @returns {Promise<string>} - The raw JSON string returned by Gemini
 */
export const analyzeMedia = async (file) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Hệ thống thiếu cấu hình API Key GEMINI AI.');
  }

  const fileArray = Array.isArray(file) ? file : [file];
  if (fileArray.length === 0) {
    throw new Error('Chưa có file nào được cung cấp.');
  }

  // Convert all files to Base64 parts
  const mediaParts = await Promise.all(fileArray.map(async (f) => {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    
    return {
      inlineData: {
        mimeType: f.type,
        data: base64Data
      }
    };
  }));

  const imageCount = fileArray.length;
  const multiImageNote = imageCount > 1
    ? `There are ${imageCount} media files provided (Image/Video 0, 1, ... ${imageCount - 1}). For each item, list ALL media indices (0-based) where it appears in the "imageIndices" field. If the same item appears in multiple media, combine counts and list all source images. In addition, for each distinct media index where the item appears, provide a precise bounding box in the "boundingBoxes" field so the UI can highlight the item's location.`
    : `There is 1 media file provided. Set "imageIndices": [0] for all items. Also provide ONE bounding box for this item in the "boundingBoxes" field.`;

  const prompt = `You are an expert moving logistics coordinator in Vietnam.
Analyze the provided media and identify ALL visible items.
IMPORTANT: All text fields (name, notes) MUST be in Vietnamese.
${multiImageNote}
Return ONLY a valid JSON object. Use realistic estimated numbers for each item based on what you see.
Example of a valid response format (replace with actual values you estimate):
{
  "items": [
    {
      "name": "Giường đơn",
      "category": "primary",
      "actualWeight": 28.5,
      "actualDimensions": { "length": 190, "width": 90, "height": 30 },
      "actualVolume": 0.51,
      "condition": "GOOD",
      "notes": "Khung gỗ, tình trạng tốt",
      "imageIndices": [0],
      "boundingBoxes": [
        {
          "imageIndex": 0,
          "centerX": 0.45,
          "centerY": 0.62,
          "width": 0.35,
          "height": 0.25
        }
      ]
    },
    {
      "name": "Đèn bàn",
      "category": "secondary",
      "actualWeight": 1.5,
      "actualDimensions": { "length": 20, "width": 20, "height": 40 },
      "actualVolume": 0.016,
      "condition": "GOOD",
      "notes": "Đèn nhỏ, dễ vỡ",
      "imageIndices": [0, 1],
      "boundingBoxes": [
        {
          "imageIndex": 0,
          "centerX": 0.18,
          "centerY": 0.33,
          "width": 0.12,
          "height": 0.18
        },
        {
          "imageIndex": 1,
          "centerX": 0.52,
          "centerY": 0.40,
          "width": 0.10,
          "height": 0.16
        }
      ]
    }
  ],
  "totalActualWeight": 30,
  "totalActualVolume": 0.53,
  "totalActualItems": 2,
  "notes": "Chuyển nhà nhỏ, ít đồ đạc"
}
Rules:
- category: use 'primary' for large/heavy furniture (beds, sofas, fridges, TVs, wardrobes, washing machines, motorcycles); use 'secondary' for small items (books, clothes, bowls, lamps, fans, plants, mirrors, curtains, toys, shoes, boxes, toiletries, small appliances).
- Estimate realistic weight (kg), dimensions (cm), and volume (m³) for EVERY item — do NOT use 0.
- All numeric fields must be plain numbers (not strings).
 - imageIndices must be an array of integer media indices (0-based).
 - boundingBoxes must be an array of objects. Each object MUST have: "imageIndex" (integer matching one entry from imageIndices), and four numbers "centerX", "centerY", "width", "height" — all normalized between 0 and 1 relative to that media frame. centerX/centerY are the center of the item in the frame; width/height are the approximate size of the item.
 - If you are not sure of the exact size, still provide your best estimate for the bounding box; never omit boundingBoxes for items that appear in an image.
- Do not add any extra fields, comments, or markdown.`;




  // We use the REST API to avoid any Browser/Node SDK mismatch issues entirely.
  // gemini-2.5-flash with responseMimeType forces strict JSON output
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          ...mediaParts,
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to analyze media');
    }

    // Extract the text content from the Gemini response structure
    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content?.parts;
      if (parts && parts.length > 0) {
        return parts[0].text;
      }
    }

    throw new Error('Empty response from AI completely.');
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
