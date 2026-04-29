export const LOCATION_VALUES = ['Fridge', 'Freezer', 'Pantry', 'Counter', 'Other'] as const;
export type FoodLocation = (typeof LOCATION_VALUES)[number];

export const ACTION_VALUES = [
  'add_food',
  'update_food',
  'remove_food',
  'list_food',
  'expiring_food',
  'help',
  'unknown'
] as const;
export type FoodAction = (typeof ACTION_VALUES)[number];

export interface ParsedFoodCommand {
  action: FoodAction;
  itemName: string | null;
  expirationDate: string | null;
  location: FoodLocation | null;
  quantity: string | null;
  category: string | null;
  notes: string | null;
  days: number | null;
  confidence: number;
  needsConfirmation: boolean;
  missingFields: string[];
}

export interface FoodItem {
  id: string;
  name: string;
  expirationDate: string | null;
  location: string | null;
  quantity: string | null;
  category: string | null;
  status: string | null;
  addedBy: string | null;
  notes: string | null;
  lastUpdated: string | null;
}

export interface FoodMutationInput {
  itemName: string;
  expirationDate?: string | null;
  location?: string | null;
  quantity?: string | null;
  category?: string | null;
  status?: string | null;
  addedBy?: string | null;
  notes?: string | null;
}

