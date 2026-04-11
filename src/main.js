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
    const hasWebsite = !!business.website;
    const hasPhone = !!business.phone;
    
    let ai_audit = "";
    let outreach_pitch = "";
    let warnings = [];

    // 1. CHECK FOR RED FLAGS (The Differentiator)
    if (!hasWebsite) warnings.push("NO WEBSITE");
    if (!hasPhone) warnings.push("NO PHONE");
    if (stars && stars < 4.0) warnings.push("BAD RATING");
    if (count < 10) warnings.push("LOW PROOF");

    const priorityScore = warnings.length > 0 
        ? `🚨 HIGH: ${warnings.join(" + ")}` 
        : "✅ Healthy";

    // 2. SMART LOGIC FOR THE PITCH
    if (!stars || count === 0) {
        ai_audit = `INVISIBLE: This business has no presence. They are losing 100% of local search traffic.`;
        outreach_pitch = `Hi ${business.title}, I searched for ${businessType} in ${location} and noticed you don't have any reviews yet. I can help you get your first 10!`;
    } 
    else if (stars < 4.2) {
        ai_audit = `REPUTATION DANGER: A ${stars} star rating is scaring away high-ticket leads.`;
        outreach_pitch = `Hi ${business.title}, I noticed your ${stars}-star rating. In the ${businessType} industry, anything under 4.5 makes people nervous. I can fix this for you!`;
    } 
    else if (count < 20) {
        ai_audit = `LOW TRUST: The rating is good, but there aren't enough reviews to prove expertise.`;
        outreach_pitch = `Hi ${business.title}, you have a great rating, but only ${count} reviews. If we get you to 50 reviews, you'll dominate ${location}!`;
    } 
    else {
        ai_audit = `WINNING: Good rating and solid volume. Strategy: Use reviews for social ads.`;
        outreach_pitch = `Hi ${business.title}, you're crushing it with ${count} reviews! I can help you turn those into Facebook ads to get more ${businessType} customers.`;
    }

    // 3. FINAL DATA RETURN
    return {
        priority_score: priorityScore,
        businessName: business.title,
        stars: stars || "None",
        reviewCount: count,
        phone: business.phone || "MISSING",
        website: business.website || "MISSING",
        address: business.address || "No Address Listed",
        ai_audit: ai_audit,
        outreach_pitch: outreach_pitch
    };
});

await Actor.pushData(finalResults);
await Actor.exit();
