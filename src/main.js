import { Actor } from 'apify';

await Actor.init();

// 1. This grabs whatever the CLIENT typed into the form
const input = await Actor.getInput() || {};
const location = input.location;
const businessType = input.businessType;
const maxItems = input.maxItems || 20; 

console.log(`🔎 Client is searching for ${businessType} in ${location}...`);

// 2. We pass the client's words directly into the Google Maps scraper
const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 5, 
    "maxItems": maxItems, 
});

const { defaultDatasetId } = mapRun;
const dataset = await Actor.openDataset(defaultDatasetId);
const { items } = await dataset.getData();

const finalResults = items.map((business) => {
    const count = business.reviewsCount || 0;
    const hasWebsite = !!business.website;
    const allReviewsText = (business.reviews || []).map(r => r.text).join(" ").toLowerCase();
    
    // Check for complaints
    let complaint = "None found";
    if (allReviewsText.includes("expensive") || allReviewsText.includes("price")) {
        complaint = "Pricing/Cost Issues";
    } else if (allReviewsText.includes("slow") || allReviewsText.includes("wait")) {
        complaint = "Wait Time/Speed";
    }

    // Fix the business name for the pitch (e.g., "plumbers", "dentists")
    let pluralType = businessType.toLowerCase();
    if (pluralType.endsWith('y')) pluralType = pluralType.slice(0, -1) + 'ies';
    else if (!pluralType.endsWith('s')) pluralType += 's';

    let audit = "";
    if (complaint !== "None found") {
        audit = `🚨 CRITICAL: People are upset about ${complaint.toLowerCase()}.`;
    } else if (!hasWebsite) {
        audit = "TECH GAP: No website found.";
    } else {
        audit = "HEALTHY: Great online presence.";
    }

    return {
        businessName: business.title,
        location: location,
        audit_result: audit,
        contact_phone: business.phone || "MISSING",
        website: business.website || "MISSING",
        pitch: `Hi ${business.title}, I noticed some issues with your ${pluralType} reputation. I can help!`
    };
});

await Actor.pushData(finalResults);
await Actor.exit();
