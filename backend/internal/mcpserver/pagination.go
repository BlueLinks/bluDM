package mcpserver

import (
	"encoding/base64"
	"strconv"
	"strings"

	appdomain "bludm/backend/internal/app"
)

type pageInfo struct {
	Limit      int    `json:"limit"`
	NextCursor string `json:"nextCursor,omitempty"`
}

func pageValues[T any](
	values []T,
	limit int,
	cursor string,
) ([]T, pageInfo, error) {
	start, end, page, err := pageBounds(len(values), limit, cursor)
	if err != nil {
		return nil, pageInfo{}, err
	}
	return values[start:end], page, nil
}

func pageBounds(
	length int,
	limit int,
	cursor string,
) (int, int, pageInfo, error) {
	if limit == 0 {
		limit = 50
	}
	if limit < 1 || limit > 100 {
		return 0, 0, pageInfo{}, appdomain.ValidationError(
			"invalid_limit", "limit must be between 1 and 100", nil,
		)
	}
	offset := 0
	if raw := strings.TrimSpace(cursor); raw != "" {
		decoded, err := base64.RawURLEncoding.DecodeString(raw)
		if err != nil {
			return 0, 0, pageInfo{}, appdomain.ValidationError(
				"invalid_cursor", "cursor is invalid", nil,
			)
		}
		offset, err = strconv.Atoi(string(decoded))
		if err != nil || offset < 0 || offset > length {
			return 0, 0, pageInfo{}, appdomain.ValidationError(
				"invalid_cursor", "cursor is invalid", nil,
			)
		}
	}
	end := min(length, offset+limit)
	page := pageInfo{Limit: limit}
	if end < length {
		page.NextCursor = base64.RawURLEncoding.EncodeToString(
			[]byte(strconv.Itoa(end)),
		)
	}
	return offset, end, page, nil
}
