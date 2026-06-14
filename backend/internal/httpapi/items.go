package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

type itemRequest struct {
	Name        string         `json:"name"`
	Category    string         `json:"category"`
	ItemType    string         `json:"itemType"`
	Rarity      string         `json:"rarity"`
	Attunement  bool           `json:"attunement"`
	ValueAmount int            `json:"valueAmount"`
	ValueUnit   string         `json:"valueUnit"`
	Weight      float64        `json:"weight"`
	Description string         `json:"description"`
	Properties  []string       `json:"properties"`
	Damage      map[string]any `json:"damage"`
	ArmorClass  map[string]any `json:"armorClass"`
	Data        map[string]any `json:"data"`
}

func (req *itemRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Category = strings.TrimSpace(req.Category)
	req.ItemType = strings.TrimSpace(req.ItemType)
	req.Rarity = strings.TrimSpace(req.Rarity)
	req.ValueUnit = strings.TrimSpace(strings.ToLower(req.ValueUnit))
	if req.ValueUnit == "" {
		req.ValueUnit = "gp"
	}
	req.Description = strings.TrimSpace(req.Description)
	req.Properties = normalizeStringList(req.Properties)
	if req.Damage == nil {
		req.Damage = map[string]any{}
	}
	if req.ArmorClass == nil {
		req.ArmorClass = map[string]any{}
	}
	if req.Data == nil {
		req.Data = map[string]any{}
	}
}

func (req itemRequest) validate() error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.ValueAmount < 0 {
		return errors.New("value amount cannot be negative")
	}
	if req.Weight < 0 {
		return errors.New("weight cannot be negative")
	}
	return nil
}

func (s *Server) listItems(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	includeUser := queryBool(r, "includeUser", true)
	includeStandard := queryBool(r, "includeStandard", true)
	sources := querySources(r)

	items := []models.Item{}
	if includeUser {
		userItems, err := s.stores.Items.List(r.Context(), user.ID, q, category)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		items = append(items, userItems...)
	}

	if includeStandard {
		rows, err := s.db.Query(r.Context(), `
			select standard_library_entries.id, standard_library_entries.source_key, standard_sources.label,
				standard_library_entries.name, standard_library_entries.summary,
				standard_library_entries.description, standard_library_entries.data,
				standard_library_entries.created_at, standard_library_entries.updated_at
			from standard_library_entries
			join standard_sources on standard_sources.source_key = standard_library_entries.source_key
			where standard_library_entries.category = 'equipment'
				and (cardinality($1::text[]) = 0 or standard_library_entries.source_key = any($1::text[]))
			order by standard_library_entries.name asc
			limit 1000
		`, sources)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list standard items")
			return
		}
		defer rows.Close()
		for rows.Next() {
			item, err := scanStandardItem(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read standard items")
				return
			}
			if (category == "" || item.Category == category) && itemMatchesQuery(item, q) {
				items = append(items, item)
			}
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read standard items")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func itemMatchesQuery(item models.Item, q string) bool {
	q = strings.ToLower(strings.TrimSpace(q))
	if q == "" {
		return true
	}
	haystack := strings.ToLower(strings.Join([]string{
		item.Name,
		item.Category,
		item.ItemType,
		item.Description,
		item.SourceKey,
		item.SourceLabel,
		strings.Join(item.Properties, " "),
		fmt.Sprint(item.Damage),
		fmt.Sprint(item.ArmorClass),
		fmt.Sprint(item.Data),
	}, " "))
	return strings.Contains(haystack, q)
}

func (s *Server) getItem(w http.ResponseWriter, r *http.Request) {
	itemID := strings.TrimSpace(r.PathValue("itemID"))
	librarySource := strings.TrimSpace(r.URL.Query().Get("librarySource"))
	if librarySource == "" {
		librarySource = "user"
	}
	item, err := s.itemByID(r.Context(), itemID, librarySource)
	if errors.Is(err, pgx.ErrNoRows) || store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load item")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) createItem(w http.ResponseWriter, r *http.Request) {
	userID := currentUserIDMust(r.Context())
	var req itemRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	item, err := s.stores.Items.Create(r.Context(), userID, itemInputFromRequest(req))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create item")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
}

func (s *Server) updateItem(w http.ResponseWriter, r *http.Request) {
	itemID := strings.TrimSpace(r.PathValue("itemID"))
	var req itemRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	item, err := s.stores.Items.Update(r.Context(), currentUserIDMust(r.Context()), itemID, itemInputFromRequest(req))
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update item")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) deleteItem(w http.ResponseWriter, r *http.Request) {
	if err := s.stores.Items.Delete(r.Context(), currentUserIDMust(r.Context()), strings.TrimSpace(r.PathValue("itemID"))); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete item")
			return
		}
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) cloneItem(w http.ResponseWriter, r *http.Request) {
	itemID := strings.TrimSpace(r.PathValue("itemID"))
	var req struct {
		LibrarySource string `json:"librarySource"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.LibrarySource == "" {
		req.LibrarySource = "standard"
	}
	source, err := s.itemByID(r.Context(), itemID, req.LibrarySource)
	if errors.Is(err, pgx.ErrNoRows) || store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load item")
		return
	}
	cloneReq := cloneItemRequest(source)
	item, err := s.stores.Items.Create(r.Context(), currentUserIDMust(r.Context()), itemInputFromRequest(cloneReq))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not clone item")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
}

func cloneItemRequest(source models.Item) itemRequest {
	cloneData := map[string]any{}
	for key, value := range source.Data {
		cloneData[key] = value
	}
	cloneData["clonedFrom"] = map[string]any{
		"id":            source.ID,
		"librarySource": source.LibrarySource,
		"sourceKey":     source.SourceKey,
		"name":          source.Name,
	}
	cloneData["sourceData"] = source.Data
	cloneReq := itemRequest{
		Name:        copyName(source.Name),
		Category:    source.Category,
		ItemType:    source.ItemType,
		Rarity:      source.Rarity,
		Attunement:  source.Attunement,
		ValueAmount: source.ValueAmount,
		ValueUnit:   source.ValueUnit,
		Weight:      source.Weight,
		Description: source.Description,
		Properties:  source.Properties,
		Damage:      source.Damage,
		ArmorClass:  source.ArmorClass,
		Data:        cloneData,
	}
	cloneReq.normalize()
	return cloneReq
}

func (s *Server) itemByID(ctx context.Context, itemID string, librarySource string) (models.Item, error) {
	if librarySource == "standard" {
		row := s.db.QueryRow(ctx, `
			select standard_library_entries.id, standard_library_entries.source_key, standard_sources.label,
				standard_library_entries.name, standard_library_entries.summary,
				standard_library_entries.description, standard_library_entries.data,
				standard_library_entries.created_at, standard_library_entries.updated_at
			from standard_library_entries
			join standard_sources on standard_sources.source_key = standard_library_entries.source_key
			where standard_library_entries.id = $1 and standard_library_entries.category = 'equipment'
		`, itemID)
		return scanStandardItem(row)
	}
	return s.stores.Items.ByID(ctx, currentUserIDMust(ctx), itemID)
}

func itemInputFromRequest(req itemRequest) store.ItemInput {
	return store.ItemInput{
		Name:        req.Name,
		Category:    req.Category,
		ItemType:    req.ItemType,
		Rarity:      req.Rarity,
		Attunement:  req.Attunement,
		ValueAmount: req.ValueAmount,
		ValueUnit:   req.ValueUnit,
		Weight:      req.Weight,
		Description: req.Description,
		Properties:  req.Properties,
		Damage:      req.Damage,
		ArmorClass:  req.ArmorClass,
		Data:        req.Data,
	}
}

func scanStandardItem(row scanner) (models.Item, error) {
	var item models.Item
	var summary string
	var dataBytes []byte
	err := row.Scan(
		&item.ID,
		&item.SourceKey,
		&item.SourceLabel,
		&item.Name,
		&summary,
		&item.Description,
		&dataBytes,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return models.Item{}, err
	}
	item.LibrarySource = "standard"
	item.ReadOnly = true
	item.Data, err = unmarshalJSONMap(dataBytes)
	if err != nil {
		return models.Item{}, err
	}
	normalizeStandardItem(&item, summary)
	return item, nil
}
