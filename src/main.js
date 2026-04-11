import { Actor } from 'apify';

await Actor.init();

// 1. Get the settings you typed into the "Input" tab
const input = await Actor.getInput() || {};
const location = input.location || 'Miami, FL';
const businessType = input.businessType || 'Bakery';
const maxItems = input.maxItems || 10; 

console.log(`🚀 STARTING SUPER AUDIT: Analyzing ${businessType}s in ${location}...`);

// 2. Call the Google Maps Scraper
const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 10, 
    "maxImages": 0,
    "maxItems": maxItems, 
});

const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

// 3. Process the data and create the AI Audit
const finalResults = items.map((business) => {
    const stars = business.totalScore;
    const count = business.reviewsCount || 0;
    const hasWebsite = !!business.website;
    
    // Combine reviews into one big text to search for problems
    const allReviewsText = (business.reviews || []).map(r => r.text).join(" ").toLowerCase();
    
    let complaint = "None found";
    if (allReviewsText.includes("expensive") || allReviewsText.includes("price") || allReviewsText.includes("charge")) {
        complaint = "Pricing/Cost Issues";
    } else if (allReviewsText.includes("slow") || allReviewsText.includes("wait") || allReviewsText.includes("time")) {
        complaint = "Wait Time/Speed";
    } else if (allReviewsText.includes("rude") || allReviewsText.includes("unprofessional") || allReviewsText.includes("attitude")) {
        complaint = "Customer Service/Staff";
    }

    const reviewWord = count === 1 ? "review" : "reviews";
    let ai_audit = "";
    let outreach_pitch = "";

    // LOGIC: Decide what to say based on what we found
    if (complaint !== "None found") {
        ai_audit = `🚨 CRITICAL: Customers are complaining about ${complaint}.`;
        outreach_pitch = `Hi ${business.title}, I noticed a few recent reviews mentioning ${complaint.toLowerCase()}. I specialize in helping ${businessType}s fix their reputation and bury those negative comments!`;
    } else if (!stars || count < 10) {
        ai_audit = "LOW PROOF: Needs more social proof.";
        outreach_pitch = `Hi ${business.title}, you have a great business but only ${count} ${reviewWord}. If we get you to 50 reviews, you'll dominate ${location}!`;
    } else if (!hasWebsite) {
        ai_audit = "TECH GAP: Missing website.";
        outreach_pitch = `Hi ${business.title}, you have ${count} reviews but no website! You are losing customers who want to book online. I can build one for you.`;
    } else {
        ai_audit = "WINNING: Great reputation.";
        outreach_pitch = `Hi ${business.title}, you're crushing it with ${count} reviews! Want to turn your happy customers into a Facebook ad machine?`;
    }

    return {
        priority_score: (complaint !== "None found" || !hasWebsite) ? "🚨 HIGH" : "✅ Healthy",
