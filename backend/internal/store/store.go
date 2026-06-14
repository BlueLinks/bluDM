package store

import (
	"errors"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type Stores struct {
	db        *gorm.DB
	Auth      AuthStore
	Assets    AssetStore
	Campaigns CampaignStore
	Creatures CreatureStore
	Players   PlayerStore
	Items     ItemStore
}

func New(db *gorm.DB) *Stores {
	stores := &Stores{db: db}
	stores.Auth = AuthStore{db: db}
	stores.Assets = AssetStore{db: db}
	stores.Campaigns = CampaignStore{db: db}
	stores.Creatures = CreatureStore{db: db}
	stores.Players = PlayerStore{db: db}
	stores.Items = ItemStore{db: db}
	return stores
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound) || errors.Is(err, gorm.ErrRecordNotFound)
}

func stringFromPointer(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
