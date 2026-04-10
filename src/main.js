import { Actor } from 'apify';

await Actor.init();

// 1. Get the City and Business Type from the user
const input = await Actor.getInput() || {};
const location = input.location || 'Miami, FL';
const businessType = input.businessType || 'Solar Energy Company';

console.log(`☀️ AI AUDIT STARTING: Looking for ${businessType} in ${location}...`);

// 2. Call the Google Maps scraper (Fixed the names to match what the bot wants)
const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`], // Fixed name!
    "maxReviews": 5, // Updated to use the new non-deprecated name
    "maxImages": 0,
    "maxItems": 5, // We'll start with 5 to keep it fast
});

// 3. Get the results
const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

// 4. The "Solar Industry" Brain
const finalResults = items.map((business) => {
    return {
        businessName: business.title,
        location: location,
        stars: business.totalScore,
        reviewCount: business.reviewsCount,
        ai_audit: `Solar leads are high-value. This business has a ${business.totalScore} rating. They are likely losing customers to competitors with better reviews.`,
        outreach_pitch: `Hi ${business.title}, I noticed your Solar company has ${business.reviewsCount} reviews. I can help you fix your reputation and get more installs!`
    };
});

// 5. Save the data
await Actor.pushData(finalResults);

await Actor.exit();
