#!/usr/bin/env node

/**
 * Test script for Facebook Ad Library API
 * Usage: node scripts/test-facebook-api.js YOUR_ACCESS_TOKEN
 */

const https = require('https');
const { URL } = require('url');

const accessToken = process.argv[2];

if (!accessToken) {
    console.error('❌ Please provide an access token:');
    console.error('   node scripts/test-facebook-api.js YOUR_ACCESS_TOKEN');
    process.exit(1);
}

// Test with a simple search
const params = new URLSearchParams({
    access_token: accessToken,
    search_terms: 'coffee',
    ad_reached_countries: JSON.stringify(['US']),
    ad_active_status: 'ALL',
    limit: '5',
    fields: 'id,ad_creation_time,page_name,ad_creative_bodies,ad_snapshot_url'
});

const url = new URL(`https://graph.facebook.com/v21.0/ads_archive?${params}`);

console.log('🔍 Testing Facebook Ad Library API...');
console.log('📍 URL:', url.toString().replace(accessToken, 'YOUR_TOKEN'));

const req = https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200) {
                console.log('✅ Success! API is working');
                console.log(`📊 Found ${response.data?.length || 0} ads`);
                
                if (response.data && response.data.length > 0) {
                    console.log('\n📋 Sample Ad:');
                    const ad = response.data[0];
                    console.log(`   ID: ${ad.id}`);
                    console.log(`   Page: ${ad.page_name || 'Unknown'}`);
                    console.log(`   Text: ${ad.ad_creative_bodies?.[0]?.substring(0, 100) || 'No text'}...`);
                    console.log(`   Created: ${ad.ad_creation_time || 'Unknown'}`);
                }
                
                console.log('\n🎉 Your token has the correct permissions!');
            } else {
                console.error(`❌ API Error (${res.statusCode}):`, response.error?.message || 'Unknown error');
                
                if (response.error?.code === 190) {
                    console.error('🔑 Token issue - check if token is valid and has ads_read permission');
                } else                 if (response.error?.code === 2332004) {
                    console.error('🚫 Permission denied - your app needs ads_read permission approved');
                } else if (response.error?.code === 10 && response.error?.error_subcode === 2332002) {
                    console.error('🚫 App Review Required:');
                    console.error('   1. Go to developers.facebook.com/apps/');
                    console.error('   2. Select your app → App Review → Permissions');
                    console.error('   3. Request "ads_read" permission');
                    console.error('   4. Submit for review with use case description');
                }
            }
        } catch (error) {
            console.error('❌ Failed to parse response:', error.message);
            console.error('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.setTimeout(10000, () => {
    console.error('❌ Request timed out');
    req.destroy();
});
