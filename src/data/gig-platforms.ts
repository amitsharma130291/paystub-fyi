export interface GigPlatform {
  name: string;
  slug: string;
  payStructure: string;
  payFrequency: string;
  feeStructure: string;
}

export const gigPlatforms: GigPlatform[] = [
  {
    name: 'DoorDash',
    slug: 'doordash',
    payStructure: 'Base pay + promotions + tips. Base pay varies by estimated time, distance, and desirability of order ($2–$10+).',
    payFrequency: 'Weekly direct deposit (Mondays) or daily via Fast Pay ($1.99 fee)',
    feeStructure: 'No joining fee. DoorDash takes a percentage of the order subtotal from merchants; dashers keep 100% of their earnings and tips.',
  },
  {
    name: 'Uber',
    slug: 'uber',
    payStructure: 'Base fare + per mile + per minute + surge pricing + tips. Earnings vary by city and demand.',
    payFrequency: 'Weekly (Mondays) or Instant Pay anytime (up to 5x/day, $0.50–$0.85 fee)',
    feeStructure: 'Uber takes 25% service fee from each fare. Drivers keep 75% of base earnings plus 100% of tips.',
  },
  {
    name: 'Instacart',
    slug: 'instacart',
    payStructure: 'Batch pay based on order complexity, number of items, distance, and effort. Peak boost available during busy periods.',
    payFrequency: 'Weekly direct deposit or Instant Cashout ($0.50 fee)',
    feeStructure: 'Instacart retains a service fee from customers. Shoppers receive 100% of tips and all batch pay earnings.',
  },
  {
    name: 'Lyft',
    slug: 'lyft',
    payStructure: 'Base fare + time + distance + Prime Time surge pricing + tips. Earnings vary by market.',
    payFrequency: 'Weekly (Tuesdays) or Express Pay anytime (up to 5x/day, $0.50 fee)',
    feeStructure: 'Lyft takes approximately 25% service fee. Drivers keep 75% of base fare plus 100% of tips.',
  },
  {
    name: 'Amazon Flex',
    slug: 'amazon-flex',
    payStructure: 'Fixed hourly block pay ($18–$25/hour depending on region). Tips from Amazon Fresh orders paid separately.',
    payFrequency: 'Tuesday and Friday direct deposits',
    feeStructure: 'No platform fees deducted from driver pay. Amazon pays a set block rate inclusive of fuel and expenses.',
  },
  {
    name: 'Grubhub',
    slug: 'grubhub',
    payStructure: 'Delivery pay + mileage pay + tips. Guaranteed minimum pay during scheduled blocks in some markets.',
    payFrequency: 'Weekly direct deposit or Instant Cash Out ($0.50 fee)',
    feeStructure: 'Grubhub charges merchants a commission. Drivers receive 100% of their delivery pay plus 100% of tips.',
  },
  {
    name: 'Fiverr',
    slug: 'fiverr',
    payStructure: 'Project-based gig pricing starting at $5. Sellers set their own rates with tiered gig packages.',
    payFrequency: 'Funds available after 14-day clearance (7 days for Top Rated Sellers). Withdraw anytime.',
    feeStructure: 'Fiverr charges sellers 20% on all orders. Buyers pay an additional service fee at checkout.',
  },
  {
    name: 'Upwork',
    slug: 'upwork',
    payStructure: 'Hourly or fixed-price contracts. Freelancers set their own rates; hourly work tracked via Upwork desktop app.',
    payFrequency: 'Weekly for hourly contracts (10-day security period). Fixed contracts released upon milestone approval.',
    feeStructure: 'Upwork charges 10% service fee on all earnings (down from previous sliding scale). Clients also pay a processing fee.',
  },
  {
    name: 'Shipt',
    slug: 'shipt',
    payStructure: 'Order pay ($5 base + $0.07 per item + estimated mileage) + 100% of tips. Metro bonus in busy markets.',
    payFrequency: 'Weekly direct deposit (Fridays) or Instant Pay anytime',
    feeStructure: 'Shipt charges customers a membership fee or per-order fee. Shoppers receive order pay and all tips.',
  },
  {
    name: 'TaskRabbit',
    slug: 'taskrabbit',
    payStructure: 'Taskers set their own hourly rates for services (moving, handyman, cleaning, etc.). Rates vary widely by market.',
    payFrequency: '24 hours after task completion via direct deposit',
    feeStructure: 'TaskRabbit charges Taskers a 15% service fee per job. A $25 registration fee applies for new Taskers.',
  },
  {
    name: 'Freelancer',
    slug: 'freelancer',
    payStructure: 'Bid on fixed-price or hourly projects. Rates set by freelancer per project or per hour.',
    payFrequency: 'Withdraw anytime (minimum $30). Processing takes 1–5 business days depending on method.',
    feeStructure: 'Freelancer charges 10% or $5 (whichever is greater) on fixed-price projects. Hourly projects: 10% fee.',
  },
  {
    name: 'Self-Employed',
    slug: 'self-employed',
    payStructure: 'Entirely self-determined. Independent contractors invoice clients at negotiated rates (hourly, project, retainer).',
    payFrequency: 'Upon invoice payment, typically Net-15, Net-30, or Net-60 terms',
    feeStructure: 'No platform fees, but self-employed individuals pay both employer and employee portions of FICA taxes (15.3%) plus self-employment tax.',
  },
];
