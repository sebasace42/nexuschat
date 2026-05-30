const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar el storage de Multer para subir directo a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Detectar el tipo de archivo para organizarlos en carpetas
    let folder = 'nexuschat/others';
    let resource_type = 'auto';

    if (file.mimetype.startsWith('image/')) {
      folder = 'nexuschat/images';
      resource_type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'nexuschat/videos';
      resource_type = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      folder = 'nexuschat/audios';
      resource_type = 'video'; // Cloudinary usa 'video' para audio también
    } else {
      folder = 'nexuschat/documents';
      resource_type = 'raw'; // Para PDFs y documentos
    }

    return {
      folder,
      resource_type,
      // Nombre único para evitar colisiones
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

// Filtro de tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Imágenes
    'image/jpeg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg',
    // Audio
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    'audio/webm', 'audio/mp4',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Aceptar archivo
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

// Configurar Multer con límite de 50MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
});

module.exports = { upload, cloudinary };