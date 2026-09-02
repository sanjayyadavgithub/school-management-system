const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// AES-256-CBC Encryption configurations
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // 32 characters key
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// @desc    Perform a complete encrypted JSON backup of all MongoDB collections
exports.runBackup = async (schoolId = null) => {
  try {
    const backupData = {
      timestamp: new Date(),
      schoolId,
      collections: {}
    };

    // Get all registered model names in Mongoose
    const modelNames = mongoose.modelNames();

    for (const name of modelNames) {
      const Model = mongoose.model(name);
      // If scoped by schoolId, filter records
      const filter = schoolId ? { schoolId } : {};
      const data = await Model.find(filter);
      backupData.collections[name] = data;
    }

    const jsonString = JSON.stringify(backupData);
    const encryptedData = encrypt(jsonString);

    // Save backup archive locally in uploads directory
    const backupDir = path.join(__dirname, '../../uploads/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${schoolId || 'global'}-${Date.now()}.enc`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, encryptedData, 'utf8');

    // Automatically clean up old backup archives (keep only past 7 backups)
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.enc'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => a.time - b.time);

    while (backupFiles.length > 7) {
      const oldest = backupFiles.shift();
      fs.unlinkSync(path.join(backupDir, oldest.name));
    }

    return { success: true, filename, filePath };
  } catch (error) {
    console.error('Backup Engine Error:', error);
    throw error;
  }
};
