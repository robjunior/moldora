FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/apps/web
CMD ["npm", "run", "dev"]
