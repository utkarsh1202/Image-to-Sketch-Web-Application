// DOM elements
const fileInput = document.getElementById('fileInput');
const resetBtn = document.getElementById('resetBtn');
const styleSelect = document.getElementById('styleSelect');
const blurRange = document.getElementById('blurRange');
const edgeRange = document.getElementById('edgeRange');
const contrastRange = document.getElementById('contrastRange');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const origCanvas = document.getElementById('origCanvas');
const sketchCanvas = document.getElementById('sketchCanvas');
const loadingIndicator = document.getElementById('loadingIndicator');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.querySelector('.status-text');
const origEmpty = document.getElementById('origEmpty');
const sketchEmpty = document.getElementById('sketchEmpty');

// Range value displays
const blurValue = document.getElementById('blurValue');
const edgeValue = document.getElementById('edgeValue');
const contrastValue = document.getElementById('contrastValue');

// Canvas contexts
const origCtx = origCanvas.getContext('2d');
const sketchCtx = sketchCanvas.getContext('2d');

// Current image data
let currentImage = null;
let isProcessing = false;

// Update range value displays
blurRange.addEventListener('input', () => blurValue.textContent = blurRange.value);
edgeRange.addEventListener('input', () => edgeValue.textContent = edgeRange.value);
contrastRange.addEventListener('input', () => contrastValue.textContent = contrastRange.value);

// File input handler
fileInput.addEventListener('change', function(e) {
  if (this.files && this.files[0]) {
    const file = this.files[0];
    
    // Validate file type
    if (!file.type.match('image.*')) {
      showStatus('Please select a valid image file (JPG, PNG, etc.).', 'error');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showStatus('Image size should be less than 10MB.', 'error');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        currentImage = img;
        displayImage(img, origCanvas, origCtx);
        origEmpty.style.display = 'none';
        downloadBtn.disabled = true;
        showStatus('Image loaded successfully! Adjust settings and click "Convert to Sketch".', 'success');
      };
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  }
});

// Reset button handler
resetBtn.addEventListener('click', function() {
  fileInput.value = '';
  origCtx.clearRect(0, 0, origCanvas.width, origCanvas.height);
  sketchCtx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  currentImage = null;
  downloadBtn.disabled = true;
  origEmpty.style.display = 'flex';
  sketchEmpty.style.display = 'flex';
  hideStatus();
});

// Convert button handler
convertBtn.addEventListener('click', function() {
  if (!currentImage) {
    showStatus('Please upload an image first.', 'error');
    return;
  }
  
  if (isProcessing) {
    return; // Prevent multiple simultaneous conversions
  }
  
  convertToSketch();
});

// Download button handler
downloadBtn.addEventListener('click', function() {
  if (!sketchCanvas.width || !sketchCanvas.height) {
    showStatus('No sketch to download.', 'error');
    return;
  }
  
  const link = document.createElement('a');
  link.download = 'sketch-magic.png';
  link.href = sketchCanvas.toDataURL('image/png');
  link.click();
  
  showStatus('Sketch downloaded successfully!', 'success');
});

// Display image on canvas
function displayImage(img, canvas, ctx) {
  // Calculate dimensions to fit canvas while maintaining aspect ratio
  const maxWidth = 500;
  const maxHeight = 500;
  
  let { width, height } = img;
  
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  canvas.width = width;
  canvas.height = height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, height);
}

// Convert image to sketch
function convertToSketch() {
  isProcessing = true;
  loadingIndicator.style.display = 'flex';
  hideStatus();
  
  // Use setTimeout to allow UI to update before processing
  setTimeout(() => {
    try {
      // Get parameters
      const style = styleSelect.value;
      const blur = parseInt(blurRange.value);
      const edgeStrength = parseFloat(edgeRange.value);
      const contrast = parseFloat(contrastRange.value);
      
      // Set sketch canvas dimensions to match original
      sketchCanvas.width = origCanvas.width;
      sketchCanvas.height = origCanvas.height;
      
      // Get image data from original canvas
      const imageData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height);
      const data = imageData.data;
      
      // Apply selected sketch style
      let sketchData;
      switch (style) {
        case 'pencil':
          sketchData = applyPencilSketch(data, origCanvas.width, origCanvas.height, blur, edgeStrength, contrast);
          break;
        case 'outline':
          sketchData = applyOutlineSketch(data, origCanvas.width, origCanvas.height, blur, edgeStrength, contrast);
          break;
        case 'charcoal':
          sketchData = applyCharcoalSketch(data, origCanvas.width, origCanvas.height, blur, edgeStrength, contrast);
          break;
        case 'soft':
          sketchData = applySoftSketch(data, origCanvas.width, origCanvas.height, blur, edgeStrength, contrast);
          break;
        default:
          sketchData = applyPencilSketch(data, origCanvas.width, origCanvas.height, blur, edgeStrength, contrast);
      }
      
      // Put the processed data on the sketch canvas
      const newImageData = new ImageData(sketchData, origCanvas.width, origCanvas.height);
      sketchCtx.putImageData(newImageData, 0, 0);
      
      // Enable download button and hide empty state
      downloadBtn.disabled = false;
      sketchEmpty.style.display = 'none';
      
      // Add animation to the result
      sketchCanvas.classList.add('fade-in-up');
      setTimeout(() => {
        sketchCanvas.classList.remove('fade-in-up');
      }, 500);
      
      showStatus('Sketch created successfully! Click "Download Sketch" to save your artwork.', 'success');
    } catch (error) {
      console.error('Error converting image:', error);
      showStatus('Error converting image. Please try again with a different image.', 'error');
    } finally {
      isProcessing = false;
      loadingIndicator.style.display = 'none';
    }
  }, 100);
}

// Pencil sketch effect
function applyPencilSketch(data, width, height, blur, edgeStrength, contrast) {
  // Create a copy of the data
  const result = new Uint8ClampedArray(data.length);
  
  // Convert to grayscale first
  const grayData = rgbToGrayscale(data, width, height);
  
  // Invert the grayscale image
  const invertedData = invertImage(grayData, width, height);
  
  // Apply Gaussian blur to the inverted image
  const blurredData = applyGaussianBlur(invertedData, width, height, blur);
  
  // Blend the original grayscale with the blurred inverted image (dodge blend)
  for (let i = 0; i < grayData.length; i++) {
    // Dodge blend formula: (base / (1 - blend)) but we need to adjust for our data
    let value = grayData[i] / (255 - blurredData[i]);
    value = Math.min(Math.max(value * 255, 0), 255);
    
    // Apply contrast
    value = applyContrast(value, contrast);
    
    // Set RGB values to the calculated value (grayscale)
    const idx = i * 4;
    result[idx] = value;     // R
    result[idx + 1] = value; // G
    result[idx + 2] = value; // B
    result[idx + 3] = 255;   // A
  }
  
  return result;
}

// Outline sketch effect
function applyOutlineSketch(data, width, height, blur, edgeStrength, contrast) {
  // Create a copy of the data
  const result = new Uint8ClampedArray(data.length);
  
  // Convert to grayscale
  const grayData = rgbToGrayscale(data, width, height);
  
  // Apply edge detection (Sobel operator)
  const edgeData = detectEdges(grayData, width, height, edgeStrength);
  
  // Invert the edge data
  for (let i = 0; i < edgeData.length; i++) {
    edgeData[i] = 255 - edgeData[i];
  }
  
  // Apply contrast
  for (let i = 0; i < edgeData.length; i++) {
    edgeData[i] = applyContrast(edgeData[i], contrast);
  }
  
  // Convert to RGBA
  for (let i = 0; i < edgeData.length; i++) {
    const idx = i * 4;
    result[idx] = edgeData[i];     // R
    result[idx + 1] = edgeData[i]; // G
    result[idx + 2] = edgeData[i]; // B
    result[idx + 3] = 255;         // A
  }
  
  return result;
}

// Charcoal sketch effect
function applyCharcoalSketch(data, width, height, blur, edgeStrength, contrast) {
  // Create a copy of the data
  const result = new Uint8ClampedArray(data.length);
  
  // Convert to grayscale
  const grayData = rgbToGrayscale(data, width, height);
  
  // Apply strong blur
  const blurredData = applyGaussianBlur(grayData, width, height, blur * 2);
  
  // Apply edge detection
  const edgeData = detectEdges(grayData, width, height, edgeStrength * 1.5);
  
  // Combine blurred image with edges
  for (let i = 0; i < grayData.length; i++) {
    // Darken the blurred image
    let value = blurredData[i] * 0.7;
    
    // Add edges (darker areas)
    value = Math.min(value, 255 - edgeData[i] * 0.8);
    
    // Apply contrast
    value = applyContrast(value, contrast * 0.8);
    
    // Set RGB values
    const idx = i * 4;
    result[idx] = value;     // R
    result[idx + 1] = value; // G
    result[idx + 2] = value; // B
    result[idx + 3] = 255;   // A
  }
  
  return result;
}

// Soft sketch effect
function applySoftSketch(data, width, height, blur, edgeStrength, contrast) {
  // Create a copy of the data
  const result = new Uint8ClampedArray(data.length);
  
  // Convert to grayscale
  const grayData = rgbToGrayscale(data, width, height);
  
  // Apply blur
  const blurredData = applyGaussianBlur(grayData, width, height, blur);
  
  // Create a soft sketch by blending original with blurred
  for (let i = 0; i < grayData.length; i++) {
    // Soft blend: weighted average favoring the original
    let value = (grayData[i] * 0.7 + blurredData[i] * 0.3);
    
    // Apply contrast (softer)
    value = applyContrast(value, contrast * 0.7);
    
    // Set RGB values
    const idx = i * 4;
    result[idx] = value;     // R
    result[idx + 1] = value; // G
    result[idx + 2] = value; // B
    result[idx + 3] = 255;   // A
  }
  
  return result;
}

// Convert RGB image data to grayscale
function rgbToGrayscale(data, width, height) {
  const grayData = new Uint8ClampedArray(width * height);
  
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Use luminance formula: 0.299*R + 0.587*G + 0.114*B
    grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  
  return grayData;
}

// Invert an image
function invertImage(data, width, height) {
  const inverted = new Uint8ClampedArray(data.length);
  
  for (let i = 0; i < data.length; i++) {
    inverted[i] = 255 - data[i];
  }
  
  return inverted;
}

// Apply Gaussian blur to image data
function applyGaussianBlur(data, width, height, radius) {
  if (radius === 0) return data;
  
  const blurred = new Uint8ClampedArray(data.length);
  const kernel = createGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  // Apply horizontal blur
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let kx = -halfKernel; kx <= halfKernel; kx++) {
        const px = Math.min(Math.max(x + kx, 0), width - 1);
        const idx = y * width + px;
        const weight = kernel[kx + halfKernel];
        
        sum += data[idx] * weight;
        weightSum += weight;
      }
      
      temp[y * width + x] = sum / weightSum;
    }
  }
  
  // Apply vertical blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const idx = py * width + x;
        const weight = kernel[ky + halfKernel];
        
        sum += temp[idx] * weight;
        weightSum += weight;
      }
      
      blurred[y * width + x] = sum / weightSum;
    }
  }
  
  return blurred;
}

// Create a Gaussian kernel for blurring
function createGaussianKernel(radius) {
  const size = radius * 2 + 1;
  const kernel = new Array(size);
  const sigma = radius / 2;
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  
  // Normalize the kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  return kernel;
}

// Detect edges using Sobel operator
function detectEdges(data, width, height, strength) {
  const edgeData = new Uint8ClampedArray(data.length);
  
  // Sobel kernels
  const kernelX = [
    -1, 0, 1,
    -2, 0, 2,
    -1, 0, 1
  ];
  
  const kernelY = [
    -1, -2, -1,
     0,  0,  0,
     1,  2,  1
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // Apply Sobel operator
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          
          gx += data[idx] * kernelX[kernelIdx];
          gy += data[idx] * kernelY[kernelIdx];
        }
      }
      
      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy) * strength;
      edgeData[y * width + x] = Math.min(magnitude, 255);
    }
  }
  
  return edgeData;
}

// Apply contrast adjustment
function applyContrast(value, contrast) {
  // Contrast adjustment formula
  return ((value - 128) * contrast) + 128;
}

// Show status message
function showStatus(message, type) {
  statusText.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.style.display = 'flex';
}

// Hide status message
function hideStatus() {
  statusMessage.style.display = 'none';
}