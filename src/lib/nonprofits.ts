export type DirectorySortKey = "priority" | "rating" | "reviews" | "name";

export interface DirectoryNonProfit {
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
  latestReviewer: string;
  latestNote: string;
  accentFrom: string;
  accentTo: string;
}

export const featuredNonProfits: DirectoryNonProfit[] = [
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
    latestReviewer: "Volunteer desk",
    latestNote: "Weekend restoration crew still needs two more volunteers for the Chattahoochee shift.",
    accentFrom: "#37b7b0",
    accentTo: "#f1c457",
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
    latestReviewer: "Shift coordinator",
    latestNote: "Saturday packing line is nearly full, but the mobile pantry route still needs drivers.",
    accentFrom: "#148a7f",
    accentTo: "#84c5a3",
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
    latestReviewer: "Program lead",
    latestNote: "Their spring volunteer queue is moving fast, so this is a good quick-start placement.",
    accentFrom: "#1d7ac8",
    accentTo: "#6ad2ff",
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
    latestReviewer: "Field team",
    latestNote: "Volunteer turnout is strong on weekdays, but neighborhood plantings still need backup.",
    accentFrom: "#159a55",
    accentTo: "#b6dc73",
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
    latestReviewer: "Kennel team",
    latestNote: "Afternoon dog-walking slots are the tightest gap in the next volunteer rotation.",
    accentFrom: "#ef8354",
    accentTo: "#f6d365",
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
    latestReviewer: "Evening intake",
    latestNote: "Their dinner service team is covered tonight, but mentorship intake remains understaffed.",
    accentFrom: "#7d6bff",
    accentTo: "#ca8dff",
  },
];

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
