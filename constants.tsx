
import { MembershipTier } from './types';

export const MIN_WITHDRAWAL = 5000; // 5000 MWK
export const LEVEL_1_COMMISSION_PERCENT = 10;
export const LEVEL_2_COMMISSION_PERCENT = 5;
export const SIGNUP_BONUS = 0; // No signup bonus - strictly work-based

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
  directCommission: number; // L1 % (Requested 30% - 40%)
  indirectCommission: number; // L2 % (Requested flat 5%)
}

export const MEMBERSHIP_TIERS: MembershipConfig[] = [
  {
    tier: MembershipTier.BRONZE,
    name: 'Bronze',
    price: 2000,
    color: '#cd7f32',
    description: 'Entry tier. 30% profit on direct referrals.',
    directCommission: 30,
    indirectCommission: 5
  },
  {
    tier: MembershipTier.PLATINUM,
    name: 'Platinum',
    price: 5000,
    color: '#e5e4e2',
    description: 'Value tier. 32% profit on direct referrals.',
    directCommission: 32,
    indirectCommission: 5
  },
  {
    tier: MembershipTier.SILVER,
    name: 'Silver',
    price: 10000,
    color: '#c0c0c0',
    description: 'Pro tier. 34% profit on direct referrals.',
    directCommission: 34,
    indirectCommission: 5
  },
  {
    tier: MembershipTier.COPPER,
    name: 'Copper',
    price: 15000,
    color: '#b87333',
    description: 'Expert tier. 36% profit on direct referrals.',
    directCommission: 36,
    indirectCommission: 5
  },
  {
    tier: MembershipTier.ALUMINIUM,
    name: 'Aluminium',
    price: 20000,
    color: '#d1d1d1',
    description: 'Master tier. 38% profit on direct referrals.',
    directCommission: 38,
    indirectCommission: 5
  },
  {
    tier: MembershipTier.GOLD,
    name: 'Gold',
    price: 25000,
    color: '#ffd700',
    description: 'Elite tier. Maximum 40% profit on direct referrals.',
    directCommission: 40,
    indirectCommission: 5
  }
];
