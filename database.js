const crypto = require('crypto');

// In-memory analytics store (resets on cold start, safe for Vercel serverless)
// For persistent analytics, connect a real database like Supabase or PlanetScale
let analyticsData = { visits: [] };

// Simple helper to hash IP for privacy
const hashIp = (ip) => {
    return crypto.createHash('sha256').update(ip || '').digest('hex').substring(0, 16);
};

// Simple device type classification
const getDeviceType = (userAgent) => {
    if (!userAgent) return 'Desktop';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
        return 'Mobile';
    }
    return 'Desktop';
};

// Record a visit (in-memory, resets on cold start in serverless environments)
const recordVisit = (visitorId, ip, userAgent) => {
    try {
        const timestamp = new Date();
        const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        const ipHash = hashIp(ip);
        const deviceType = getDeviceType(userAgent);

        const newVisit = {
            timestamp: timestamp.toISOString(),
            date: dateString,
            visitorId: visitorId || 'anonymous',
            ipHash,
            deviceType
        };

        analyticsData.visits.push(newVisit);
        return true;
    } catch (e) {
        console.error('Failed to record visit:', e);
        return false;
    }
};

// Fetch aggregated stats for the admin dashboard
const getStats = () => {
    try {
        const visits = analyticsData.visits || [];

        // 1. Total Visits (Page Loads)
        const totalVisits = visits.length;

        // 2. Unique Visitors
        const uniqueVisitorsSet = new Set();
        visits.forEach(v => {
            if (v.visitorId && v.visitorId !== 'anonymous') {
                uniqueVisitorsSet.add(v.visitorId);
            } else {
                uniqueVisitorsSet.add(v.ipHash);
            }
        });
        const uniqueVisitors = uniqueVisitorsSet.size;

        // 3. Device Classification
        let mobileCount = 0;
        let desktopCount = 0;
        visits.forEach(v => {
            if (v.deviceType === 'Mobile') mobileCount++;
            else desktopCount++;
        });

        // 4. Last 7 Days Trends
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push(dateStr);
        }

        const dateCounts = {};
        last7Days.forEach(date => {
            dateCounts[date] = 0;
        });

        visits.forEach(v => {
            if (dateCounts[v.date] !== undefined) {
                dateCounts[v.date]++;
            }
        });

        const chartLabels = last7Days.map(date => {
            const [_, m, d] = date.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${monthNames[parseInt(m) - 1]} ${d}`;
        });
        
        const chartData = last7Days.map(date => dateCounts[date]);

        // 5. Recent Activity Logs (Anonymized)
        const recentLogs = visits
            .slice(-15)
            .reverse()
            .map(v => ({
                time: v.timestamp,
                device: v.device,
                ipHash: v.ipHash,
                deviceType: v.deviceType
            }));

        return {
            totalVisits,
            uniqueVisitors,
            devices: {
                mobile: mobileCount,
                desktop: desktopCount
            },
            chart: {
                labels: chartLabels,
                data: chartData
            },
            recentLogs
        };
    } catch (e) {
        console.error('Failed to aggregate stats:', e);
        return {
            totalVisits: 0,
            uniqueVisitors: 0,
            devices: { mobile: 0, desktop: 0 },
            chart: { labels: [], data: [] },
            recentLogs: []
        };
    }
};

// Clear all analytics logs
const clearLogs = () => {
    try {
        analyticsData = { visits: [] };
        return true;
    } catch (e) {
        console.error('Failed to clear analytics logs:', e);
        return false;
    }
};

module.exports = {
    recordVisit,
    getStats,
    clearLogs
};
