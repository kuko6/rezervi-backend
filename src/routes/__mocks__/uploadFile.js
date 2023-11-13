const fs = require('fs');
const path = require('path');

// Fake upload that saves files to the filesystem
const uploadFile = (file, fileName) => {
  try {
    const saveDirectory = path.join(__dirname, '../../tests/images/fakeS3/');
    const filePath = path.join(saveDirectory, file.originalname);

    fs.writeFileSync(filePath, file.data);
  } catch (error) {
    return null;
  }
    
  return fileName; 
};

exports.uploadFile = uploadFile;