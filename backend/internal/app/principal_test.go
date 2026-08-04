package app

import "testing"

func TestRequireEnforcesScopeAndCampaignRestriction(t *testing.T) {
	principal := Principal{
		UserID: "user", Scopes: []Scope{ScopeCampaignsRead, ScopeWorldRead},
		CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{"campaign-a"},
	}
	if err := Require(principal, "campaign-a", ScopeWorldRead); err != nil {
		t.Fatalf("expected allowed access, got %v", err)
	}
	assertDomainErrorCode(t, Require(principal, "campaign-b", ScopeWorldRead), CodeForbidden)
	assertDomainErrorCode(t, Require(principal, "campaign-a", ScopeWorldWrite), CodeForbidden)
}

func TestLegacyPrincipalCannotGainWriteScope(t *testing.T) {
	principal := Principal{
		UserID: "user", Scopes: LegacyReadScopes(), LegacyExternalCredentials: true,
		CampaignRestrictionMode: "legacy_all",
	}
	if err := Require(principal, "campaign-a", ScopeCampaignsRead); err != nil {
		t.Fatalf("expected legacy read access, got %v", err)
	}
	assertDomainErrorCode(t, Require(principal, "campaign-a", ScopeEncountersWrite), CodeForbidden)
}

func assertDomainErrorCode(t *testing.T, err error, code ErrorCode) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected %s error", code)
	}
	if info := ErrorInfo(err); info.Code != code {
		t.Fatalf("expected %s, got %+v", code, info)
	}
}
