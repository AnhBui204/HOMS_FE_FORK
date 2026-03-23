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

  const prompt = `You are an expert appraiser and moving logistics coordinator working in Vietnam.
Examine the provided media carefully.
IMPORTANT LANGUAGE REQUIREMENT: All text fields in your response (item "name", "notes", and the top-level "notes") MUST be written in Vietnamese. Do not use English for any descriptive text.
Please provide your analysis strictly in the following JSON format without any markdown wrappers or codeblocks (just the raw JSON string):
{
  "items": [
    {
      "name": "Chuỗi (Tên đồ vật được nhận diện, viết bằng tiếng Việt)",
      "category": "String (Must be EXACTLY one of: 'primary' or 'secondary'. Use 'primary' for large/heavy furniture like beds, wardrobes, sofas, refrigerators, washing machines, TVs, motorcycles. Use 'secondary' for small, light, miscellaneous items like bowls, clothes, books, shoes, lamps, fans, small appliances, plants, mirrors, curtains, toys, toiletries, boxes.)",
      "actualWeight": "Number (Estimated weight in kg)",
      "actualDimensions": {
        "length": "Number (in cm)",
        "width": "Number (in cm)",
        "height": "Number (in cm)"
      },
      "actualVolume": "Number (Estimated volume in cubic meters)",
      "condition": "String (Must be EXACTLY one of: 'GOOD', 'DAMAGED', 'FRAGILE')",
      "notes": "Chuỗi (Ghi chú về chất liệu hoặc cách xử lý, viết bằng tiếng Việt)"
    }
  ],
  "totalActualWeight": "Number (Total sum of weights)",
  "totalActualVolume": "Number (Total sum of volumes)",
  "totalActualItems": "Number (Total count of items)",
  "suggestedVehicle": "String (Must be EXACTLY one of: '500KG', '1TON', '1.5TON', '2TON')",
  "suggestedStaffCount": "Number (Minimum 1)",
  "notes": "Chuỗi (Nhận xét chung về buổi chuyển nhà, viết bằng tiếng Việt)"
}`;


  // We use the REST API to avoid any Browser/Node SDK mismatch issues entirely.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          ...mediaParts,
          {
            text: prompt
          }
        ]
      }
    ]
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
