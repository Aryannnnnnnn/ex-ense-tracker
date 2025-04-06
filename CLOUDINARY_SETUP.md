# Cloudinary Setup Guide for Expense Tracker

This guide will help you set up Cloudinary as a free alternative to Firebase Storage for storing profile images in your Expense Tracker application.

## What is Cloudinary?

Cloudinary is a cloud-based service that provides an end-to-end image and video management solution. It offers storage, optimization, and delivery services with a generous free tier that includes:

- 25GB of storage
- 25GB of monthly bandwidth
- 25,000 transformations
- Auto-backup and revision history

## Prerequisites

1. A web browser
2. Your Expense Tracker project cloned and set up
3. An email address for signing up

## Step 1: Create a Cloudinary Account

1. Go to [Cloudinary's registration page](https://cloudinary.com/users/register/free)
2. Fill in your details (name, email, etc.)
3. Choose a cloud name (this will be part of your upload URLs)
4. Complete the registration process
5. Verify your email address

## Step 2: Locate Your Account Credentials

1. After logging in, you'll be taken to your Cloudinary dashboard
2. Look for the "Account Details" section, which contains:
   - Cloud name
   - API Key
   - API Secret

![Cloudinary Dashboard](https://res.cloudinary.com/demo/image/upload/cloudinary_dashboard.jpg)

## Step 3: Create an Upload Preset

Upload presets allow you to pre-define settings for uploads. For our app, we'll create an unsigned upload preset:

1. In your Cloudinary dashboard, go to "Settings" (gear icon) > "Upload" > "Upload presets"
2. Click "Add upload preset"
3. Configure the preset:
   - Signing Mode: Choose "Unsigned" (this allows direct uploads from the app)
   - Preset Name: `expense_tracker_uploads` (or choose your own name)
   - Folder: `expense_tracker` (optional, for organization)
   - Tags: Add optional tags like "profile_images" (for easier searching)
4. In the "Media Analysis" section, enable "Face Detection" if you want (helpful for profile images)
5. Click "Save" to create the preset

## Step 4: Configure Your App

1. In your Expense Tracker project, locate the `src/utils/cloudinaryConfig.js` file
2. Replace the placeholders with your actual Cloudinary credentials:

```javascript
const cloudinaryConfig = {
  cloudName: "YOUR_CLOUD_NAME", // replace with your cloud name
  apiKey: "YOUR_API_KEY",       // replace with your API key
  apiSecret: "YOUR_API_SECRET", // replace with your API secret
  uploadPreset: "expense_tracker_uploads", // or your custom preset name
};

export default cloudinaryConfig;
```

## Step 5: Test Your Setup

1. Run your Expense Tracker app
2. Go to the Profile screen
3. Try to update your profile picture
4. After selecting an image, it should be uploaded to Cloudinary
5. Check your Cloudinary dashboard > Media Library to verify the upload

## Troubleshooting

### Image Upload Fails

1. Verify your Cloudinary credentials in `cloudinaryConfig.js`
2. Check that your upload preset exists and is set to "Unsigned"
3. Ensure your app has internet connectivity
4. Check the console logs for specific error messages

### Image Doesn't Appear After Upload

1. Check if the URL in your profile is correctly pointing to Cloudinary
2. Verify that the image exists in your Cloudinary Media Library
3. Check if there are any CORS (Cross-Origin Resource Sharing) issues

### Slow Uploads

1. Check your internet connection
2. Consider optimizing the image before upload (the app already reduces quality to 0.5)
3. Verify that the Cloudinary region is appropriate for your location

## Advanced Features

### Image Transformations

Cloudinary allows you to transform images on-the-fly by adding parameters to the URL:

- Resizing: `w_200,h_200`
- Cropping: `c_thumb,g_face`
- Effects: `e_sepia` or `e_grayscale`

Example URL with transformations:
```
https://res.cloudinary.com/your-cloud-name/image/upload/w_200,h_200,c_thumb,g_face/profile_images/user123
```

### Backup and Versioning

Cloudinary automatically keeps backups of your images. To access older versions:

1. Go to Media Library
2. Find the image
3. Click "History" to see and restore previous versions

## Security Considerations

1. **API Secret**: Never expose your API Secret in client-side code
2. **Upload Presets**: Use unsigned upload presets for client-side uploads
3. **Resource Types**: Restrict allowed file types in your upload preset
4. **Size Limits**: Set maximum file size limits to prevent abuse

## Useful Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [React Native Image Upload Guide](https://cloudinary.com/blog/react_native_image_upload)
- [Cloudinary URL Transformation Reference](https://cloudinary.com/documentation/transformation_reference)

## Next Steps

After setting up Cloudinary, you might want to explore:

1. Setting up delivery profiles for optimized image delivery
2. Implementing image transformations for different screen sizes
3. Adding watermarks or overlays to user-uploaded content
4. Setting up a backup strategy for critical images 