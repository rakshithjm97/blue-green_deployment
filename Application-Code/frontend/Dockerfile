# FROM node:14
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD [ "npm", "start" ]

# Step 1: Build the app
FROM node:14 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build  # Create a production build

# Step 2: Serve the app
FROM nginx:alpine

# Copy the production build to Nginx
COPY --from=build /usr/src/app/build /usr/share/nginx/html  

#Expose port 80 for the Nginx server
EXPOSE 80  

CMD ["nginx", "-g", "daemon off;"]  # Start Nginx server

