FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN yarn install --immutable && yarn build
ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100
CMD ["yarn", "start"]
