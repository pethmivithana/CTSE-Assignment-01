# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
# Peer deps: React 19 vs Stripe/Leaflet (see .npmrc)
RUN npm install --legacy-peer-deps

COPY . .
ARG REACT_APP_API_URL=http://localhost:3001
ARG REACT_APP_STRIPE_PUBLISHABLE_KEY
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_STRIPE_PUBLISHABLE_KEY=$REACT_APP_STRIPE_PUBLISHABLE_KEY
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
