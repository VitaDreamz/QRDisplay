const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../public/images/displays');
const outputDir = imagesDir;

// Configuration for each GIF
const gifConfigs = [
  {
    name: 'vitadreamz-display-setup-bar2stand',
    frames: 2,
    output: 'vitadreamz-display-setup-bar2stand.gif'
  },
  {
    name: 'vitadreamz-display-setup-display2stand',
    frames: 2,
    output: 'vitadreamz-display-setup-display2stand.gif'
  },
  {
    name: 'vitadreamz-display-setup-hook2stand',
    frames: 5,
    output: 'vitadreamz-display-setup-hook2stand.gif'
  },
  {
    name: 'vitadreamz-display-setup-stand',
    frames: 4,
    output: 'vitadreamz-display-setup-stand.gif',
    namePattern: (i) => `vitadreamz-display-setup-stand${i}.jpg` // Different naming pattern
  }
];

async function createGIF(config) {
  console.log(`Creating ${config.output}...`);
  
  // Load first image to get dimensions
  const getImagePath = (i) => {
    if (config.namePattern) {
      return path.join(imagesDir, config.namePattern(i));
    }
    return path.join(imagesDir, `${config.name}.${i}.jpg`);
  };
  
  const firstImagePath = getImagePath(1);
  const metadata = await sharp(firstImagePath).metadata();
  
  const encoder = new GIFEncoder(metadata.width, metadata.height);
  const outputPath = path.join(outputDir, config.output);
  const stream = fs.createWriteStream(outputPath);
  
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setRepeat(0);   // 0 for infinite loop
  encoder.setDelay(1000); // 1000ms = 1 second per frame
  encoder.setQuality(10); // Quality (1-20, lower is better quality)
  
  // Add each frame
  for (let i = 1; i <= config.frames; i++) {
    const imagePath = getImagePath(i);
    const imageBuffer = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    encoder.addFrame(imageBuffer.data);
    console.log(`  Added frame ${i}/${config.frames}`);
  }
  
  encoder.finish();
  
  return new Promise((resolve) => {
    stream.on('finish', () => {
      console.log(`✓ Created ${config.output}`);
      resolve();
    });
  });
}

async function generateAllGIFs() {
  console.log('Generating GIF animations...\n');
  
  for (const config of gifConfigs) {
    try {
      await createGIF(config);
    } catch (error) {
      console.error(`Error creating ${config.output}:`, error.message);
    }
  }
  
  console.log('\n✓ All GIFs generated successfully!');
}

generateAllGIFs().catch(console.error);
