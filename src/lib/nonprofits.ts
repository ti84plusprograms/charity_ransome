export type DirectorySortKey = "priority" | "rating" | "reviews" | "name";

export interface NonProfitProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  category: string;
  rating: number;
  reviewCount: number;
  compliancePriority: number;
  openRoles: number;
  mission: string;
  description: string;
  whatTheyDo: string;
  whyThisMattersNow: string;
  currentNeeds: string[];
  latestReviewer: string;
  latestNote: string;
  accentFrom: string;
  accentTo: string;
  website?: string;
  phoneNumber?: string;
  editorialSummary?: string;
  openingHours?: string[];
  mapsUrl?: string;
  placeQuery?: string;
}

export const featuredNonProfits: NonProfitProfile[] = [
  {
    id: "ga-conservancy",
    name: "Georgia Conservancy",
    address: "230 Peachtree Street NW",
    city: "Atlanta",
    state: "GA",
    zip: "30303",
    category: "Environment",
    rating: 4.9,
    reviewCount: 23,
    compliancePriority: 96,
    openRoles: 12,
    mission: "River cleanups, trail restoration, and civic ecology projects across metro Atlanta.",
    description: "Statewide conservation nonprofit focused on land, water, and resilient communities.",
    whatTheyDo:
      "Georgia Conservancy pairs advocacy work with volunteer field days, river stewardship events, and civic ecology programming that helps keep Atlanta's green corridors usable and visible.",
    whyThisMattersNow:
      "Their restoration calendar is compressed into a short seasonal window, so thin volunteer coverage can delay cleanup and trail-support work for weeks.",
    currentNeeds: [
      "Weekend river cleanup crew support",
      "Check-in and supply runners for restoration shifts",
      "Photo and video volunteers for impact recaps",
    ],
    latestReviewer: "Volunteer desk",
    latestNote: "Weekend restoration crew still needs two more volunteers for the Chattahoochee shift.",
    accentFrom: "#37b7b0",
    accentTo: "#f1c457",
    website: "https://www.georgiaconservancy.org",
    placeQuery: "Georgia Conservancy Atlanta GA",
  },
  {
    id: "atl-food-bank",
    name: "Atlanta Community Food Bank",
    address: "3400 North Desert Drive",
    city: "Atlanta",
    state: "GA",
    zip: "30344",
    category: "Food Access",
    rating: 4.9,
    reviewCount: 61,
    compliancePriority: 94,
    openRoles: 18,
    mission: "Warehouse packing, neighborhood pantry support, and rapid meal distribution.",
    description: "Regional food access organization supporting pantry networks across metro Atlanta.",
    whatTheyDo:
      "Atlanta Community Food Bank coordinates warehouse sorting, mobile pantry logistics, neighborhood partner support, and volunteer-driven meal distribution operations.",
    whyThisMattersNow:
      "Demand spikes move quickly, so when the warehouse and mobile routes miss volunteer coverage the whole distribution schedule gets tighter.",
    currentNeeds: [
      "Warehouse sort and pack support",
      "Mobile pantry route assistants",
      "Volunteer floor captains for peak shifts",
    ],
    latestReviewer: "Shift coordinator",
    latestNote: "Saturday packing line is nearly full, but the mobile pantry route still needs drivers.",
    accentFrom: "#148a7f",
    accentTo: "#84c5a3",
    website: "https://www.acfb.org",
    placeQuery: "Atlanta Community Food Bank Atlanta GA",
  },
  {
    id: "hands-on-atlanta",
    name: "Hands On Atlanta",
    address: "600 Means Street NW",
    city: "Atlanta",
    state: "GA",
    zip: "30318",
    category: "Community Service",
    rating: 4.8,
    reviewCount: 54,
    compliancePriority: 88,
    openRoles: 9,
    mission: "School supply drives, mentor matching, and neighborhood impact days.",
    description: "Volunteer mobilization nonprofit connecting Atlanta residents to service projects citywide.",
    whatTheyDo:
      "Hands On Atlanta organizes school partnerships, mentor programs, community build days, and rapid volunteer deployment for neighborhood-facing projects.",
    whyThisMattersNow:
      "Their spring calendar stacks a lot of quick-turn projects together, so one weak volunteer week can impact multiple partner sites at once.",
    currentNeeds: [
      "Project leads for school readiness events",
      "Mentor match support and check-in coverage",
      "Community day setup and breakdown volunteers",
    ],
    latestReviewer: "Program lead",
    latestNote: "Their spring volunteer queue is moving fast, so this is a good quick-start placement.",
    accentFrom: "#1d7ac8",
    accentTo: "#6ad2ff",
    website: "https://www.handsonatlanta.org",
    placeQuery: "Hands On Atlanta Atlanta GA",
  },
  {
    id: "trees-atlanta",
    name: "Trees Atlanta",
    address: "225 Chester Avenue SE",
    city: "Atlanta",
    state: "GA",
    zip: "30316",
    category: "Urban Forestry",
    rating: 4.8,
    reviewCount: 39,
    compliancePriority: 86,
    openRoles: 11,
    mission: "Tree planting, trail stewardship, and urban canopy protection throughout the city.",
    description: "Urban forestry nonprofit protecting Atlanta's canopy through planting and trail stewardship.",
    whatTheyDo:
      "Trees Atlanta coordinates planting days, invasive species removal, trail maintenance, and neighborhood canopy education with volunteer crews across the city.",
    whyThisMattersNow:
      "Planting and maintenance windows are weather-sensitive, which means missed volunteer coverage can knock planned neighborhood work off the calendar.",
    currentNeeds: [
      "Tree planting crew support",
      "Trail stewardship volunteers",
      "Neighborhood event greeters and water runners",
    ],
    latestReviewer: "Field team",
    latestNote: "Volunteer turnout is strong on weekdays, but neighborhood plantings still need backup.",
    accentFrom: "#159a55",
    accentTo: "#b6dc73",
    website: "https://www.treesatlanta.org",
    placeQuery: "Trees Atlanta Atlanta GA",
  },
  {
    id: "paws-atlanta",
    name: "PAWS Atlanta",
    address: "5287 Covington Highway",
    city: "Decatur",
    state: "GA",
    zip: "30035",
    category: "Animal Welfare",
    rating: 4.7,
    reviewCount: 47,
    compliancePriority: 82,
    openRoles: 7,
    mission: "Dog walking, adoption support, and foster network coordination for pets in transition.",
    description: "Animal welfare organization supporting adoptions, fostering, and daily pet care operations.",
    whatTheyDo:
      "PAWS Atlanta relies on volunteers for dog walking, adoption event support, foster coordination, and day-to-day kennel enrichment for animals waiting on placement.",
    whyThisMattersNow:
      "Afternoon care blocks are hard to fill, and those short staffing windows directly affect exercise time and adoption-prep capacity.",
    currentNeeds: [
      "Afternoon dog walkers",
      "Weekend adoption event support",
      "Foster intake and photo volunteers",
    ],
    latestReviewer: "Kennel team",
    latestNote: "Afternoon dog-walking slots are the tightest gap in the next volunteer rotation.",
    accentFrom: "#ef8354",
    accentTo: "#f6d365",
    website: "https://www.pawsatlanta.org",
    placeQuery: "PAWS Atlanta Decatur GA",
  },
  {
    id: "covenant-house-ga",
    name: "Covenant House Georgia",
    address: "1559 Johnson Road NW",
    city: "Atlanta",
    state: "GA",
    zip: "30318",
    category: "Youth Support",
    rating: 4.6,
    reviewCount: 31,
    compliancePriority: 90,
    openRoles: 6,
    mission: "Youth outreach, meal service, and evening support programming for shelter residents.",
    description: "Youth shelter and support nonprofit focused on immediate services and longer-term stability.",
    whatTheyDo:
      "Covenant House Georgia runs youth outreach, meal service, mentorship support, and evening programming that helps shelter residents stay connected to stable resources.",
    whyThisMattersNow:
      "Their evening volunteer coverage is one of the most fragile parts of the week, and missed help can reduce face time for mentorship and meal support.",
    currentNeeds: [
      "Dinner service volunteers",
      "Mentorship intake support",
      "Evening activity facilitators",
    ],
    latestReviewer: "Evening intake",
    latestNote: "Their dinner service team is covered tonight, but mentorship intake remains understaffed.",
    accentFrom: "#7d6bff",
    accentTo: "#ca8dff",
    website: "https://www.covenanthousega.org",
    placeQuery: "Covenant House Georgia Atlanta GA",
  },
];

export type DirectoryNonProfit = NonProfitProfile;

export function sortDirectoryNonProfits(
  nonProfits: DirectoryNonProfit[],
  sortBy: DirectorySortKey,
) {
  const sorted = [...nonProfits];

  switch (sortBy) {
    case "rating":
      return sorted.sort(
        (left, right) =>
          right.rating - left.rating ||
          right.reviewCount - left.reviewCount ||
          right.compliancePriority - left.compliancePriority,
      );
    case "reviews":
      return sorted.sort(
        (left, right) =>
          right.reviewCount - left.reviewCount ||
          right.rating - left.rating ||
          right.compliancePriority - left.compliancePriority,
      );
    case "name":
      return sorted.sort((left, right) => left.name.localeCompare(right.name));
    case "priority":
    default:
      return sorted.sort(
        (left, right) =>
          right.compliancePriority - left.compliancePriority ||
          right.rating - left.rating ||
          right.reviewCount - left.reviewCount,
      );
  }
}

export function getNonProfitById(id: string) {
  return featuredNonProfits.find((nonProfit) => nonProfit.id === id);
}

export function buildNonProfitAddress(nonProfit: NonProfitProfile) {
  const normalizedAddress = nonProfit.address.toLowerCase();
  const containsFullLocation =
    normalizedAddress.includes(nonProfit.city.toLowerCase()) &&
    normalizedAddress.includes(nonProfit.state.toLowerCase());

  if (containsFullLocation) {
    return nonProfit.address;
  }

  const segments = [nonProfit.address, `${nonProfit.city}, ${nonProfit.state} ${nonProfit.zip}`];
  return segments.filter(Boolean).join(", ");
}

export function getUrgencyLabel(priority: number) {
  if (priority >= 92) return "Immediate";
  if (priority >= 85) return "High";
  if (priority >= 75) return "Active";
  return "Steady";
}
