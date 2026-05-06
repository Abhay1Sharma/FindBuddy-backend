import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME, // e.g., mediaflows_6fc8...
  api_key: process.env.REACT_APP_CLOUDINARY_API_KEY,
  api_secret: process.env.REACT_APP_CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'gym_buddy_app/user_content', // Your App Folder
      resource_type: 'auto',                // This handles VIDEO + IMAGE
      allowed_formats: ['jpg', 'png', 'mp4', 'mov', 'webp', 'avif', 'jpeg'],
      public_id: `file_${Date.now()}`,      // Unique name
    };
  },
});

export { cloudinary, storage };