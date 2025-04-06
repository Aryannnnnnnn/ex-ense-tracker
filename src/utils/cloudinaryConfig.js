/**
 * Cloudinary Configuration for Image Uploads
 * 
 * This file contains configuration for Cloudinary, a free alternative to Firebase Storage for image uploads.
 * 
 * Instructions:
 * 1. Create a free Cloudinary account at https://cloudinary.com/
 * 2. Get your Cloud Name, API Key, and API Secret from your Cloudinary dashboard
 * 3. Replace the placeholder values below with your actual credentials
 */

const cloudinaryConfig = {
  cloudName: "Expense Tracker", // replace with your Cloudinary cloud name
  apiKey: "963567848141679",       // replace with your Cloudinary API key
  apiSecret: "mWt4QTv6YpNBa7SNicAEPEKXYnY", // replace with your Cloudinary API secret
  uploadPreset: "expense_tracker_uploads", // unsigned upload preset - create this in your Cloudinary dashboard
};


export default cloudinaryConfig; 