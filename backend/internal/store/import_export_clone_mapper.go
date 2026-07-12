package store

import (
	"fmt"
	"strings"
)

type cloneIDMapper struct {
	ids map[string]map[string]string
}

func newCloneIDMapper() cloneIDMapper {
	return cloneIDMapper{ids: map[string]map[string]string{}}
}

func (m cloneIDMapper) mapID(kind, oldID, newID string) {
	if strings.TrimSpace(oldID) == "" || strings.TrimSpace(newID) == "" {
		return
	}
	if m.ids[kind] == nil {
		m.ids[kind] = map[string]string{}
	}
	m.ids[kind][oldID] = newID
}

func (m cloneIDMapper) remap(kind, oldID string) string {
	if oldID == "" {
		return ""
	}
	if mapped := m.ids[kind][oldID]; mapped != "" {
		return mapped
	}
	return ""
}

func (m cloneIDMapper) requireRemap(kind, oldID string) (string, error) {
	if mapped := m.remap(kind, oldID); mapped != "" {
		return mapped, nil
	}
	return "", fmt.Errorf("missing imported %s dependency %s", kind, oldID)
}

func (m cloneIDMapper) remapPtr(kind string, value *string) *string {
	if value == nil || *value == "" {
		return nil
	}
	mapped := m.remap(kind, *value)
	if mapped == "" {
		return nil
	}
	return &mapped
}
