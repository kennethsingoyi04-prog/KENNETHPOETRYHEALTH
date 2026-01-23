
import { MembershipTier } from './types';

export const MIN_WITHDRAWAL = 5000; // 5000 MWK
export const LEVEL_1_COMMISSION_PERCENT = 10;
export const LEVEL_2_COMMISSION_PERCENT = 5;
export const SIGNUP_BONUS = 1000; // Small incentive

export const MALAWI_COLORS = {
  green: '#118131',
  red: '#D21034',
  black: '#000000',
};

export interface MembershipConfig {
  tier: MembershipTier;
  name: string;
  price: number;
  color: string;
  description: string;
  directCommission: number; // New field for tier-based earnings
}

export const MEMBERSHIP_TIERS: MembershipConfig[] = [
  {
    tier: MembershipTier.BRONZE,
    name: 'Bronze',
    price: 2000,
    color: '#cd7f32',
    description: 'Entry level membership with basic referral access.',
    directCommission: 30
  },
  {
    tier: MembershipTier.PLATINUM,
    name: 'Platinum',
    price: 5000,
    color: '#e5e4e2',
    description: 'Enhanced tier for consistent affiliates.',
    directCommission: 32
  },
  {
    tier: MembershipTier.SILVER,
    name: 'Silver',
    price: 10000,
    color: '#c0c0c0',
    description: 'Professional tier with priority support.',
    directCommission: 34
  },
  {
    tier: MembershipTier.COPPER,
    name: 'Copper',
    price: 15000,
    color: '#b87333',
    description: 'Exclusive tier with higher earning potential.',
    directCommission: 36
  },
  {
    tier: MembershipTier.ALUMINIUM,
    name: 'Aluminium',
    price: 20000,
    color: '#d1d1d1',
    description: 'Premium tier for network leaders.',
    directCommission: 38
  },
  {
    tier: MembershipTier.GOLD,
    name: 'Gold',
    price: 25000,
    color: '#ffd700',
    description: 'Elite membership with maximum platform benefits.',
    directCommission: 40
  }
];
