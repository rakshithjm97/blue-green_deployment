# FROM node:14
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD [ "npm", "start" ]

# Use Node.js base image
FROM node:14 as production

# Create a non-root user
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

# Switch to the non-root user
USER node

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm install --production

# Copy the rest of your application code
COPY --chown=node:node . .

# Build your application (if needed)
RUN npm run build  # Assuming you have a build script in your package.json

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]

