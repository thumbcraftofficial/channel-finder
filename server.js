const express = require('express');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Usage Tracking
let apiUsage = {
    dailyQuota: 10000,
    used: 0,
    lastReset: new Date().toDateString()
};

// Reset quota daily
function checkAndResetQuota() {
    const today = new Date().toDateString();
    if (apiUsage.lastReset !== today) {
        apiUsage.used = 0;
        apiUsage.lastReset = today;
        console.log('Daily quota reset');
    }
}

// Update usage
function updateUsage(cost) {
    checkAndResetQuota();
    apiUsage.used += cost;
    console.log(`API usage updated: ${apiUsage.used}/${apiUsage.dailyQuota}`);
}

// Rate limiting
const requestTimestamps = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function rateLimitCheck(req, res, next) {
    const now = Date.now();
    
    // Remove old timestamps
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
        requestTimestamps.shift();
    }
    
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((requestTimestamps[0] + RATE_LIMIT_WINDOW - now) / 1000)
        });
    }
    
    requestTimestamps.push(now);
    next();
}

app.use(rateLimitCheck);

// YouTube API Helper Functions
async function searchYouTubeChannels(query, regionCode = null, videoCategoryId = null, publishedAfter = null, publishedBefore = null) {
    try {
        const params = {
            part: 'snippet',
            type: 'channel',
            maxResults: 50,
            key: config.YOUTUBE_API_KEY
        };
        
        if (query) params.q = query;
        if (regionCode) params.regionCode = regionCode;
        if (videoCategoryId) params.videoCategoryId = videoCategoryId;
        if (publishedAfter) params.publishedAfter = publishedAfter;
        if (publishedBefore) params.publishedBefore = publishedBefore;
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
        
        // Cost: 100 units per search
        updateUsage(100);
        
        return response.data.items || [];
    } catch (error) {
        console.error('YouTube Search API Error:', error.response?.data || error.message);
        throw error;
    }
}

async function getChannelDetails(channelIds) {
    try {
        const params = {
            part: 'snippet,statistics,contentDetails',
            id: channelIds.join(','),
            key: config.YOUTUBE_API_KEY
        };
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', { params });
        
        // Cost: 1 unit per request
        updateUsage(1);
        
        return response.data.items || [];
    } catch (error) {
        console.error('YouTube Channels API Error:', error.response?.data || error.message);
        throw error;
    }
}

async function getChannelLastVideo(channelId) {
    try {
        const params = {
            part: 'snippet',
            channelId: channelId,
            maxResults: 1,
            order: 'date',
            type: 'video',
            key: config.YOUTUBE_API_KEY
        };
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
        
        // Cost: 100 units per search
        updateUsage(100);
        
        return response.data.items?.[0] || null;
    } catch (error) {
        console.error('YouTube Last Video API Error:', error.response?.data || error.message);
        return null;
    }
}

// Category Mapping
const categoryMap = {
    'Gaming': 20,
    'Education': 27,
    'Entertainment': 24,
    'Music': 10,
    'Technology': 28,
    'Sports': 17,
    'News': 25,
    'Comedy': 23,
    'Film': 1,
    'Beauty': 26,
    'Travel': 19,
    'Science': 28
};

// Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Get API Usage
app.get('/api/usage', (req, res) => {
    checkAndResetQuota();
    
    const remaining = apiUsage.dailyQuota - apiUsage.used;
    const percentage = (apiUsage.used / apiUsage.dailyQuota) * 100;
    
    res.json({
        dailyQuota: apiUsage.dailyQuota,
        used: apiUsage.used,
        remaining: remaining,
        percentage: percentage,
        lastReset: apiUsage.lastReset
    });
});

// Search Channels
app.get('/api/searchChannels', async (req, res) => {
    try {
        const {
            name,
            countries,
            categories,
            fromDate,
            toDate
        } = req.query;
        
        // Check quota
        checkAndResetQuota();
        if (apiUsage.used >= apiUsage.dailyQuota) {
            return res.status(429).json({
                error: 'Daily API quota exceeded. Please try again tomorrow.',
                quota: apiUsage
            });
        }
        
        // Parse multiple countries and categories
        const countryList = countries ? countries.split(',') : [];
        const categoryList = categories ? categories.split(',') : [];
        
        let allChannels = [];
        
        // If no specific filters, do a general search
        if (countryList.length === 0 && categoryList.length === 0) {
            const searchResults = await searchYouTubeChannels(
                name || '',
                null,
                null,
                fromDate ? new Date(fromDate).toISOString() : null,
                toDate ? new Date(toDate).toISOString() : null
            );
            
            const channelIds = searchResults.map(item => item.snippet.channelId);
            
            if (channelIds.length > 0) {
                const detailsResults = await getChannelDetails(channelIds);
                
                // Process channels
                for (const channel of detailsResults) {
                    const lastVideo = await getChannelLastVideo(channel.id);
                    
                    allChannels.push({
                        id: channel.id,
                        name: channel.snippet.title,
                        avatar: channel.snippet.thumbnails.default.url,
                        link: `https://www.youtube.com/channel/${channel.id}`,
                        description: channel.snippet.description.substring(0, 150) + '...',
                        subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                        country: channel.snippet.country || 'Unknown',
                        category: 'General',
                        lastVideo: lastVideo?.snippet.title || 'No videos',
                        lastUpload: lastVideo?.snippet.publishedAt || channel.snippet.publishedAt
                    });
                }
            }
        } else {
            // Search with specific filters
            const searchPromises = [];
            
            // Search by country
            for (const country of countryList) {
                searchPromises.push(
                    searchYouTubeChannels(
                        name || '',
                        country,
                        null,
                        fromDate ? new Date(fromDate).toISOString() : null,
                        toDate ? new Date(toDate).toISOString() : null
                    )
                );
            }
            
            // Search by category
            for (const category of categoryList) {
                const categoryId = categoryMap[category];
                if (categoryId) {
                    searchPromises.push(
                        searchYouTubeChannels(
                            name || '',
                            null,
                            categoryId,
                            fromDate ? new Date(fromDate).toISOString() : null,
                            toDate ? new Date(toDate).toISOString() : null
                        )
                    );
                }
            }
            
            const searchResults = await Promise.all(searchPromises);
            const channelIds = [...new Set(searchResults.flat().map(item => item.snippet.channelId))];
            
            if (channelIds.length > 0) {
                const detailsResults = await getChannelDetails(channelIds.slice(0, 50)); // Limit to 50
                
                // Process channels
                for (const channel of detailsResults) {
                    const lastVideo = await getChannelLastVideo(channel.id);
                    
                    allChannels.push({
                        id: channel.id,
                        name: channel.snippet.title,
                        avatar: channel.snippet.thumbnails.default.url,
                        link: `https://www.youtube.com/channel/${channel.id}`,
                        description: channel.snippet.description.substring(0, 150) + '...',
                        subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                        country: channel.snippet.country || 'Unknown',
                        category: categoryList[0] || 'General',
                        lastVideo: lastVideo?.snippet.title || 'No videos',
                        lastUpload: lastVideo?.snippet.publishedAt || channel.snippet.publishedAt
                    });
                }
            }
        }
        
        res.json({
            channels: allChannels,
            count: allChannels.length,
            quota: {
                used: apiUsage.used,
                remaining: apiUsage.dailyQuota - apiUsage.used
            }
        });
        
    } catch (error) {
        console.error('Search Channels Error:', error);
        res.status(500).json({
            error: 'Failed to search channels',
            message: error.message
        });
    }
});

// Get Channel Details
app.get('/api/channelDetails', async (req, res) => {
    try {
        const { channelIds } = req.query;
        
        if (!channelIds) {
            return res.status(400).json({ error: 'channelIds parameter is required' });
        }
        
        // Check quota
        checkAndResetQuota();
        if (apiUsage.used >= apiUsage.dailyQuota) {
            return res.status(429).json({
                error: 'Daily API quota exceeded. Please try again tomorrow.',
                quota: apiUsage
            });
        }
        
        const ids = channelIds.split(',').slice(0, 50); // Limit to 50
        const detailsResults = await getChannelDetails(ids);
        
        const channels = [];
        
        for (const channel of detailsResults) {
            const lastVideo = await getChannelLastVideo(channel.id);
            
            channels.push({
                id: channel.id,
                name: channel.snippet.title,
                avatar: channel.snippet.thumbnails.default.url,
                link: `https://www.youtube.com/channel/${channel.id}`,
                description: channel.snippet.description.substring(0, 150) + '...',
                subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                country: channel.snippet.country || 'Unknown',
                category: 'General',
                lastVideo: lastVideo?.snippet.title || 'No videos',
                lastUpload: lastVideo?.snippet.publishedAt || channel.snippet.publishedAt
            });
        }
        
        res.json({
            channels: channels,
            count: channels.length,
            quota: {
                used: apiUsage.used,
                remaining: apiUsage.dailyQuota - apiUsage.used
            }
        });
        
    } catch (error) {
        console.error('Channel Details Error:', error);
        res.status(500).json({
            error: 'Failed to fetch channel details',
            message: error.message
        });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  thumbcraft-studio Channel Finder API Server          ║
║  Running on http://localhost:${PORT}                     ║
║                                                        ║
║  Endpoints:                                           ║
║  • GET  /api/health                                   ║
║  • GET  /api/usage                                    ║
║  • GET  /api/searchChannels                           ║
║  • GET  /api/channelDetails                           ║
║                                                        ║
║  Daily Quota: ${apiUsage.dailyQuota} units                           ║
╚════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
