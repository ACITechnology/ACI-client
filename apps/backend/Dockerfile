# Étape 1 : Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

# Étape 2 : Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# On copie tout le nécessaire
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# LA CORRECTION ICI : 
# On cherche récursivement le fichier main.js et on le lance
CMD ["sh", "-c", "node $(find dist -name main.js)"]