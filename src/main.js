import { Actor } from 'apify';

await Actor.init();

// 1. Get the City and Business Type from the user
const input = await Actor.getInput() || {};
// We changed the default to "Solar Energy" to match our new niche!
const location = input.location || 'Miami, FL';
const businessType = input.businessType || 'Solar Energy Company';

console.log(`☀️ AI AUDIT STARTING: Looking for ${businessType} in ${location}...`);

// 2. Call the Google Maps scraper 
const mapRun = await Actor.call('compass/crawler-google-places', {
    searchStrings: [`${businessType} in ${location}`],
    maxPoints: 5, 
    includeReviews: true,
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
        // This is the "Hook" for Solar companies
        ai_audit: `Solar leads are worth $2k each. This business has a ${business.totalScore} rating. They are likely losing high-ticket customers to competitors with better reviews.`,
        outreach_pitch: `Hi ${business.title}, I'm an AI specialist in Miami. I noticed your Solar company has ${business.reviewsCount} reviews. I've analyzed your customer feedback and can show you how to capture more solar installs by fixing your reputation.`
    };
});

// 5. Save the data
await Actor.pushData(finalResults);

await Actor.exit();
