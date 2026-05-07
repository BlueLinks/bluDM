package httpapi

import (
	"context"
	"io"
	"net/http"
	neturl "net/url"
	"strings"
	"time"
)

func (s *Server) uploadImageAsset(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "image upload must be multipart form data")
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "image file is required")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 5<<20+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image")
		return
	}
	if len(data) == 0 || len(data) > 5<<20 {
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
	`, user.ID, header.Filename, contentType, len(data), data).Scan(&id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not store image")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"assetId": id, "url": "/api/assets/" + id})
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
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request.Header.Set("User-Agent", "bluDM avatar importer")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not fetch image URL")
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		writeError(w, http.StatusBadRequest, "image URL did not return a successful response")
		return
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 5<<20+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image URL")
		return
	}
	if len(data) == 0 || len(data) > 5<<20 {
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
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		writeError(w, http.StatusBadRequest, "valid http or https image URL is required")
		return
	}
	request.Header.Set("User-Agent", "bluDM avatar preview")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not fetch image URL")
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		writeError(w, http.StatusBadRequest, "image URL did not return a successful response")
		return
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 5<<20+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not read image URL")
		return
	}
	if len(data) == 0 || len(data) > 5<<20 {
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
	_, _ = w.Write(data)
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
	_, _ = w.Write(data)
}
