// apps/backend/src/auth/jwt.config.ts
export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'secret-de-secours-uniquement-pour-le-dev',
};