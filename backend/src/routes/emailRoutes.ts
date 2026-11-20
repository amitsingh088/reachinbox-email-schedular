import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/auth';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  searchEmailsHandler,
  getEmailStats,
} from '../controllers/emailController';

const router = Router();

// Multer config for file uploads (in-memory buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and text files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticateJWT);

// POST /schedule — Schedule emails (with optional file upload)
router.post('/schedule', upload.single('file'), scheduleEmails);

// GET /scheduled — Get user's scheduled emails
router.get('/scheduled', getScheduledEmails);

// GET /sent — Get user's sent emails
router.get('/sent', getSentEmails);

// GET /search — Search emails via Elasticsearch
router.get('/search', searchEmailsHandler);

// GET /stats — Get email stats for the user
router.get('/stats', getEmailStats);

export default router;
