
export type UserRole = 'USER' | 'ADMIN';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum MembershipStatus {
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE'
}

export enum MembershipTier {
  NONE = 'NONE',
  BRONZE = 'BRONZE',
  PLATINUM = 'PLATINUM',
  SILVER = 'SILVER',
  COPPER = 'COPPER',
  ALUMINIUM = 'ALUMINIUM',
  GOLD = 'GOLD'
}

export enum PaymentMethod {
  AIRTEL_MONEY = 'Airtel Money',
  TNM_MPAMBA = 'TNM Mpamba'
}

export interface NotificationPreferences {
  emailWithdrawal: boolean;
  emailReferral: boolean;
  whatsappWithdrawal: boolean;
  whatsappReferral: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  referralCode: string;
  referredBy?: string;
  role: UserRole;
  isOwner?: boolean; 
  balance: number;
  totalEarnings: number;
  createdAt: string;
  lastLoginAt?: string; // New: Track user activity
  password?: string;
  profilePic?: string;
  bio?: string;
  location?: string;
  notificationPrefs?: NotificationPreferences;
  membershipTier: MembershipTier;
  membershipStatus: MembershipStatus;
  membershipProofUrl?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  phone: string;
  whatsapp: string;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
  status: WithdrawalStatus;
  createdAt: string;
  adminNote?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  level: 1 | 2;
  commission: number;
  timestamp: string;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  reply?: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  withdrawals: WithdrawalRequest[];
  referrals: Referral[];
  complaints: Complaint[];
  systemSettings?: {
    masterKey: string;
    maintenanceMode: boolean;
  };
}
