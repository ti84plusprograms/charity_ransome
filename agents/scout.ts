export interface NonProfit {
  id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  phoneNumber?: string;
  website?: string;
  description?: string;
  urgencyScore?: number;
}

export async function fetchLocalNonProfits(city: string, sortBy: string = "rating"): Promise<NonProfit[]> {
  const response = await fetch(`/api/charities?city=${encodeURIComponent(city)}&sortBy=${sortBy}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch non-profits: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getNonProfitDetails(placeId: string): Promise<NonProfit> {
  const response = await fetch(`/api/charities/${placeId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch non-profit details: ${response.statusText}`);
  }
  
  return response.json();
}