package mcpserver

import (
	"log/slog"
	"net/http"
	"time"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func NewHTTPHandler(
	service *appdomain.Service,
	logger *slog.Logger,
	maxRequestBytes int64,
	toolTimeout time.Duration,
) http.Handler {
	return mcp.NewStreamableHTTPHandler(func(request *http.Request) *mcp.Server {
		principal, ok := appdomain.PrincipalFromContext(request.Context())
		if !ok {
			return nil
		}
		return newServer(service, principal, logger, toolTimeout)
	}, &mcp.StreamableHTTPOptions{
		Stateless: true, JSONResponse: false, Logger: logger,
		MaxRequestBodyBytes: maxRequestBytes, PropagateRequestCancellation: true,
	})
}
