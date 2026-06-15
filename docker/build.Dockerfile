FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/vite-plugin-flatwave-react/package*.json ./packages/vite-plugin-flatwave-react/
COPY examples/basic-react-site/package*.json ./examples/basic-react-site/
RUN npm install
CMD ["npm", "run", "build"]
