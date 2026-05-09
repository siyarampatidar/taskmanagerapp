const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'teamflow_attachments',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        public_id: (req, file) => {
            const name = file.originalname.split('.');
            const ext = name.pop();
            const cleanName = name.join('.').replace(/[^a-zA-Z0-9]/g, '_');
            return `${Date.now()}-${cleanName}`;
        },
        format: async (req, file) => {
            const name = file.originalname.split('.');
            return name.pop(); // Preserve the original format
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = { upload, memoryUpload };
