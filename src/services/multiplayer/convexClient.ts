import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL?.trim() ?? '';

export const isConvexConfigured = convexUrl.length > 0;

export const convexClient = isConvexConfigured ? new ConvexReactClient(convexUrl) : null;

export const getConvexUrl = (): string => convexUrl;
