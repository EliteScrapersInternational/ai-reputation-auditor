import { Actor } from 'apify';

await Actor.init();

const input = await Actor.getInput() || {};
const location = input.location || 'Miami, FL';
const businessType = input.businessType || 'Dentist';
const maxItems = input.maxItems || 10; // Keep it small for testing!

console.log(`🔍 DEEP AUDIT: Reading reviews for ${businessType}s in ${location}...`);

const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 10, // NOW WE ARE READING THE TOP 10 REVIEWS!
    "maxImages": 0,
    "maxItems": maxItems, 
});

const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

const finalResults = items.map((business) => {
    const stars = business.totalScore;
    const count = business.reviewsCount || 0;
    
    // --- NEW: REVIEW ANALYSIS LOGIC ---
    const allReviewsText = (business.reviews || []).map(r => r.text).join(" ").toLowerCase();
    
    let complaint = "None found";
    if (allReviewsText.includes("expensive") || allReviewsText.includes("price") || allReviewsText.includes("charge")) {
        complaint = "Pricing/Cost Issues";
    } else if (allReviewsText.includes("slow") || allReviewsText.includes("wait") || allReviewsText.includes("time")) {
        complaint = "Wait Time/Speed";
    } else if (allReviewsText.includes("rude") || allReviewsText.includes("unprofessional") || allReviewsText.includes("attitude")) {
        complaint = "Customer Service/Staff";
    }
    // ----------------------------------

    const reviewWord = count === 1 ? "review" : "reviews";
    let ai_audit = "";
    let outreach_pitch = "";

    if (complaint !== "None found") {
        ai_audit = `🚨 CRITICAL: Customers are complaining about ${complaint}.`;
        outreach_pitch = `Hi ${business.title}, I noticed a few recent reviews mentioning ${complaint.toLowerCase()}. I specialize in helping ${businessType}s fix their reputation and bury those negative comments!`;
    } else if (!stars || count < 5) {
        ai_audit = "INVISIBLE: No social proof.";
        outreach_pitch = `Hi ${business.title}, you're invisible in ${location}! Let's get you 20 fresh reviews this month.`;
    } else {
        ai_audit = "WINNING: Great reputation.";
        outreach_pitch = `Hi ${business.title}, you're crushing it! Want to turn your happy customers into a referral machine?`;
    }

    return {
        businessName: business.title,
        stars: stars || "None",
        reviewCount: count,
        top_complaint: complaint, // New column!
        phone: business.phone || "MISSING",
        website: business.website || "MISSING",
        ai_audit: ai_audit,
        outreach_pitch: outreach_pitch
    };
});

await Actor.pushData(finalResults);
await Actor.exit();
