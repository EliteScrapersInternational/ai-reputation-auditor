import { Actor } from 'apify';

await Actor.init();

const input = await Actor.getInput() || {};
const location = input.location || 'Chicago, IL';
const businessType = input.businessType || 'Bakery';
const maxItems = input.maxItems || 20; 

// Helper to capitalize the City/State for the pitch
const formattedLocation = location.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

console.log(`🚀 STARTING UNIVERSAL AUDIT: Analyzing ${businessType}s in ${formattedLocation}...`);

const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 10, 
    "maxImages": 0,
    "maxItems": maxItems, 
});

const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

const finalResults = items.map((business) => {
    const stars = business.totalScore;
    const count = business.reviewsCount || 0;
    const hasWebsite = !!business.website;
    
    const allReviewsText = (business.reviews || []).map(r => r.text).join(" ").toLowerCase();
    
    let complaint = "None found";
    if (allReviewsText.includes("expensive") || allReviewsText.includes("price") || allReviewsText.includes("charge")) {
        complaint = "Pricing/Cost Issues";
    } else if (allReviewsText.includes("slow") || allReviewsText.includes("wait") || allReviewsText.includes("time")) {
        complaint = "Wait Time/Speed";
    } else if (allReviewsText.includes("rude") || allReviewsText.includes("unprofessional") || allReviewsText.includes("attitude")) {
        complaint = "Customer Service/Staff";
    }

    let pluralType = businessType.toLowerCase();
    if (pluralType.endsWith('y')) {
        pluralType = pluralType.slice(0, -1) + 'ies';
    } else if (!pluralType.endsWith('s')) {
        pluralType = pluralType + 's';
    }

    let ai_audit = "";
    let outreach_pitch = "";
    let quality_score = "⭐️⭐️"; 

    if (complaint !== "None found") {
        quality_score = "⭐️⭐️⭐️⭐️⭐️"; 
        ai_audit = `🚨 CRITICAL: Customers are complaining about ${complaint}.`;
        outreach_pitch = `Hi ${business.title}, I noticed a few recent reviews mentioning ${complaint.toLowerCase()}. I specialize in helping ${pluralType} fix their reputation and bury those negative comments!`;
    } else if (!hasWebsite) {
        quality_score = "⭐️⭐️⭐️⭐️";
        ai_audit = "TECH GAP: Missing website.";
        outreach_pitch = `Hi ${business.title}, you have ${count} reviews but no website! You are losing customers who want to book online. I can build one for you.`;
    } else if (count < 15) {
        quality_score = "⭐️⭐️⭐️";
        ai_audit = "LOW PROOF: Needs more reviews.";
        outreach_pitch = `Hi ${business.title}, you have a great business but only ${count} reviews. If we get you to 50, you'll dominate ${formattedLocation}!`;
    } else {
        ai_audit = "WINNING: Great reputation.";
        outreach_pitch = `Hi ${business.title}, you're crushing it with ${count} reviews! Want to turn your happy customers into a Facebook ad machine?`;
    }

    return {
        lead_quality: quality_score,
        priority: (quality_score === "⭐️⭐️⭐️⭐️⭐️" || quality_score === "⭐️⭐️⭐️⭐️") ? "🚨 HIGH" : "✅ Healthy",
        businessName: business.title,
        stars: stars || "None",
        reviewCount: count,
        top_complaint: complaint,
        phone: business.phone || "MISSING",
        website: business.website || "MISSING",
        ai_audit: ai_audit,
        outreach_pitch: outreach_pitch
    };
});

// Sort to put the 5-star leads at the top
finalResults.sort((a, b) => b.lead_quality.length - a.lead_quality.length);

await Actor.pushData(finalResults);
await Actor.exit();
