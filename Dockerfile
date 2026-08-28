FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server ./server
COPY index.html login.html styles.css app.js prices.js ./

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/data/data.json
ENV TRUST_PROXY=true
ENV SESSION_SECURE=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.js"]
