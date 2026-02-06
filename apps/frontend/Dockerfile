FROM node:20-alpine AS builder

WORKDIR /app

# On déclare que l'argument va être utilisé pendant le build
ARG NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# On injecte l'argument dans l'environnement du build
RUN NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["npm", "run", "start"]