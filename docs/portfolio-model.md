---
title: Portfolio Registry Model (SCK)
last_updated: 2025-09-12
status: draft
---

# Portfolio Registry Model

This document defines the canonical schema for an enterprise "portfolio" (software product/application) in SCK. It aligns PynamoDB table attributes and Pydantic API models used by core-db and core-api.

## Purpose

- Provide a single, tenant-scoped source of truth for application metadata
- Power the Catalog UI (browse, facets, detail tabs)
- Feed automation (deploy, compliance, ownership, dependencies)

## Field reference

Identity and presentation
- Portfolio (string, required, key) – unique id within client
- Name (string, optional) – human-readable title
- IconUrl (string, optional) – URL to square icon (SVG/PNG)
- Category (string, optional) – e.g., Platform, Customer, Internal
- Labels (list[string], optional) – free-form labels for faceting
- PortfolioVersion (string, optional) – semantic or internal version tag
- LifecycleStatus (string, optional) – Idea | Incubating | Active | Sunset

Ownership and contacts
- Owner (OwnerFacts) – general owner
- BusinessOwner (OwnerFacts) – business counterpart
- TechnicalOwner (OwnerFacts) – tech counterpart
- Contacts (list[ContactFacts]) – additional contacts
- Approvers (list[ApproverFacts]) – workflow approvers

Project context
- Project (ProjectFacts) – primary code/project
- Bizapp (ProjectFacts, optional) – alt business app
- Domain (string, optional)

Governance and compliance
- Tags (map[string,string], optional) – infra tags
- Metadata (map[string,string], optional)
- Attributes (map[string,string], optional)
- Compliance (map[string,string], optional) – SOX=Yes, PII=Low, etc.
- Identifiers (map[string,string], optional) – Jira, CMDB, CostCenter, etc.

Operations and integration
- Links (list[LinkFacts], optional) – e.g., Runbook, Dashboard, On-call
- Dependencies (list[string], optional) – other portfolio ids this depends on

## Data shapes

ContactFacts
- Name, Email?, Attributes?, Enabled=true

ApproverFacts
- Sequence=1, Name, Email?, Roles?, Attributes?, DependsOn?, Enabled=true

OwnerFacts
- Name, Email?, Phone?, Attributes?

ProjectFacts
- Name, Code, Repository?, Description?, Attributes?

LinkFacts
- Title, Url, Kind? (e.g., runbook, dashboard, docs), Attributes?

## API example (PascalCase)

{
  "portfolio": "web-services",
  "name": "Web Services",
  "iconUrl": "https://cdn.example.com/icons/web.svg",
  "category": "Platform",
  "labels": ["api", "core"],
  "portfolio_version": "1.4",
  "lifecycle_status": "Active",
  "owner": {"name": "Platform PM", "email": "pm@example.com"},
  "business_owner": {"name": "BU Dir", "email": "bu@example.com"},
  "technical_owner": {"name": "Tech Lead", "email": "lead@example.com"},
  "project": {"name": "Core API", "code": "core", "repository": "https://github.com/acme/core"},
  "domain": "api.acme.com",
  "tags": {"environment": "production", "team": "platform"},
  "compliance": {"SOX": "Yes", "PII": "Low"},
  "identifiers": {"Jira": "CAT-123", "CMDB": "CI-987"},
  "links": [
    {"title": "Runbook", "url": "https://runbooks/...", "kind": "runbook"},
    {"title": "Grafana", "url": "https://grafana/...", "kind": "dashboard"}
  ],
  "dependencies": ["auth-service", "billing"]
}

We have standardize all objects attributes as snake_case.

All api response, except oauth, will have objects wrapped in response class:

{ "status": "ok", "code": 200, "data": { object }, "metadata": {}, "links": {}, "message": ""}

"data" may be an object { object } or array of objects [{ object }]

GET list API support cursor symantics.  http://s/endpoint?limit=10,cursor=TOKEN.  "metadata" will include "cursor" token or None if no more data.

e.g. { "metadata": { "cursor": TOKEN }}

## Storage mapping

- PynamoDB table: <client>-core-automation-portfolios
- Hash key: Portfolio
- All complex objects stored via EnhancedMapAttribute/ListAttribute with PascalCase attr_name
- Pydantic model: PortfolioFact (aliases match PascalCase)

## Behavior notes

- Tenant switch clears and refetches portfolios for the newly selected client (see Auth/Session policy)
- Access token and session storage rules apply; no tokens are persisted in localStorage

## Roadmap

- Icon upload with presigned URLs
- Optional PortfolioKind union for service vs. batch vs. ui
- Derived fields for health/compliance computed by core-api
