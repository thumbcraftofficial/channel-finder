# thumbcraft-studio Channel Finder

A production-quality YouTube channel crawler web application with real-time API usage tracking, advanced filtering, and comprehensive channel analytics.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)

## 🚀 Features

### Core Functionality
- ✅ **Real YouTube API Integration** - Fetch live channel data using YouTube Data API v3
- ✅ **Live API Usage Meter** - Track daily quota usage with visual progress bar
- ✅ **Advanced Filtering** - Filter by name, country, category, and upload date
- ✅ **Multi-Select Dropdowns** - Select multiple countries and categories
- ✅ **Custom Categories** - Add your own category filters
- ✅ **Sortable Table** - Sort by any column (ascending/descending)
- ✅ **Batch Selection** - Select multiple channels for export
- ✅ **CSV Export** - Export selected channels with all data
- ✅ **Fallback Data** - Sample data when backend is unavailable

### User Interface
- 🎨 Modern, responsive design
- 📊 Color-coded badges for categories and upload freshness
- 🔔 Toast notifications for user feedback
- ⚡ Loading overlay with spinner
- 📱 Mobile-friendly responsive layout
- 🎯 Hover effects and smooth animations

### Backend Features
- 🔒 Secure API key storage
- 🛡️ Rate limiting to prevent abuse
- 📈 Automatic daily quota reset
- 🔄 RESTful API endpoints
- ⚠️ Comprehensive error handling
- 📝 Request logging

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14.0.0 or higher)
- **npm** (v6.0.0 or higher)
- **YouTube Data API v3 Key** ([Get one here](https://console.cloud.google.com/apis/credentials))

## 🛠️ Installation

### 1. Clone or Download the Project

```bash
cd thumbcraft-studio-channel-finder
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `axios` - HTTP client for API requests
- `nodemon` - Development auto-reload (dev dependency)

### 3. Configure YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

Edit `config.js`:

```javascript
module.exports = {
    YOUTUBE_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',
    // ... other settings
};
```

⚠️ **Important**: Add `config.js` to `.gitignore` to keep your API key secure!

### 4. Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:

```
╔════════════════════════════════════════════════════════╗
║  thumbcraft-studio Channel Finder API Server          ║
║  Running on http://localhost:3000                     ║
╚════════════════════════════════════════════════════════╝
```

### 5. Open the Frontend

Simply open `index.html` in your web browser:

- **Double-click** `index.html`, or
- **Right-click** → Open with → Your browser, or
- Use a local server: `python -m http.server 8080` then visit `http://localhost:8080`

## 📁 Project Structure

```
thumbcraft-studio-channel-finder/
├── index.html          # Frontend UI
├── styles.css          # Styling and themes
├── app.js             # Frontend JavaScript logic
├── server.js          # Backend Express server
├── config.js          # API key configuration
├── package.json       # Node.js dependencies
├── channels.json      # Sample fallback data
└── README.md          # Documentation
```

## 🔌 API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### `GET /api/usage`
Get current API usage statistics.

**Response:**
```json
{
  "dailyQuota": 10000,
  "used": 450,
  "remaining": 9550,
  "percentage": 4.5,
  "lastReset": "2024-03-30"
}
```

### `GET /api/searchChannels`
Search for YouTube channels with filters.

**Query Parameters:**
- `name` - Channel name to search
- `countries` - Comma-separated country codes (e.g., "US,GB,CA")
- `categories` - Comma-separated categories
- `fromDate` - ISO date string (YYYY-MM-DD)
- `toDate` - ISO date string (YYYY-MM-DD)

**Example:**
```
GET /api/searchChannels?name=tech&countries=US&categories=Technology
```

**Response:**
```json
{
  "channels": [...],
  "count": 25,
  "quota": {
    "used": 550,
    "remaining": 9450
  }
}
```

### `GET /api/channelDetails`
Get detailed information for specific channels.

**Query Parameters:**
- `channelIds` - Comma-separated YouTube channel IDs

**Example:**
```
GET /api/channelDetails?channelIds=UCX6OQ3DkcsbYNE6H8uQQuVA,UCq-Fj5jknLsUf-MWSy4_brA
```

## 📊 API Quota Costs

Understanding YouTube API v3 quota costs:

| Operation | Cost | Description |
|-----------|------|-------------|
| `search.list` | 100 units | Search for channels |
| `channels.list` | 1 unit | Get channel details |
| `search.list` (videos) | 100 units | Get latest video |

**Daily Quota**: 10,000 units

**Example Usage**:
- Search channels: 100 units
- Get details for 50 channels: 1 unit
- Get last video for 50 channels: 5,000 units (100 × 50)
- **Total**: ~5,101 units per comprehensive search

## 🎨 Features Walkthrough

### 1. API Usage Meter
- Displays current quota usage in real-time
- Color-coded progress bar:
  - **Green** (0-50%): Safe usage
  - **Orange** (51-80%): Moderate usage
  - **Red** (81-100%): High usage
- Auto-refreshes after each API call
- Warning toast when usage exceeds 80%

### 2. Filters
- **Channel Name**: Free text search
- **Country**: Multi-select from 14 countries
- **Category**: Multi-select + custom category input
- **Date Range**: From/To date pickers for upload filtering
- Filters combine with AND logic

### 3. Channel Table
- **Columns**: Avatar, Name, Link, Description, Subscribers, Country, Category, Last Video, Upload Date, Days Since
- **Sorting**: Click any column header to sort
- **Selection**: Checkbox for each row + "Select All"
- **Badges**: Color-coded category and freshness indicators

### 4. CSV Export
- Export selected channels only
- Includes all channel data
- Automatic filename with date
- Downloads as `.csv` file

## 🔐 Security Best Practices

1. **Never commit `config.js`** with your actual API key
2. Add to `.gitignore`:
   ```
   config.js
   node_modules/
   .env
   ```

3. **For production**, use environment variables:
   ```javascript
   YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
   ```

4. **Set environment variable**:
   ```bash
   export YOUTUBE_API_KEY="your_key_here"
   ```

## 🐛 Troubleshooting

### "API key not valid" Error
- Verify your API key in `config.js`
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check if your API key has the correct restrictions

### Frontend shows "Using sample data"
- Backend server may not be running
- Check if `http://localhost:3000` is accessible
- Verify CORS is enabled in `server.js`

### "Daily API quota exceeded"
- Wait for automatic reset (midnight Pacific Time)
- Or upgrade your Google Cloud quota
- Current usage shown in API Usage Meter

### Rate Limit Error (429)
- Default: 30 requests per minute
- Wait 60 seconds and try again
- Adjust in `config.js` if needed

## 🚀 Deployment

### Deploy Backend (Example: Heroku)

1. Create `Procfile`:
   ```
   web: node server.js
   ```

2. Set environment variable:
   ```bash
   heroku config:set YOUTUBE_API_KEY=your_key_here
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy Frontend (Example: Netlify/Vercel)

1. Update `API_BASE_URL` in `app.js` to your deployed backend
2. Upload files or connect GitHub repo
3. Deploy

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📧 Support

For issues or questions, please open an issue on the GitHub repository.

---

**Built with ❤️ by thumbcraft-studio**
