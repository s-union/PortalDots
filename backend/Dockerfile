FROM golang:1.26-bookworm AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o portaldots-api .

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /app/portaldots-api .
COPY --from=builder /app/db/migrations ./db/migrations
EXPOSE 8080
CMD ["./portaldots-api"]
