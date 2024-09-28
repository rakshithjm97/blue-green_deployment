# FROM node:14
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD [ "npm", "start" ]


# Stage 1: Build stage
FROM node:14 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build  

# Stage 2: Production stage
FROM nginx:alpine  
# Create a non-root user
RUN addgroup -S nonroot && adduser -S nonroot -G nonroot

# Copy the production build from the previous stage
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Change ownership of the NGINX directories to nonroot
RUN chown -R nonroot:nonroot /usr/share/nginx/html /var/cache/nginx /var/run

# Use the non-root user
USER nonroot

# Expose port 80 and start NGINX
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]