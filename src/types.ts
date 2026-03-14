export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MenuItem {
  name: string;
  category: 'vegetable' | 'main' | 'snack' | 'dessert';
  estimatedPrice: number;
  ingredients: string[];
  instructions: string[]; // Added for recipe steps
}

export interface MealSlot {
  items: MenuItem[];
}

export interface DayPlan {
  breakfast: MealSlot;
  lunch: MealSlot;
  dinner: MealSlot;
  snacks: MenuItem[];
}

export interface ShoppingItem {
  name: string;
  price: number;
  quantity: string;
  category: 'raw' | 'spice';
}

export interface WeeklyPlan {
  plan: {
    [day: string]: DayPlan;
  };
  shoppingList: ShoppingItem[];
}

export interface BudgetSettings {
  monthlyBudget: number;
  currency: string;
  servings: number; // Added servings for scaling
}
