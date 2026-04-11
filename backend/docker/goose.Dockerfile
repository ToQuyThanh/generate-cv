FROM golang:1.22-alpine AS builder
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

FROM alpine:3.19
COPY --from=builder /go/bin/goose /usr/local/bin/goose
ENTRYPOINT ["goose"]
