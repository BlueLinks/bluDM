package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

type JSONMap map[string]any

func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return []byte(`{}`), nil
	}
	return json.Marshal(map[string]any(m))
}

func (m *JSONMap) Scan(value any) error {
	if value == nil {
		*m = JSONMap{}
		return nil
	}
	bytes, err := jsonBytes(value)
	if err != nil {
		return err
	}
	if len(bytes) == 0 {
		*m = JSONMap{}
		return nil
	}
	var target map[string]any
	if err := json.Unmarshal(bytes, &target); err != nil {
		return err
	}
	*m = JSONMap(target)
	return nil
}

func (JSONMap) GormDataType() string {
	return "json"
}

func (JSONMap) GormDBDataType(db *gorm.DB, _ *schema.Field) string {
	if db.Dialector.Name() == "postgres" {
		return "jsonb"
	}
	return "json"
}

type JSONBytes []byte

func (b JSONBytes) Value() (driver.Value, error) {
	if len(b) == 0 {
		return []byte(`[]`), nil
	}
	return []byte(b), nil
}

func (b *JSONBytes) Scan(value any) error {
	bytes, err := jsonBytes(value)
	if err != nil {
		return err
	}
	*b = append((*b)[:0], bytes...)
	return nil
}

func (JSONBytes) GormDataType() string {
	return "json"
}

func (JSONBytes) GormDBDataType(db *gorm.DB, _ *schema.Field) string {
	if db.Dialector.Name() == "postgres" {
		return "jsonb"
	}
	return "json"
}

func jsonBytes(value any) ([]byte, error) {
	switch typed := value.(type) {
	case []byte:
		return typed, nil
	case string:
		return []byte(typed), nil
	default:
		return nil, fmt.Errorf("unsupported JSON value %T", value)
	}
}
