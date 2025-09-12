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
  "Portfolio": "web-services",
  "Name": "Web Services",
  "IconUrl": "https://cdn.example.com/icons/web.svg",
  "Category": "Platform",
  "Labels": ["api", "core"],
  "PortfolioVersion": "1.4",
  "LifecycleStatus": "Active",
  "Owner": {"Name": "Platform PM", "Email": "pm@example.com"},
  "BusinessOwner": {"Name": "BU Dir", "Email": "bu@example.com"},
  "TechnicalOwner": {"Name": "Tech Lead", "Email": "lead@example.com"},
  "Project": {"Name": "Core API", "Code": "core", "Repository": "https://github.com/acme/core"},
  "Domain": "api.acme.com",
  "Tags": {"Environment": "production", "Team": "platform"},
  "Compliance": {"SOX": "Yes", "PII": "Low"},
  "Identifiers": {"Jira": "CAT-123", "CMDB": "CI-987"},
  "Links": [
    {"Title": "Runbook", "Url": "https://runbooks/...", "Kind": "runbook"},
    {"Title": "Grafana", "Url": "https://grafana/...", "Kind": "dashboard"}
  ],
  "Dependencies": ["auth-service", "billing"]
}

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
