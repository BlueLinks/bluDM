package httpapi

import (
	"context"
	"errors"
	"strings"
	"sync"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"

	"github.com/coreos/go-oidc/v3/oidc"
)

type oidcResourceVerifier struct {
	enabled     bool
	issuer      string
	audience    string
	resourceURL string
	once        sync.Once
	verifier    *oidc.IDTokenVerifier
	err         error
}

type oidcResourceClaims struct {
	Subject         string   `json:"sub"`
	Scope           string   `json:"scope"`
	Scopes          []string `json:"scp"`
	Resource        string   `json:"resource"`
	CampaignMode    string   `json:"bludm_campaign_mode"`
	CampaignIDs     []string `json:"bludm_campaign_ids"`
	ClientID        string   `json:"client_id"`
	AuthorizedParty string   `json:"azp"`
}

func newOIDCResourceVerifier(
	enabled bool,
	issuer string,
	audience string,
	resourceURL string,
) *oidcResourceVerifier {
	return &oidcResourceVerifier{
		enabled: enabled, issuer: issuer, audience: audience, resourceURL: resourceURL,
	}
}

func (verifier *oidcResourceVerifier) initialize(ctx context.Context) {
	verifier.once.Do(func() {
		provider, err := oidc.NewProvider(ctx, verifier.issuer)
		if err != nil {
			verifier.err = err
			return
		}
		verifier.verifier = provider.Verifier(&oidc.Config{ClientID: verifier.audience})
	})
}

func (verifier *oidcResourceVerifier) verify(
	ctx context.Context,
	raw string,
) (oidcResourceClaims, error) {
	if !verifier.enabled {
		return oidcResourceClaims{}, errors.New("OIDC resource authentication is disabled")
	}
	verifier.initialize(ctx)
	if verifier.err != nil {
		return oidcResourceClaims{}, verifier.err
	}
	token, err := verifier.verifier.Verify(ctx, raw)
	if err != nil {
		return oidcResourceClaims{}, err
	}
	var claims oidcResourceClaims
	if err := token.Claims(&claims); err != nil {
		return claims, err
	}
	if claims.Subject == "" {
		return claims, errors.New("OIDC subject is missing")
	}
	if claims.Resource != verifier.resourceURL {
		return claims, errors.New("OIDC resource is invalid")
	}
	return claims, nil
}

func principalFromOIDCClaims(
	user models.User,
	claims oidcResourceClaims,
) (appdomain.Principal, error) {
	scopeValues := append([]string(nil), claims.Scopes...)
	scopeValues = append(scopeValues, strings.Fields(claims.Scope)...)
	scopes, err := appdomain.ParseScopes(scopeValues)
	if err != nil || len(scopes) == 0 {
		return appdomain.Principal{}, errors.New("OIDC token has no supported scopes")
	}
	mode := strings.TrimSpace(claims.CampaignMode)
	if mode == "" {
		mode = "all"
	}
	if mode != "all" && mode != "selected" {
		return appdomain.Principal{}, errors.New("OIDC campaign restriction is invalid")
	}
	if mode == "selected" && len(claims.CampaignIDs) == 0 {
		return appdomain.Principal{}, errors.New("OIDC selected campaign restriction is empty")
	}
	clientName := claims.ClientID
	if clientName == "" {
		clientName = claims.AuthorizedParty
	}
	return appdomain.Principal{
		UserID: user.ID, AuthenticationMethod: appdomain.AuthenticationOIDC,
		Scopes: scopes, CampaignRestrictionMode: mode,
		AllowedCampaignIDs: claims.CampaignIDs,
		Audit:              map[string]string{"clientName": clientName},
	}, nil
}
