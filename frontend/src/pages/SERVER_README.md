# Pro Photo Scrambler - Server Setup

This is the server-side component for the Pro Photo Scrambler feature. It provides advanced scrambling algorithms using Python processing.

## Prerequisites

1. **Python 3.8+** installed
2. **Flask** and **flask-cors** packages
3. Python scrambling scripts (see below)

## Installation

### 1. Install Python Dependencies

```bash
pip install flask flask-cors pillow opencv-python numpy
```

### 2. File Structure

Your directory should look like this:

```
VideoScramblerApp/
├── src/
│   └── pages/
│       ├── app.py                        # Flask server
│       ├── config.py                     # Configuration
│       ├── ScramblerPhotosPro.jsx        # React frontend
│       ├── scramble_photo.py             # Position & Color scrambling
│       ├── scramble_photo_rotate.py      # Rotation scrambling
│       ├── scramble_photo_mirror.py      # Mirror scrambling
│       ├── scramble_photo_intensity.py   # Intensity scrambling
│       └── uploads/                      # Upload directory (auto-created)
```

### 3. Create Python Scrambling Scripts

You need to create the following Python scripts for scrambling:

#### `scramble_photo.py` (Position & Color)
- Handles position-based tile scrambling
- Handles color hue shifting
- Arguments: `--input`, `--output`, `--seed`, `--rows`, `--cols`, `--mode`, `--algorithm`, `--max-hue-shift`, `--percentage`

#### `scramble_photo_rotate.py` (Rotation)
- Randomly rotates tiles by 90°, 180°, 270°
- Arguments: `--input`, `--output`, `--seed`, `--rows`, `--cols`, `--mode`, `--algorithm`, `--percentage`

#### `scramble_photo_mirror.py` (Mirror)
- Randomly flips tiles horizontally/vertically
- Arguments: `--input`, `--output`, `--seed`, `--rows`, `--cols`, `--mode`, `--algorithm`, `--percentage`

#### `scramble_photo_intensity.py` (Intensity)
- Shifts pixel intensity values
- Arguments: `--input`, `--output`, `--algorithm`, `--max-intensity-shift`, `--seed`, `--mode`, `--percentage`

## Running the Server

### Start the Flask Server

```bash
cd src/pages
python3 app.py
```

The server will start on `http://localhost:5000`

### Test the Server

1. Open your browser to `http://localhost:5000` to see the upload form
2. Test file upload: `POST http://localhost:5000/upload`
3. Test scrambling: `POST http://localhost:5000/scramble-photo`

## API Endpoints

### 1. Upload File
```http
POST /upload
Content-Type: multipart/form-data

file: <image_file>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "image.jpg",
  "download_url": "/download/image.jpg"
}
```

### 2. Scramble Photo
```http
POST /scramble-photo
Content-Type: application/json

{
  "input": "image.jpg",
  "output": "scrambled_image.jpg",
  "seed": 123456789,
  "algorithm": "position",
  "mode": "scramble",
  "rows": 6,
  "cols": 6,
  "percentage": 100
}
```

**Algorithm Options:**
- `position`: Tile position shuffling (requires: rows, cols)
- `color`: Hue shifting (requires: max_hue_shift)
- `rotation`: Random tile rotation (requires: rows, cols)
- `mirror`: Random tile flipping (requires: rows, cols)
- `intensity`: Intensity shifting (requires: max_intensity_shift)

**Response:**
```json
{
  "message": "Photo scrambled successfully",
  "output_file": "scrambled_image.jpg",
  "algorithm": "position",
  "seed": 123456789,
  "download_url": "/download/scrambled_image.jpg"
}
```

### 3. Download File
```http
GET /download/<filename>
```

### 4. List Files
```http
GET /files
```

**Response:**
```json
{
  "files": ["image.jpg", "scrambled_image.jpg"]
}
```

## Integration with React App

The React component `ScramblerPhotosPro.jsx` is already configured to:
1. Upload images to the server
2. Send scrambling requests with selected parameters
3. Download and display scrambled results
4. Generate unscramble keys

### Running Both Together

1. **Terminal 1 - Start Flask Server:**
   ```bash
   cd src/pages
   python3 app.py
   ```

2. **Terminal 2 - Start React App:**
   ```bash
   npm run dev
   ```

3. Navigate to the Pro Photo Scrambler page in your React app

## Troubleshooting

### CORS Issues
If you get CORS errors, make sure `flask-cors` is installed:
```bash
pip install flask-cors
```

### Python Scripts Not Found
Make sure all scrambling scripts are in the same directory as `app.py`

### Upload Folder Permissions
Ensure the `uploads/` directory has write permissions:
```bash
chmod 755 uploads/
```

### Port Already in Use
If port 5000 is in use, change the port in `config.py`:
```python
PORT = 5001  # Or any other available port
```

Then update `ScramblerPhotosPro.jsx`:
```javascript
const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = 'http://localhost:5001';
```

## Security Notes

- This is a development server. For production, use a WSGI server like Gunicorn
- Add authentication for production use
- Implement file size limits and validation
- Add rate limiting to prevent abuse
- Use HTTPS in production
- Sanitize file names and paths

## Example Commands

### Position Scramble
```bash
python3 scramble_photo.py \
  --input uploads/image.jpg \
  --output uploads/scrambled.jpg \
  --seed 123456789 \
  --rows 6 \
  --cols 6 \
  --mode scramble \
  --percentage 100
```

### Color Scramble
```bash
python3 scramble_photo.py \
  --input uploads/image.jpg \
  --output uploads/color_scrambled.jpg \
  --algorithm color \
  --max-hue-shift 64 \
  --seed 123456 \
  --percentage 75
```

### Rotation Scramble
```bash
python3 scramble_photo_rotate.py \
  --input uploads/image.jpg \
  --output uploads/rotated.jpg \
  --seed 123456 \
  --rows 4 \
  --cols 6 \
  --mode scramble \
  --algorithm rotation \
  --percentage 50
```

## License

Same as the main VideoScramblerApp project.
