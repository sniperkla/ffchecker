FROM rockylinux:9

# Install Node.js LTS
RUN dnf install -y nodejs npm && \
    dnf clean all && rm -rf /var/cache/dnf/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (Puppeteer will download its own Chromium)
RUN npm install

# Copy application files
COPY . .

EXPOSE 5001

CMD ["npm", "start"]