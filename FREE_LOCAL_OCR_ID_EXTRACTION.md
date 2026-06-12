# Free Local OCR ID Extraction Solution

## Overview
This solution provides **completely free, offline ID card data extraction** using only local browser-based OCR (Tesseract.js). No API keys, external services, or internet connectivity are required after the initial page load.

## Features
✅ **100% Free**: No API keys, quotas, or usage limits  
✅ **Privacy-Focused**: All processing happens in-browser, no data leaves the user's device  
✅ **Offline Capable**: Works without internet connection after initial load  
✅ **Instant Feedback**: Real-time progress indicators during extraction  
✅ **Multiple ID Support**: Handles Aadhaar, Driving License, Passport, and Voter ID  
✅ **Auto Form Filling**: Extracts and populates guest name, ID number, ID type, and address  
✅ **Debugging Capability**: View raw OCR text for troubleshooting  

## How It Works
1. User uploads an ID card image (front or back)
2. Tesseract.js processes the image locally in the browser to extract text
3. Custom parsing logic analyzes the extracted text to identify:
   - Guest name
   - ID number  
   - ID type (Aadhaar/Driving License/Passport/Voter ID)
   - Address (when visible on the ID)
4. Form fields are automatically populated with the extracted data
5. User can review and correct any information before submission

## Files Modified
- `frontend/src/pages/GuestForm.jsx`: Complete implementation of local OCR-based ID extraction

## Technical Implementation
### Dependencies
- `tesseract.js`: OCR engine that runs entirely in the browser via WebAssembly
- No backend API calls required for extraction

### Extraction Process
1. **Image Processing**: Tesseract.js converts the uploaded image to text
2. **Text Parsing**: Custom logic identifies key information:
   - ID type detection via keyword matching
   - Aadhaar number: `\d{4}\s\d{4}\s\d{4}` pattern
   - Driving License: State code + number patterns
   - Passport: Letter + 7 digits pattern
   - Voter ID: Alphanumeric patterns
   - Name extraction: Heuristic-based filtering of common false positives
   - Address extraction: Location-based parsing after "Address" keyword

### User Interface
- **Extracting ID details...**: Shown during OCR processing
- **Success Message**: Confirms when data has been extracted
- **Error Handling**: Clear message if OCR fails, with manual fallback
- **Debug Viewer**: Expandable panel to view raw OCR text (helpful for tuning)

## Usage Instructions
1. Start the application:
   ```bash
   # Backend (only needed for form submission, not extraction)
   cd backend
   python app.py
   
   # Frontend
   cd frontend
   npm run dev
   ```

2. Navigate to New Guest registration
3. Upload an ID card image (front side works best)
4. Wait for "Extracting ID details..." message
5. Form fields auto-populate with extracted data
6. Review, make corrections if needed, and submit

## Supported ID Types
- **Aadhaar Card**: 12-digit number with space formatting
- **Driving License**: State code + alphanumeric number
- **Passport**: Letter followed by 7 digits
- **Voter ID**: Alphanumeric identifier (varies by state)

## Performance Notes
- **First Run**: May take a few seconds to load Tesseract.js WASM module
- **Subsequent Runs**: Fast processing (typically 1-3 seconds)
- **Image Quality**: Better results with clear, well-lit images
- **File Formats**: Supports JPG, PNG, and other common image formats

## Troubleshooting
If extraction fails:
1. Ensure image is clear and shows ID details prominently
2. Try different lighting or angles
3. Verify the ID type matches what's actually on the card
4. Use the "View Extracted Text" debug feature to see what OCR captured
5. Manual form entry is always available as fallback

## Benefits Over API-Based Solutions
- **No Costs**: Free forever, no usage limits
- **No Configuration**: No API keys or environment variables needed
- **GDPR Compliant**: No personal data transmitted externally
- **Reliable**: Not affected by API rate limits or service outages
- **Fast**: Network-independent processing

This solution ensures your hotel's guest registration system can automatically extract ID information reliably and consistently, without any dependencies on external APIs or services that might incur costs or have usage limitations.