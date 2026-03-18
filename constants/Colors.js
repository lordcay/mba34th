// constants/Colors.js
// Global color constants for the 34th Street app

export const Colors = {
  // Brand Colors
  primary: '#581845',           // Main brand purple
  primaryLight: '#7B2D6E',      // Lighter purple for hover states
  primaryDark: '#3D1030',       // Darker purple for pressed states
  primaryFaded: '#58184510',    // Very transparent for backgrounds
  primaryMuted: '#58184520',    // Light purple tint for backgrounds
  
  // Secondary Colors
  secondary: '#C70039',         // Accent red
  secondaryLight: '#FF5733',    // Bright accent
  
  // UI Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F8F8',
  backgroundTertiary: '#F0F0F0',
  
  // Text Colors
  textPrimary: '#222222',
  textSecondary: '#555555',
  textTertiary: '#777777',
  textMuted: '#999999',
  textLight: '#CCCCCC',
  textWhite: '#FFFFFF',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Social/Reaction Colors
  like: '#581845',              // Heart/like color (brand purple)
  love: '#E91E63',
  celebrate: '#F39C12',
  insightful: '#9B59B6',
  fire: '#E67E22',
  
  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#D0D0D0',
  
  // Special
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
  shadow: '#000000',
  transparent: 'transparent',
  
  // Connection Status Colors
  connected: '#10B981',
  pending: '#F59E0B',
  notConnected: '#9CA3AF',
};

// Export individual colors for convenience
export const {
  primary,
  primaryLight,
  primaryDark,
  primaryFaded,
  primaryMuted,
  secondary,
  background,
  textPrimary,
  textSecondary,
  textMuted,
  success,
  warning,
  error,
  border,
} = Colors;

export default Colors;
