package httpapi

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	neturl "net/url"
	"path/filepath"
	"strings"
	"time"
)

const maxImageBytes = 5 << 20

var errPrivateImageURL = errors.New("image URL must resolve to a public address")

func (s *Server) uploadImageAsset(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	reader, err := r.MultipartReader()
	if err != nil {
		writeError(w, http.StatusBadRequest, "image upload must be multipart form data")
		return
	}
	file, filename, err := multipartImagePart(reader)
	if err != nil {
		writeError(w, http.StatusBadRequest, "image file is required")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxImageBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image")
		return
	}
	if len(data) == 0 || len(data) > maxImageBytes {
		writeError(w, http.StatusBadRequest, "image must be between 1 byte and 5 MB")
		return
	}
	contentType := http.DetectContentType(data)
	if contentType != "image/png" && contentType != "image/jpeg" && contentType != "image/gif" && contentType != "image/webp" {
		writeError(w, http.StatusBadRequest, "image must be PNG, JPEG, GIF, or WebP")
		return
	}
	var id string
	if err := s.db.QueryRow(r.Context(), `
		insert into uploaded_assets (owner_user_id, filename, content_type, byte_size, data)
		values ($1, $2, $3, $4, $5)
		returning id
	`, user.ID, filename, contentType, len(data), data).Scan(&id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not store image")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"assetId": id, "url": "/api/assets/" + id})
}

func multipartImagePart(reader *multipart.Reader) (io.ReadCloser, string, error) {
	for {
		part, err := reader.NextPart()
		if err != nil {
			return nil, "", err
		}
		if part.FormName() != "image" {
			_ = part.Close()
			continue
		}
		filename := filepath.Base(part.FileName())
		if filename == "." || filename == string(filepath.Separator) {
			filename = "uploaded-avatar"
		}
		return part, filename, nil
	}
}

func (s *Server) importImageAssetFromURL(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req struct {
		URL string `json:"url"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	rawURL := strings.TrimSpace(req.URL)
	parsed, err := neturl.ParseRequestURI(rawURL)
	if err != nil || parsed.Scheme != "http" && parsed.Scheme != "https" || parsed.Host == "" {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	client, err := imageFetchClient(ctx, parsed)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil) // #nosec G704 -- imageFetchClient restricts fetches to public IPs and disables redirects.
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request.Header.Set("User-Agent", "bluDM avatar importer")
	response, err := client.Do(request) // #nosec G704 -- request URL is prevalidated and dialer rejects private/link-local targets.
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not fetch image URL")
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		writeError(w, http.StatusBadRequest, "image URL did not return a successful response")
		return
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, maxImageBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image URL")
		return
	}
	if len(data) == 0 || len(data) > maxImageBytes {
		writeError(w, http.StatusBadRequest, "image must be between 1 byte and 5 MB")
		return
	}
	contentType := http.DetectContentType(data)
	if contentType != "image/png" && contentType != "image/jpeg" && contentType != "image/gif" && contentType != "image/webp" {
		writeError(w, http.StatusBadRequest, "image URL must point to a PNG, JPEG, GIF, or WebP image")
		return
	}
	filename := parsed.Path
	if filename == "" || strings.HasSuffix(filename, "/") {
		filename = "remote-avatar"
	} else if slash := strings.LastIndex(filename, "/"); slash >= 0 {
		filename = filename[slash+1:]
	}
	if !strings.Contains(filename, ".") {
		filename += imageExtensionForContentType(contentType)
	}
	var id string
	if err := s.db.QueryRow(r.Context(), `
		insert into uploaded_assets (owner_user_id, filename, content_type, byte_size, data)
		values ($1, $2, $3, $4, $5)
		returning id
	`, user.ID, filename, contentType, len(data), data).Scan(&id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not store image")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"assetId": id, "url": "/api/assets/" + id})
}

func imageExtensionForContentType(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".png"
	}
}

func (s *Server) proxyImageURL(w http.ResponseWriter, r *http.Request) {
	rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
	parsed, err := neturl.ParseRequestURI(rawURL)
	if err != nil || parsed.Scheme != "http" && parsed.Scheme != "https" || parsed.Host == "" {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	client, err := imageFetchClient(ctx, parsed)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil) // #nosec G704 -- imageFetchClient restricts fetches to public IPs and disables redirects.
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request.Header.Set("User-Agent", "bluDM avatar preview")
	response, err := client.Do(request) // #nosec G704 -- request URL is prevalidated and dialer rejects private/link-local targets.
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not fetch image URL")
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		writeError(w, http.StatusBadRequest, "image URL did not return a successful response")
		return
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, maxImageBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image URL")
		return
	}
	if len(data) == 0 || len(data) > maxImageBytes {
		writeError(w, http.StatusBadRequest, "image must be between 1 byte and 5 MB")
		return
	}
	contentType := http.DetectContentType(data)
	if contentType != "image/png" && contentType != "image/jpeg" && contentType != "image/gif" && contentType != "image/webp" {
		writeError(w, http.StatusBadRequest, "image URL must point to a PNG, JPEG, GIF, or WebP image")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-store")
	// nosemgrep: go.lang.security.audit.xss.no-direct-write-to-responsewriter.no-direct-write-to-responsewriter -- This endpoint proxies validated image bytes with an image content type, not HTML.
	_, _ = w.Write(data)
}

func imageFetchClient(ctx context.Context, parsed *neturl.URL) (*http.Client, error) {
	host := parsed.Hostname()
	if host == "" {
		return nil, errPrivateImageURL
	}
	resolver := net.DefaultResolver
	ips, err := resolver.LookupIPAddr(ctx, host)
	if err != nil || len(ips) == 0 {
		return nil, errPrivateImageURL
	}
	allowedIPs := make(map[string]struct{}, len(ips))
	for _, ip := range ips {
		if !publicIP(ip.IP) {
			return nil, errPrivateImageURL
		}
		allowedIPs[ip.IP.String()] = struct{}{}
	}
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, err
			}
			ips, err := resolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, err
			}
			for _, ip := range ips {
				if _, ok := allowedIPs[ip.IP.String()]; !ok || !publicIP(ip.IP) {
					return nil, errPrivateImageURL
				}
			}
			return dialer.DialContext(ctx, network, net.JoinHostPort(host, port))
		},
	}
	return &http.Client{
		Timeout:   10 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}, nil
}

func publicIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	return ip.IsGlobalUnicast() && !ip.IsPrivate() && !ip.IsLoopback() && !ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast() && !ip.IsUnspecified()
}

func (s *Server) getAsset(w http.ResponseWriter, r *http.Request) {
	assetID := strings.TrimSpace(r.PathValue("assetID"))
	var contentType string
	var data []byte
	if err := s.db.QueryRow(r.Context(), `
		select content_type, data from uploaded_assets where id = $1
	`, assetID).Scan(&contentType, &data); err != nil {
		writeError(w, http.StatusNotFound, "asset not found")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=86400")
	// nosemgrep: go.lang.security.audit.xss.no-direct-write-to-responsewriter.no-direct-write-to-responsewriter -- This endpoint serves stored image bytes with an image content type, not HTML.
	_, _ = w.Write(data)
}
