import imgbbConfig, { demoImgbbConfig } from './imgbbConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Platform } from 'react-native';
import * as Network from 'expo-network';

/**
 * Uploads an image file to ImgBB with enhanced retry logic and better error handling
 * Uses multiple strategies to ensure upload works across different platforms
 * Automatically compresses images before upload to improve success rate
 * If uploading fails, saves the image locally as a fallback
 * 
 * @param {string} uri - The local URI of the image to upload
 * @param {string} name - Optional name for the image
 * @param {string} expiration - Optional expiration in seconds (default is 0 which means no expiration)
 * @returns {Promise<string>} - Promise that resolves to the URL of the uploaded image or local URI
 */
export const uploadImageToImgBB = async (uri, name = null, expiration = 0) => {
  if (!uri) return null;
  
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000;
  let retryCount = 0;
  let lastError = null;
  
  // First, optimize the image to reduce size and improve upload success
  let optimizedUri = uri;
  try {
    // Compress and resize the image to make uploads more reliable
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Resize to max width of 1200px while maintaining aspect ratio
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
    );
    
    optimizedUri = manipResult.uri;
  } catch (optimizeError) {
    console.error('Image optimization failed, using original:', optimizeError);
    // Continue with original image if optimization fails
  }
  
  // Check if we have a network connection
  try {
    const networkResponse = await Promise.race([
      fetch('https://www.google.com', { method: 'HEAD' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Network check timeout')), 5000))
    ]);
    
    if (!networkResponse.ok) {
      console.log('Network connection unavailable, using local storage');
      return await saveImageLocally(optimizedUri, name);
    }
  } catch (networkError) {
    console.log('Network check failed, using local storage:', networkError);
    return await saveImageLocally(optimizedUri, name);
  }
  
  // Try multiple upload strategies
  while (retryCount < MAX_RETRIES) {
    try {
      // Select the appropriate config
      const config = (imgbbConfig.apiKey && imgbbConfig.apiKey !== 'dbf1a44ce101e0bcee34e0ad90c66c09') 
        ? imgbbConfig 
        : demoImgbbConfig;
      
      // Try different upload approaches based on previous errors
      if (retryCount === 0) {
        // First attempt: Use FormData with fetch API
        const result = await uploadWithFormData(optimizedUri, config.apiKey, name, expiration, TIMEOUT_MS);
        if (result) return result;
      } else if (retryCount === 1) {
        // Second attempt: Use direct Base64 encoding
        const result = await uploadWithBase64(optimizedUri, config.apiKey, name, expiration, TIMEOUT_MS);
        if (result) return result;
      } else {
        // Third attempt: Try with a different endpoint format and more timeout
        const result = await uploadWithAlternateEndpoint(optimizedUri, config.apiKey, name, expiration, TIMEOUT_MS * 1.5);
        if (result) return result;
      }
      
      // If we get here, the current strategy failed but didn't throw
      throw new Error(`Upload strategy ${retryCount + 1} failed without error`);
    } catch (error) {
      lastError = error;
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        // Wait before retrying (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // In case of failure, save image locally as a fallback
  try {
    return await saveImageLocally(optimizedUri, name);
  } catch (localSaveError) {
    // If local save fails too, return placeholder
    if (name) {
      return getProfileImagePlaceholder(name);
    }
    throw new Error('Failed to upload or save image. Please try again later.');
  }
};

/**
 * First upload strategy: Use FormData with fetch API
 */
const uploadWithFormData = async (uri, apiKey, name, expiration, timeout) => {
  // Create FormData
  const formData = new FormData();
  
  // Get file info
  const uriParts = uri.split('.');
  const fileType = uriParts[uriParts.length - 1];
  
  // Add image to form data
  formData.append('image', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: `image/${fileType}`,
    name: `image_${Date.now()}.${fileType}`
  });
  
  // Add other parameters
  formData.append('key', apiKey);
  if (name) formData.append('name', name);
  if (expiration > 0) formData.append('expiration', expiration);
  
  // Set timeout and make request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      return data.data.display_url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Second upload strategy: Convert image to base64 and upload
 */
const uploadWithBase64 = async (uri, apiKey, name, expiration, timeout) => {
  try {
    // Read file as base64
    const base64Image = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Prepare URL with parameters
    let url = `https://api.imgbb.com/1/upload?key=${apiKey}`;
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (expiration > 0) url += `&expiration=${expiration}`;
    
    // Set timeout and make request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      body: `image=${encodeURIComponent(base64Image)}`,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      return data.data.display_url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Third upload strategy: Use a different endpoint format
 */
const uploadWithAlternateEndpoint = async (uri, apiKey, name, expiration, timeout) => {
  try {
    // Try creating a blob from the URI
    let bodyData;
    
    try {
      // Method 1: Try to create blob from uri
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;
      bodyData = JSON.stringify({ image: base64 });
    } catch (blobError) {
      // Method 2: If blob creation fails, use the uri directly
      const base64Image = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      bodyData = JSON.stringify({ image: base64Image });
    }
    
    // Set timeout and make request to alternate endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Use alternate endpoint format
    const url = `https://api.imgbb.com/1/upload`;
    
    const response = await fetch(`${url}?key=${apiKey}${name ? `&name=${encodeURIComponent(name)}` : ''}${expiration > 0 ? `&expiration=${expiration}` : ''}`, {
      method: 'POST',
      body: bodyData,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      return data.data.display_url;
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Save image locally as a fallback when network upload fails
 */
const saveImageLocally = async (uri, name) => {
  try {
    const localDir = `${FileSystem.documentDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(localDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
    }
    
    const filename = `image_${Date.now()}.jpg`;
    const newUri = `${localDir}${filename}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: newUri
    });
    
    // Save reference in AsyncStorage for retrieval
    const savedImages = await AsyncStorage.getItem('savedImages');
    const imagesObj = savedImages ? JSON.parse(savedImages) : {};
    
    // Store with name as key if provided
    const key = name || filename;
    imagesObj[key] = newUri;
    
    await AsyncStorage.setItem('savedImages', JSON.stringify(imagesObj));
    
    return newUri;
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a profile image placeholder URL
 * If no image is available, returns a placeholder from UI Avatars
 * 
 * @param {string} name - The user's name for the placeholder
 * @param {string} size - The size of the avatar (default 200)
 * @returns {string} - URL of the placeholder image
 */
export const getProfileImagePlaceholder = (name = 'User', size = 200) => {
  // Use the UI Avatars service to generate a placeholder
  const formattedName = encodeURIComponent(name || 'User');
  return `https://ui-avatars.com/api/?name=${formattedName}&size=${size}&background=4A90E2&color=fff&font-size=0.5`;
};

/**
 * Improved handler for a component's image upload functionality
 * Uses the uploadImageToImgBB function with better progress and error handling
 * 
 * @param {string} capturedImage - The URI of the captured image
 * @param {Object} formData - The current form data object
 * @param {Function} setFormData - State setter for form data
 * @param {Function} setIsCameraOpen - State setter for camera visibility
 * @param {Function} setIsUploading - State setter for upload status
 * @param {Function} setUploadProgress - Optional state setter for upload progress (0-100)
 * @returns {Promise<void>}
 */
export const handleImageUpload = async (
  capturedImage, 
  formData, 
  setFormData, 
  setIsCameraOpen, 
  setIsUploading,
  setUploadProgress = null
) => {
  if (!capturedImage) return;

  setIsUploading(true);
  if (setUploadProgress) setUploadProgress(10);

  try {
    // Update progress to show we're processing the image
    if (setUploadProgress) {
      setUploadProgress(30);
      
      // Simulate progress updates since we can't get real progress from the API
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 500);
      
      // Use the main uploadImageToImgBB function
      const imageUrl = await uploadImageToImgBB(capturedImage);
      
      clearInterval(progressInterval);
      if (setUploadProgress) setUploadProgress(100);
      
      if (imageUrl) {
        setFormData({ ...formData, imageUrl });
        setIsCameraOpen(false);
      } else {
        Alert.alert(
          "Upload Issue", 
          "We couldn't upload the image to our cloud storage, but we've saved it locally for now."
        );
      }
    } else {
      // Simpler flow without progress updates
      const imageUrl = await uploadImageToImgBB(capturedImage);
      
      if (imageUrl) {
        setFormData({ ...formData, imageUrl });
        setIsCameraOpen(false);
      } else {
        Alert.alert(
          "Upload Issue", 
          "We couldn't upload the image to our cloud storage, but we've saved it locally for now."
        );
      }
    }
  } catch (error) {
    Alert.alert(
      "Upload Error", 
      "An error occurred while uploading the image. The image might be too large or there may be connection issues."
    );
  } finally {
    if (setUploadProgress) setUploadProgress(0);
    setIsUploading(false);
  }
};

// Helper function to optimize image before upload
const optimizeImage = async (uri) => {
  try {
    // Check if image is already compressed or small enough
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (fileInfo.size < MAX_IMAGE_SIZE) {
      return uri;
    }
    
    // Calculate compression quality based on file size
    const quality = Math.min(0.8, MAX_IMAGE_SIZE / fileInfo.size);
    
    // Compress the image
    const compressedImage = await manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: quality, format: SaveFormat.JPEG }
    );
    
    return compressedImage.uri;
  } catch (error) {
    // If optimization fails, return original URI
    return uri;
  }
};

// Helper function to check network connectivity
const checkNetwork = async () => {
  try {
    const netState = await Network.getNetworkStateAsync();
    return netState.isConnected && netState.isInternetReachable;
  } catch (networkError) {
    return false;
  }
};

export default {
  uploadImageToImgBB,
  getProfileImagePlaceholder,
  handleImageUpload,
}; 