# Marysoll Education Center — Public Routes and Edu Studio

**Status:** Planned architecture / product specification  
**Public product name:** **Edukativni centar**  
**Header navigation label:** **Edukacija**  
**Admin creator name:** **Edu Studio**  
**Implementation status:** Not scheduled in `TODO.md` yet

## Goal

Introduce a first-class education publishing surface for Marysoll tenants that have education capability.

The public experience should no longer present education primarily as a generic `blogs` area.

The new public routes are:

```text
/edukacija
/edukacija/[slug]
```

The Theme-9 header item **Edukacija** should eventually point to `/edukacija`.

## Important compatibility rule

Do **not** globally repurpose or delete existing `/blogs` and blog detail routes for every tenant.

Existing beauty tenants and older themes may still rely on blog behavior.

The migration should therefore be capability/theme-aware:

```text
tenant with education.catalog
  -> /edukacija
  -> /edukacija/[slug]

legacy / existing blog tenant
  -> existing blog routes remain valid
```

Where safe, legacy education links may redirect to the new route, but this must be a deliberate tenant-aware compatibility decision rather than a global route replacement.

---

## Phase 1 — Same content source, new public education surface

The first implementation may reuse the existing content/article storage and loader where that is safe.

The architectural change is initially the **domain surface and routing**, not necessarily a new storage model.

Target:

```text
existing article/content source
            |
            +-> existing blog presentation where still required
            |
            +-> Education Center presentation
                 /edukacija
                 /edukacija/[slug]
```

This allows Theme-9 to move from the current `Edukacija -> blogs` behavior to a domain-correct public route before the full Education authoring system exists.

## Rule

Reuse of an existing content source does not mean:

```text
Education = Blog
```

It is a transitional storage/loader reuse only.

The domain contract is Education.

---

## Phase 2 — Edu Studio

A separate admin authoring surface should be introduced for educational content.

Canonical UI name:

**Edu Studio**

This is shorter and clearer than "Edukativni centar kreator".

Suggested workspace placement:

```text
Sadržaj
  -> Edu Studio
```

or, when workspace IA is capability-aware:

```text
Ponuda / Sadržaj
  -> Edu Studio
```

The final placement should follow the capability-aware workspace IA rather than being hardcoded into one tenant theme.

---

## Edu Studio responsibilities

Edu Studio should support creation and management of educational content such as:

- educational articles;
- topic-based materials;
- structured learning content;
- downloadable resources;
- future e-books;
- future video/material attachments;
- links to Education Offerings;
- publish/unpublish lifecycle;
- preview;
- SEO metadata;
- optional distribution/email promotion.

### Reuse, do not duplicate infrastructure blindly

The Newsletter system is a useful UX and implementation reference, but Edu Studio should **not** copy Newsletter business logic wholesale.

Reuse shared primitives where appropriate:

```text
editor primitives
layout/page composition primitives
media picker
draft/publish controls
preview
email/distribution primitives
```

Keep domain logic separate:

```text
NewsletterCampaign != EducationContent
```

An educational article may later be distributed through email, but the educational content remains the source entity and the newsletter remains a distribution/campaign entity.

---

## Suggested future domain shape

The exact schema is deferred, but the direction should remain:

```text
EducationContent / EducationMaterial
        |
        +-> topic / category
        +-> author
        +-> body / blocks
        +-> status
        +-> SEO
        +-> attachments
        +-> related EducationOffering
        +-> optional distribution references
```

Do not introduce `Service.isEducation`.

---

## Theme-9 relationship

Theme-9 public blocks can link into the Education Center:

```text
topicHub
featuredEducation
LatestEducation
professionalPath
```

Examples:

```text
/edukacija/procena-koze
/edukacija/aktivni-sastojci
/edukacija/spf-i-fotoprotekcija
```

The current Theme-9 route usage under `/blogs/...` should be treated as transitional.

---

## Navigation contract

For tenants with resolved education capability:

```text
Header: Edukacija
  -> /edukacija
```

For tenants without education capability, the public header must not expose Education Center routes unless a separate product decision explicitly allows a marketing/preview page.

Route existence and nav visibility should eventually use the same capability/page-readiness resolver.

---

## TODO relationship

Do not add the full implementation checklist to `TODO.md` yet.

When this work becomes active, add a scoped slice that references this document and explicitly separates:

1. new public routes;
2. compatibility with existing blog routes;
3. Theme-9 nav migration;
4. Edu Studio authoring surface;
5. optional distribution/email integration.
