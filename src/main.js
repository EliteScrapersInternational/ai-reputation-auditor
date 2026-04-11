import { Actor } from 'apify';

await Actor.init();

const input = await Actor.getInput() || {};
const location = input.location || 'Miami, FL';
const businessType = input.businessType || 'Dentist'; // Default to Dentist
const maxItems = input.maxItems || 20;

console.log(`🚀 UNIVERSAL AUDIT: Finding ${maxItems} ${businessType}s in ${location}...`);

const mapRun = await Actor.call('compass/crawler-google-places', {
    "searchStringsArray": [`${businessType} in ${location}`],
    "maxReviews": 0, 
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
    const hasPhone = !!business.phone;
    
    // SMART GRAMMAR: Fixes the "1 reviews" problem
    const reviewWord = count === 1 ? "review" : "reviews";
    
    let ai_audit = "";
    let outreach_pitch = "";
    let warnings = [];

    if (!hasWebsite) warnings.push("NO WEBSITE");
    if (!hasPhone) warnings.push("NO PHONE");
    if (stars && stars < 4.0) warnings.push("BAD RATING");
    if (count < 10) warnings.push("LOW PROOF");

    const priorityScore = warnings.length > 0 
        ? `🚨 HIGH: ${warnings.join(" + ")}` 
        : "✅ Healthy";

    // UNIVERSAL LOGIC: It uses the {businessType} from the input box!
    if (!stars || count === 0) {
        ai_audit = `INVISIBLE: This ${businessType} has no presence.`;
        outreach_pitch = `Hi ${business.title}, I was looking for a ${businessType} in ${location} and couldn't find any reviews for you. I help ${businessType}s get noticed!`;
    } 
    else if (stars < 4.2) {
        ai_audit = `REPUTATION DANGER: ${stars} stars is hurting your ${businessType} brand.`;
        outreach_pitch = `Hi ${business.title}, I noticed your ${stars}-star rating. Most people looking for a ${businessType} will skip over anything under 4.5. Want me to help fix this?`;
    } 
    else {
        ai_audit = `WINNING: Solid ${businessType} profile.`;
        outreach_pitch = `Hi ${business.title}, you're doing great with ${count} ${reviewWord}! I can help you turn those into ads to get more ${businessType} customers.`;
    }

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
