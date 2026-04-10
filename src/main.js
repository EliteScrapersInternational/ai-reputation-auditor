import { Actor } from 'apify';

await Actor.init();

const input = await Actor.getInput() || {};
const location = input.location || 'Atlanta, GA';
const businessType = input.businessType || 'Solar Energy Company';

console.log(`🧠 SMART AUDIT: Analyzing ${businessType} in ${location}...`);

const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 0, 
    "maxImages": 0,
    "maxItems": 10, 
});

const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

const finalResults = items.map((business) => {
    const stars = business.totalScore;
    const count = business.reviewsCount || 0;
    
    let ai_audit = "";
    let outreach_pitch = "";

   // --- THE DYNAMIC LOGIC GATE ---
    if (!stars || count === 0) {
        ai_audit = `INVISIBLE: This business has no presence. They are losing 100% of local search traffic.`;
        outreach_pitch = `Hi ${business.title}, I searched for ${businessType} in ${location} and noticed you don't have any reviews yet. I can help you get your first 10 reviews!`;
    } 
    else if (stars < 4.2) {
        ai_audit = `REPUTATION DANGER: A ${stars} star rating is scaring away high-ticket ${businessType} leads.`;
        outreach_pitch = `Hi ${business.title}, I noticed your ${stars}-star rating. In the ${businessType} industry, anything under 4.5 makes people nervous. I can help you fix those negative reviews!`;
    } 
    else if (count < 20) {
        ai_audit = `LOW TRUST: The rating is good, but there aren't enough reviews to prove they are experts.`;
        outreach_pitch = `Hi ${business.title}, you have a great ${stars}-star rating, but only ${count} reviews. If we get you to 50 reviews, you'll dominate the ${location} market!`;
    } 
    else {
        ai_audit = `WINNING: Good rating and solid volume. Strategy: Use these reviews for social media ads.`;
        outreach_pitch = `Hi ${business.title}, you're crushing it with ${count} reviews! I can help you turn those 5-star reviews into Facebook ads to get even more ${businessType} customers.`;
    }return {
        businessName: business.title,
        stars: stars || "None",
        reviewCount: count,
        ai_audit: ai_audit,
        outreach_pitch: outreach_pitch,
        website: business.website, // Added this so you can visit their site!
        phone: business.phoneNumber // Added this so you can call them!
    };
});

// This sends the list to your "Dataset" tab
await Actor.pushData(finalResults);

// This tells the Apify server you are finished
await Actor.exit();
