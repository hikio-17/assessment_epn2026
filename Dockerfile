FROM node:24-alpine AS development-dependencies-env
RUN npm install -g yarn@1.22.22
COPY . /app
WORKDIR /app
RUN yarn install --frozen-lockfile

FROM node:24-alpine AS production-dependencies-env
RUN npm install -g yarn@1.22.22
COPY ./package.json ./yarn.lock /app/
WORKDIR /app
RUN yarn install --frozen-lockfile --production=true

FROM node:24-alpine AS build-env
RUN npm install -g yarn@1.22.22
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN yarn build

FROM node:24-alpine
RUN npm install -g yarn@1.22.22
COPY ./package.json ./yarn.lock /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
CMD ["yarn", "start"]