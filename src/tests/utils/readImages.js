const fs = require('fs');
const path = require('path');

const readImages = (filePaths) => {
  let images = [];
  for (const i in filePaths) {
    try {
      const imageData = fs.readFileSync(filePaths[i]);
      images.push({ data: imageData, originalname: path.basename(filePaths[i]) });
    } catch {
      console.error('Error reading the image:', error.message);
      throw error;
    }
  }
  
  return images;
};

exports.readImages = readImages;