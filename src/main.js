import { Actor } from 'apify';

await Actor.init();

// 1. Get the City and Business Type from the user
const input = await Actor.getInput();
const { location, businessType } = input;

console.log(`🔎 Searching for ${businessType} in ${location}...`);

// 2. Call a powerful Google Maps scraper to do the "heavy lifting"
// This saves us from writing 1,000 lines of code!
const mapRun = await Actor.call('apify/google-maps-scraper', {
    searchStrings: [`${businessType} in ${location}`],
    maxPoints: 5, // We'll start with 5 to keep it fast
    includeReviews: true,
});

// 3. Get the results from that scraper
const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

// 4. Loop through each business and add our "AI Brain"
const finalResults = items.map((business) => {
    const reviews = business.reviews || [];
    const reviewText = reviews.map(r => r.text).join(' ');

    // Here is where we "fake" the AI for now (we will add the real AI link next!)
    // We are creating a "Personalized Pitch" for the business
    return {
        businessName: business.title,
        address: business.address,
        phone: business.phone,
        stars: business.totalScore,
        ai_audit: `This business has ${business.reviewsCount} reviews. Suggested strategy: Help them get more 5-star reviews!`,
        outreach_pitch: `Hi ${business.title}, I noticed you have a ${business.totalScore} rating in ${location}. I can help you improve that!`
    };
});

// 5. Save our "Smart Data" to the Apify dashboard
await Actor.pushData(finalResults);

await Actor.exit();
