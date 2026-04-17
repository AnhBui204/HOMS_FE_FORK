import api from './api';

/**
 * Upload an array of files to the backend for Cloudinary processing.
 *
 * @param {File[]} fileArray - Array of raw `File` objects from input (images/videos).
 * @returns {Promise<Array>} - Array of Cloudinary objects `{ url, publicId, resourceType }`.
 */
export const uploadSurveyMedia = async (fileArray = []) => {
  if (!fileArray.length) return [];

  const formData = new FormData();
  
  fileArray.forEach(file => {
    // Ant Design's Upload component wraps the native File. We extract it to avoid `[object Object]` serialization.
    const actualFile = file.originFileObj ? file.originFileObj : file;
    formData.append('media', actualFile);
  });

  try {
    const response = await api.post('/uploads/survey-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data?.success) {
      return response.data.data;
    } 

    throw new Error(response.data?.message || 'Failed to upload media files');
  } catch (error) {
    console.error('uploadSurveyMedia error:', error);
    throw error;
  }
};
