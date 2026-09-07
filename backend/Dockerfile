FROM golang:1.27.1-alpine AS build

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go build -o /out/bludm-api ./cmd/server
RUN go build -o /out/bludm-migrate ./cmd/migrate

FROM alpine:3.24

RUN apk upgrade --no-cache libcrypto3 libssl3
RUN adduser -D -H appuser
USER appuser
COPY --from=build /out/bludm-api /usr/local/bin/bludm-api
COPY --from=build /out/bludm-migrate /usr/local/bin/bludm-migrate

EXPOSE 8080
ENTRYPOINT ["bludm-api"]
