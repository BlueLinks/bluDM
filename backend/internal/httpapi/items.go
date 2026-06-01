package httpapi

import (
	"bludm/backend/internal/models"
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
		rows, err := s.db.Query(r.Context(), `
			select id, name, category, item_type, rarity, attunement, value_amount, value_unit,
				weight, description, properties, damage, armor_class, data, created_at, updated_at
			from items
			where owner_user_id = $1
				and ($2 = '' or name ilike '%' || $2 || '%' or category ilike '%' || $2 || '%'
					or item_type ilike '%' || $2 || '%' or description ilike '%' || $2 || '%'
					or properties::text ilike '%' || $2 || '%'
					or damage::text ilike '%' || $2 || '%'
					or armor_class::text ilike '%' || $2 || '%'
					or data::text ilike '%' || $2 || '%')
				and ($3 = '' or category = $3)
			order by category asc, name asc
			limit 500
		`, user.ID, q, category)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		defer rows.Close()
		for rows.Next() {
			item, err := scanItem(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read items")
				return
			}
			items = append(items, item)
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read items")
			return
		}
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
	if errors.Is(err, pgx.ErrNoRows) {
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
	item, err := s.insertItem(r.Context(), userID, req)
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
	item, err := s.updateItemRecord(r.Context(), currentUserIDMust(r.Context()), itemID, req)
	if errors.Is(err, pgx.ErrNoRows) {
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
	tag, err := s.db.Exec(r.Context(), `
		delete from items where id = $1 and owner_user_id = $2
	`, strings.TrimSpace(r.PathValue("itemID")), currentUserIDMust(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete item")
		return
	}
	if tag.RowsAffected() == 0 {
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
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load item")
		return
	}
	cloneReq := cloneItemRequest(source)
	item, err := s.insertItem(r.Context(), currentUserIDMust(r.Context()), cloneReq)
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
	row := s.db.QueryRow(ctx, `
		select id, name, category, item_type, rarity, attunement, value_amount, value_unit,
			weight, description, properties, damage, armor_class, data, created_at, updated_at
		from items
		where id = $1 and owner_user_id = $2
	`, itemID, currentUserIDMust(ctx))
	return scanItem(row)
}

func (s *Server) insertItem(ctx context.Context, userID string, req itemRequest) (models.Item, error) {
	damage, err := marshalJSONMap(req.Damage)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal damage: %w", err)
	}
	armorClass, err := marshalJSONMap(req.ArmorClass)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal armor class: %w", err)
	}
	data, err := marshalJSONMap(req.Data)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal data: %w", err)
	}
	row := s.db.QueryRow(ctx, `
		insert into items (
			owner_user_id, name, category, item_type, rarity, attunement, value_amount,
			value_unit, weight, description, properties, damage, armor_class, data
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		returning id, name, category, item_type, rarity, attunement, value_amount, value_unit,
			weight, description, properties, damage, armor_class, data, created_at, updated_at
	`, userID, req.Name, req.Category, req.ItemType, req.Rarity, req.Attunement, req.ValueAmount,
		req.ValueUnit, req.Weight, req.Description, req.Properties, damage, armorClass, data)
	return scanItem(row)
}

func (s *Server) updateItemRecord(ctx context.Context, userID string, itemID string, req itemRequest) (models.Item, error) {
	damage, err := marshalJSONMap(req.Damage)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal damage: %w", err)
	}
	armorClass, err := marshalJSONMap(req.ArmorClass)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal armor class: %w", err)
	}
	data, err := marshalJSONMap(req.Data)
	if err != nil {
		return models.Item{}, fmt.Errorf("marshal data: %w", err)
	}
	row := s.db.QueryRow(ctx, `
		update items
		set name = $3, category = $4, item_type = $5, rarity = $6, attunement = $7,
			value_amount = $8, value_unit = $9, weight = $10, description = $11,
			properties = $12, damage = $13, armor_class = $14, data = $15, updated_at = now()
		where id = $1 and owner_user_id = $2
		returning id, name, category, item_type, rarity, attunement, value_amount, value_unit,
			weight, description, properties, damage, armor_class, data, created_at, updated_at
	`, itemID, userID, req.Name, req.Category, req.ItemType, req.Rarity, req.Attunement,
		req.ValueAmount, req.ValueUnit, req.Weight, req.Description, req.Properties, damage, armorClass, data)
	return scanItem(row)
}

func scanItem(row scanner) (models.Item, error) {
	var item models.Item
	var damageBytes []byte
	var armorClassBytes []byte
	var dataBytes []byte
	err := row.Scan(
		&item.ID,
		&item.Name,
		&item.Category,
		&item.ItemType,
		&item.Rarity,
		&item.Attunement,
		&item.ValueAmount,
		&item.ValueUnit,
		&item.Weight,
		&item.Description,
		&item.Properties,
		&damageBytes,
		&armorClassBytes,
		&dataBytes,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return models.Item{}, err
	}
	item.LibrarySource = "user"
	item.Damage, err = unmarshalJSONMap(damageBytes)
	if err != nil {
		return models.Item{}, err
	}
	item.ArmorClass, err = unmarshalJSONMap(armorClassBytes)
	if err != nil {
		return models.Item{}, err
	}
	item.Data, err = unmarshalJSONMap(dataBytes)
	if err != nil {
		return models.Item{}, err
	}
	return item, nil
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
