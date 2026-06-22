# Uganda Unified Border Management — Database Reference

**Database:** `Uganda_Visa_Applications`
**Version:** 2.1 — June 2026
**Classification:** Confidential / In Commercial Confidence

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Section 1 — Reference / Lookup Tables](#section-1--reference--lookup-tables)
4. [Section 2 — User Identity & Person Data](#section-2--user-identity--person-data)
5. [Section 3 — Family Management Tables](#section-3--family-management-tables)
6. [Section 4 — Group Management Tables](#section-4--group-management-tables)
7. [Section 5 — Application Master Tables](#section-5--application-master-tables)
8. [Section 6 — Application Person Data](#section-6--application-person-data)
9. [Section 7 — Officer Processing Tables](#section-7--officer-processing-tables)
10. [Section 8 — Workflow & Permit Tables](#section-8--workflow--permit-tables)
11. [Section 9 — Operational & System Tables](#section-9--operational--system-tables)
12. [Section 10 — Stored Procedures](#section-10--stored-procedures)
13. [Section 11 — Views](#section-11--views)
14. [Changelog](#changelog)

---

## Overview

This document describes the full database schema for the Uganda Unified Border Management Client Portal. It covers all tables, their purpose, their relationships, and all stored procedures and views. It is the primary reference for ERD creation and developer onboarding.

The database supports the following end-to-end workflow:

```
Portal Registration
      ↓
Complete Personal Profile (tblPersonalProfileDetails)
      ↓
Manage Family Unit (pre-application)          Manage Groups (pre-application)
      ↓                                               ↓
Start New Application → Select Type / Category / Subcategory
      ↓
Include Family / Group Members
      ↓
Upload Documents per Applicant
      ↓
Submit Application
      ↓
Officer Processing Queue → Checklist Review → Recommendation → Approval Decision
```

---

## Architecture Summary

`tblPersonalProfileDetails` is the central person record for the entire system. Every person — whether a portal user, family member, or group member — has exactly one record here. Portal users are linked via `tblSecUserMap.fldSecUserId` (nullable — non-portal persons have no portal account).

There are **three paths** through which a person reaches `tblVisaApplicationSubmitted`:

```
tblSecUserMap
      │ fldSecUserId (nullable)
      ▼
tblPersonalProfileDetails  ◄─── Single person record for entire system
      │              │                    │
      │ fldUserId    │ fldUserId           │ fldUserId
      ▼              ▼                    ▼
tblGroupMembers  tblFamilyMembers    (principal — direct via tblSecUserMap)
      │ fldGroupID   │ fldFamilyID
      ▼              ▼
  tblGroups      tblFamilies
      │              │
      │ fldGroupID   │ fldFamilyGroupID
      └──────┬────────┘
             ▼
  tblVisaApplicationSubmitted  ◄── also FK to tblSecUserMap (fldUserId)
             │
             ├── tblApplicantPersonData (snapshot of personal data + travel fields)
             ├── tblPrincipleDocuments  (principal applicant's documents per application)
             ├── tblApplicantBackgroundResponses  (background declaration answers)
             ├── tblApplicationChecklistReview    (officer checklist results per section)
             ├── tblApplicationOfficerComments    (officer notes per stage/section)
             ├── tblApplicationRecommendation     (processing officer recommendation)
             ├── tblApplicationOfficerDocuments   (documents uploaded by officers)
             ├── tblApplicationApprovalDecision   (approving officer final decision)
             └── tblApplicationAdditionalDocRequests (officer requests for extra docs)
```

**Key design principles:**
- `tblFamilyMembers` and `tblGroupMembers` are **lean junction tables** — personal data lives entirely in `tblPersonalProfileDetails`, not in the junction tables themselves.
- There are **no application-layer snapshot copies** of family or group member data. The pre-application tables are used directly.
- `tblApplicantPersonData` is the only snapshot table — it freezes the principal's personal and travel data at application time.
- Family and group chains are **fully independent** — group members have no FK relationship to `tblFamilyMembers`.
- All officer processing tables (checklist, comments, recommendation, decision) FK to both `tblVisaApplicationSubmitted` and `tblApplicantPersonData` — a `NULL` `fldApplicantPersonDataID` indicates an application-level record rather than applicant-specific.

### Table Inventory by Category

| Category | Tables |
|---|---|
| Lookup / Reference | tblSettings, tblApplicationTypes, tblApplicationCategories, tblApplicationSubcategories, tblSubcategoryMandatoryDocuments, tblPermitDocumentRequirement, tblDocumentTypes, tblNationalities, tblPassportTypes, tblGenders, tblMaritalStatuses, tblGuardianRelationships, tblGroupMemberTypes, tblGroupTypes, tblPurposesOfVisit, tblPointsOfEntry, tblImmigrationStatuses, tblReasons, tblDepartments, **tblBackgroundQuestions** |
| Person & Identity | tblSecUserMap, tblPersonalProfileDetails, tblGuardian |
| Family Management | tblFamilies, tblFamilyMembers, tblFamilyMemberDocuments |
| Group Management | tblGroups, tblGroupMembers, tblGroupDocuments, tblGroupMemberDocuments |
| Application Master | tblVisaApplicationSubmitted, tblVisaApplicationApprovalHistory, tblSupervisorNotifications |
| Application Person Data | tblApplicantPersonData, tblPrincipleDocuments |
| **Officer Processing** | **tblApplicantBackgroundResponses, tblApplicationChecklistReview, tblApplicationOfficerComments, tblApplicationRecommendation, tblApplicationOfficerDocuments, tblApplicationApprovalDecision, tblApplicationAdditionalDocRequests** |
| Workflow & Permits | tblApplicationWorkflowType, tblApplicationWorkflowRequest |
| Operational | tblAuditLog, tblErrorLog, tblApplicationID |
| Future Modules | tblBanks, tblCompanyTypes, tblPersonTypes, tblCitizenshipTypes, tblBiometricCaptureFailReasons, tblEyeColors, tblHairColors, tblSkinColors, tblIndigenousCommunities, tblModesOfTravel, tblMonthlyIncomeRanges, tblNonProfitCompanyTypes, tblOperators, tblProfessions, tblRemovalTypes, tblSchoolTypes, tblSourceAuthorities, tblRareSkills, tblSpecificMinerals, tblOtherMinerals, tblAgroProductTypes, tblCurrencies, tblPaymentModes, tblVisaExemptReasons, tblVisaIssuingAuthorities, tblStatusTypes, tblTempTravelDocTypes |

---

## Section 1 — Reference / Lookup Tables

These tables contain static configuration data. They populate dropdowns, drive validation rules, and define the allowed values for fields across the system.

---

### tblSettings

**Purpose:** System-wide configurable parameters that drive business rules across the application. Values are read by stored procedures at runtime rather than being hardcoded.

| Field | Description |
|---|---|
| fldKey | Unique parameter name (e.g. `AdultAge`) |
| fldValue | Parameter value stored as string — cast on read |
| fldDataType | Data type hint: INT, DECIMAL, VARCHAR, EMAIL, BOOL |
| fldDescription | Human-readable explanation of the setting |
| fldUpdatedAt | Last modified timestamp |
| fldUpdatedBy | Who last changed the value |

**Relationships:** Standalone — no FK relationships.

**Seeded values:**

| Key | Value | Purpose |
|---|---|---|
| AdultAge | 18 | Minimum age to be considered an adult applicant |
| RegistrationLinkValidMins | 15 | Minutes a registration link remains valid |
| PassportExpiryBufferMonths | 6 | Minimum months of passport validity required |
| MaxDeferCount | 3 | Defer threshold before supervisor notification |
| DeferSupervisorEmail | supervisor@immigration.go.ug | Supervisor alert recipient |

---

### tblApplicationTypes

**Purpose:** Master list of immigration application types available on the portal.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Short code (e.g. `VISA`, `EP`, `SP`) |
| fldIsActive | Controls visibility in dropdowns |
| fldSortOrder | Display order |
| fldCreatedAt | Creation timestamp |

**Relationships:** One type → many categories (`tblApplicationCategories`)

**Seeded values:** Visa, Entry Permit, Student Pass, Special Pass, Dependent Pass, Intern/Research Pass, Certificate of Residence, Citizenship

---

### tblApplicationCategories

**Purpose:** Categories within each application type. Filtered by the selected type in the UI.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationTypeID | FK → tblApplicationTypes |
| fldName | Display name |
| fldCode | Short code |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |
| fldCreatedAt | Creation timestamp |

**Relationships:**
- FK to `tblApplicationTypes` via `fldApplicationTypeID`
- One category → many subcategories (`tblApplicationSubcategories`)

**Example values (Visa):** Ordinary/Tourist Visa, East African Tourist Visa, Transit, Multiple Entry, Diplomatic or Official

---

### tblApplicationSubcategories

**Purpose:** Subcategories within each category. Holds price per person and links to mandatory documents.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationCategoryID | FK → tblApplicationCategories |
| fldName | Display name |
| fldCode | Short code |
| fldPricePerPerson | Cost in fldCurrency |
| fldCurrency | Currency code (default USD) |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |
| fldCreatedAt | Creation timestamp |

**Relationships:**
- FK to `tblApplicationCategories` via `fldApplicationCategoryID`
- One subcategory → many mandatory documents (`tblSubcategoryMandatoryDocuments`)
- One subcategory → many permit document requirements (`tblPermitDocumentRequirement`)

---

### tblSubcategoryMandatoryDocuments

**Purpose:** Junction table defining which document types are mandatory for each visa subcategory. Drives the mandatory documents display list in the application start screen.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationSubcategoryID | FK → tblApplicationSubcategories |
| fldDocumentTypeID | FK → tblDocumentTypes |

**Relationships:** Many-to-many resolver between `tblApplicationSubcategories` and `tblDocumentTypes`

> **Note:** This table serves visa-type applications. For permit-type applications with richer document requirement metadata, see `tblPermitDocumentRequirement`.

---

### tblPermitDocumentRequirement

**Purpose:** Enhanced junction table defining document requirements per subcategory for permit-type applications. Extends the simple `tblSubcategoryMandatoryDocuments` pattern with mandatory/confirmation flags and notes.

| Field | Description |
|---|---|
| fldPermitDocumentRequirementId | Primary key |
| fldApplicationSubcategoryId | FK → tblApplicationSubcategories |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldIsMandatory | Whether the document is required (default 1) |
| fldRequiresConfirmation | Whether an officer must confirm receipt (default 0) |
| fldNotes | Additional guidance notes (nullable) |

**Unique constraint:** `(fldApplicationSubcategoryId, fldDocumentTypeId)` — one rule per subcategory/document pair.

**Relationships:**
- FK to `tblApplicationSubcategories` via `fldApplicationSubcategoryId`
- FK to `tblDocumentTypes` via `fldDocumentTypeId`

---

### tblDocumentTypes

**Purpose:** Master list of all document types used across the system — uploads, mandatory document lists, and dropdowns.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Short code (e.g. `FLIGHT`, `PHOTO`) |
| fldDescription | Optional description |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |

**Relationships:** Referenced by `tblSubcategoryMandatoryDocuments`, `tblPermitDocumentRequirement`, `tblFamilyMemberDocuments`, `tblGroupMemberDocuments`, `tblGroupDocuments`, `tblPrincipleDocuments`, `tblApplicationOfficerDocuments`, `tblApplicationAdditionalDocRequests`

**Example values:** Passport, Bank Statement, Hotel Booking, Return Flight Ticket, Profile Photo, Yellow Fever Certificate

---

### tblNationalities

**Purpose:** Full country list with visa exemption and EAC membership indicators.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldCountryName | Full country name |
| fldISO2 | ISO 3166-1 alpha-2 code |
| fldISO3 | ISO 3166-1 alpha-3 code |
| fldDialCode | International dial code (e.g. +256) |
| fldIsVisaExempt | 1 = no visa required for Uganda entry |
| fldIsEAC | 1 = East African Community member |
| fldIsActive | Controls visibility |

**Relationships:** Referenced by `tblPersonalProfileDetails` (fldNationalityID, fldCountryOfResidenceID) and `tblApplicantPersonData` (fldNationalityID, fldCountryOfResidenceID, fldOtherNationalityID)

---

### tblPassportTypes

**Purpose:** Valid passport type values.

**Relationships:** Referenced by `tblPersonalProfileDetails`, `tblApplicantPersonData`

**Values:** Ordinary, Diplomatic, Official/Service, ID Card, Other

---

### tblGenders

**Purpose:** Valid gender values.

**Relationships:** Referenced by `tblPersonalProfileDetails`, `tblApplicantPersonData`

**Values:** Male (M), Female (F)

---

### tblMaritalStatuses

**Purpose:** Valid marital status values.

**Relationships:** Referenced by `tblPersonalProfileDetails`, `tblApplicantPersonData`

**Values:** Single, Married, Divorced, Widowed, Separated, Other

---

### tblGuardianRelationships

**Purpose:** Valid legal guardian relationship types — used when establishing a guardian link for a minor in `tblGuardian`.

**Relationships:** Referenced by `tblGuardian` via `fldGuardianTypeId`

**Values:** Parent, Court Appointed Guardian, Testamentary Guardian, Foster Parent

---

### tblGroupMemberTypes

**Purpose:** Defines the role a member plays within a group.

**Relationships:** Referenced by `tblGroupMembers` via `fldMemberTypeID`

**Values:** Principal, Responsible, Group Member

---

### tblGroupTypes

**Purpose:** Valid group type values — used to classify the nature of a group (e.g. Tour, Corporate, School).

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Unique short code |
| fldIsActive | Controls visibility (default 1) |
| fldSortOrder | Display order (default 0) |

**Unique constraint:** `fldCode`

**Relationships:** Referenced by `tblGroups` via `fldGroupTypeID`

---

### tblPurposesOfVisit

**Purpose:** Valid purpose of visit values for the travel data section of an application.

**Relationships:** Referenced by `tblApplicantPersonData` via `fldPurposeOfVisitID`

**Values:** Tourism, Medical, Family Visit (Foreign National), Returning Resident, Family Visit (Former Ugandan), Returning Citizen, Transit, Conference, Other

---

### tblPointsOfEntry

**Purpose:** Valid Uganda entry points — airports, land borders, and water ports.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Entry point name |
| fldType | Airport, Land, or Water |
| fldRegion | Geographic region within Uganda |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |

**Relationships:** Referenced by `tblApplicantPersonData` via `fldPointOfEntryID`

**Example values:** Entebbe International Airport, Malaba Border Post, Katuna Border Post, Port Bell

---

### tblImmigrationStatuses

**Purpose:** Immigration status of the applicant in their country of residence.

**Relationships:** Referenced by `tblPersonalProfileDetails`, `tblApplicantPersonData`

**Values:** Citizen, Student, Tourist, Work, Other

---

### tblReasons

**Purpose:** Unified reasons table covering all reason dropdowns across the system. A single `fldReasonType` discriminator identifies which list each row belongs to.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldReasonType | Discriminator — see full list below |
| fldName | Display name |
| fldCode | Short code |
| fldIsActive | Controls visibility (default 1) |
| fldSortOrder | Display order (default 0) |

**Unique constraint:** `(fldReasonType, fldCode)`

**Full list of fldReasonType values:**

| ReasonType | Used by |
|---|---|
| FamilyRemoval | tblFamilyMembers |
| LeaveFamily | tblFamilyMembers |
| RemovalFromFamily | tblFamilyMembers |
| LeaveGroup | tblGroupMembers |
| RemovalFromGroup | tblGroupMembers |
| RemovalFromApplication | tblVisaApplicationSubmitted |
| Cancellation | tblVisaApplicationSubmitted |
| CancellationByUser | tblVisaApplicationSubmitted |
| Defer | tblVisaApplicationSubmitted |
| Referral | tblVisaApplicationSubmitted |
| ApplicantRemoval | tblVisaApplicationSubmitted |
| Rejection | tblVisaApplicationApprovalHistory |
| Internship | Permit workflow |
| Research | Permit workflow |
| SpecialPass | Permit workflow |
| Deprivation | Permit workflow |
| NationalityLost | Permit workflow |
| RejectCitizenship | Permit workflow |
| ToSecondary | Permit workflow |

**Relationships:** Referenced by `tblVisaApplicationSubmitted` (×3), `tblVisaApplicationApprovalHistory`, `tblFamilyMembers`, `tblGroupMembers`, `tblGroups`

---

### tblDepartments

**Purpose:** Immigration departments — used when an application is referred to a specific department.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Department name |
| fldCode | Short code |
| fldManagerName | Department manager |
| fldEmail | Contact email |
| fldIsActive | Controls visibility |
| fldCreatedAt | Creation timestamp |

**Relationships:** Referenced by `tblVisaApplicationSubmitted` via `fldReferDepartmentID` and `tblVisaApplicationApprovalHistory` via `fldDepartmentID`

---

### tblBackgroundQuestions *(added 2026-06-11)*

**Purpose:** Lookup table defining each background declaration question and its conditional sub-field requirements. The `fldHas*` flags drive which detail fields are required when `fldAnswer = 1` (Yes) in `tblApplicantBackgroundResponses`.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldCode | Unique short code — used by stored procedures (e.g. `VISA_DENIED`) |
| fldQuestionText | Full question text — nvarchar(300) |
| fldHasCountry | 1 = Country sub-field required on Yes answer |
| fldHasDate | 1 = Date sub-field required on Yes answer |
| fldHasReason | 1 = Reason sub-field required on Yes answer |
| fldHasDoctorName | 1 = Doctor name sub-field required on Yes answer |
| fldHasDiagnosis | 1 = Diagnosis sub-field required on Yes answer |
| fldSortOrder | Display order |
| fldIsActive | 0 = question retired (excluded from views and SPs) |
| fldCreatedAt | Creation timestamp |

**Unique constraint:** `fldCode`

**Seeded values:**

| Code | Question | Country | Date | Reason | DoctorName | Diagnosis |
|---|---|---|---|---|---|---|
| VISA_DENIED | Have you been denied a visa before? | ✓ | ✓ | ✓ | — | — |
| DEPORTED | Have you been deported before? | ✓ | ✓ | ✓ | — | — |
| CONVICTED | Have you been convicted in any country? | ✓ | ✓ | ✓ | — | — |
| CRIMINAL_PROCEEDINGS | Are there any criminal proceedings against you? | ✓ | — | ✓ | — | — |
| MENTAL_ILLNESS | Are you suffering from any mental illness? | — | ✓ | — | ✓ | ✓ |

**Relationships:** Referenced by `tblApplicantBackgroundResponses` via `fldQuestionID`; used by `vw_ApplicantBackgroundResponses`, `sp_SaveBackgroundResponse`, `sp_GetBackgroundResponse`

---

---

## Section 2 — User Identity & Person Data

These tables manage portal user identity and the central person record that anchors all personal data across the system.

---

### tblSecUserMap

**Purpose:** Permanent identity bridge between the Uganda Portal user account and the `Uganda_Visa_Applications` database. Provides a stable integer PK (`fldID`) used as FK by most tables, plus a GUID (`fldUserKey`) used by tables that were set up with GUID-based identity.

| Field | Description |
|---|---|
| fldID | Primary key (int) — used as FK by most tables in this database |
| fldUUID | Unique nvarchar(50) — alternate identifier (nullable) |
| fldUserKey | Unique UNIQUEIDENTIFIER — used as FK by tblGroups.fldOwnerKey |
| fldPortalSecUserId | Unique int (nullable) — links to Uganda_Portal.dbo.SecUsers |
| fldDisplayName | Snapshot of user's display name |
| fldCreatedAt | When the map entry was first created |
| fldLastSeenAt | Last activity timestamp |
| fldLastUpdatedAt | Last profile update timestamp |

> **FK usage:** Most tables use `fldID` (int) as their FK to this table. `tblGroups.fldOwnerKey` is the exception — it uses `fldUserKey` (uniqueidentifier). Always check which identifier a table's FK column references.

**Relationships:**
- Links to `Uganda_Portal.dbo.SecUsers` via `fldPortalSecUserId`
- Referenced by `tblPersonalProfileDetails` via `fldSecUserId`
- Referenced by `tblVisaApplicationSubmitted` via `fldUserId`
- Referenced by `tblGroups` via `fldOwnerKey` (GUID)

---

### tblPersonalProfileDetails

**Purpose:** Central person record for the entire system. Every person — portal users, manually added family members, and group members — has one record here. Portal users have `fldSecUserId` populated; non-portal persons (manually added members) have `fldSecUserId = NULL`.

This table stores complete personal, passport, contact, and profile photo data.

| Field | Description |
|---|---|
| fldID | Primary key (int) — used as FK across family, group, and application tables |
| fldSecUserId | FK → tblSecUserMap.fldID (nullable — non-portal persons have no portal account) |
| fldFirstName | First name (nullable during registration completion) |
| fldMiddleName | Middle name (nullable) |
| fldSurname | Surname (nullable during registration completion) |
| fldDOB | Date of birth (nullable) — check: must be < today |
| fldGenderID | FK → tblGenders (nullable) |
| fldNationalityID | FK → tblNationalities (nullable) |
| fldCountryOfBirth | Free text varchar(100) — not a FK |
| fldPlaceOfBirth | Free text varchar(200) (nullable) |
| fldMaritalStatusID | FK → tblMaritalStatuses (nullable) |
| fldPassportTypeID | FK → tblPassportTypes (nullable) |
| fldPassportNumber | Unique across entire system (uq_PassportNumber) |
| fldPassportIssuingCountry | Passport issuing country varchar(100) (nullable) |
| fldPassportIssuingLocation | Passport issuing office varchar(200) (nullable) |
| fldPassportDateOfIssue | Date passport was issued — check: < fldPassportExpDate |
| fldPassportExpDate | Passport expiry date |
| fldPassportBase64 | Raw base64 passport image (nullable) |
| fldPassportFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldPassportBase64Converted | Computed PERSISTED — full data URI for rendering |
| fldPassportExpired | Computed — 1 if PassportExpDate < today |
| fldPassportExpiringSoon | Computed — 1 if PassportExpDate < today + 6 months |
| fldProfileBase64 | Raw base64 profile photo (nullable) |
| fldProfileFileExt | Profile photo file extension (nullable) |
| fldProfileBase64Converted | Computed PERSISTED — full data URI for profile photo |
| fldCurrentResidentialAdd | Home address varchar(400) (nullable) |
| fldCityOfResidence | City varchar(200) (nullable) |
| fldCountryOfResidenceID | FK → tblNationalities (nullable) |
| fldImmigrationStatusID | FK → tblImmigrationStatuses (nullable) |
| fldCountryPhoneCode | Dial code — check: must start with '+' (nullable) |
| fldPhoneNumber | Phone number varchar(15) (nullable) |
| fldFullPhoneNumber | Computed PERSISTED — concatenated phone |
| fldEmail | Email varchar(200) (nullable) |
| fldPrincipalInfoCaptured | bit — 0 = profile incomplete, 1 = all required data entered (default 0) |
| fldIsMinor | Computed — 1 if age < 18 based on fldDOB |
| fldCreatedAt | Creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Unique constraint:** `fldPassportNumber` — a passport number identifies one person across the entire system.

**Relationships:**
- FK to `tblSecUserMap` via `fldSecUserId` (nullable)
- FK to `tblGenders`, `tblNationalities` (×2), `tblMaritalStatuses`, `tblPassportTypes`, `tblImmigrationStatuses`
- Referenced by `tblFamilies` via `fldUserId` — family owner
- Referenced by `tblFamilyMembers` via `fldUserId` — family member person record
- Referenced by `tblGroups` via `fldPersonId` — group owner's person record
- Referenced by `tblGroupMembers` via `fldUserId` — group member person record
- Referenced by `tblApplicantPersonData` via `fldUserId`
- Referenced by `tblGuardian` via `fldUserId` and `fldGuardianId`
- Referenced by `tblGroupDocuments` via `fldUploadedBy`

---

### tblGuardian

**Purpose:** Junction table establishing a legal guardian relationship between a minor and their guardian. Both the minor and the guardian are `tblPersonalProfileDetails` records.

| Field | Description |
|---|---|
| fldId | Primary key |
| fldUserId | FK → tblPersonalProfileDetails.fldID — the minor |
| fldGuardianId | FK → tblPersonalProfileDetails.fldID — the guardian |
| fldGuardianTypeId | FK → tblGuardianRelationships — nature of relationship |
| fldIsActive | Whether the guardian relationship is current (default 1) |

**Relationships:**
- FK to `tblPersonalProfileDetails` via `fldUserId` (minor)
- FK to `tblPersonalProfileDetails` via `fldGuardianId` (guardian)
- FK to `tblGuardianRelationships` via `fldGuardianTypeId`

---

---

## Section 3 — Family Management Tables

These tables allow the principal to build and manage their family unit before starting any application.

> **Design note:** `tblFamilies` and `tblFamilyMembers` are **lean junction tables**. No personal data is stored in them — all personal and passport data lives in `tblPersonalProfileDetails`. To get a family member's details, always JOIN to `tblPersonalProfileDetails` via `fldUserId`.

---

### tblFamilies

**Purpose:** A family unit owned by the principal. One family per principal person.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldUserId | FK → tblPersonalProfileDetails.fldID — the principal who owns the family |
| fldIsActive | Soft delete flag (default 1) |
| fldCreatedAt | Creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Relationships:**
- FK to `tblPersonalProfileDetails` via `fldUserId`
- One family → many members (`tblFamilyMembers`)
- Referenced by `tblVisaApplicationSubmitted` via `fldFamilyGroupID`

---

### tblFamilyMembers

**Purpose:** Junction table linking a person to a family. The member's personal data lives in `tblPersonalProfileDetails` — this table holds only membership status and relationship information.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldFamilyID | FK → tblFamilies |
| fldUserId | FK → tblPersonalProfileDetails.fldID — the member's person record |
| fldRelationship | Free text nvarchar(50) — e.g. Spouse, Child, Sibling (nullable, not a FK) |
| fldStatus | 'Active', 'Removed', or 'Left' (default 'Active') |
| fldRemovalReasonID | FK → tblReasons (nullable) |
| fldRemovalComment | nvarchar(500) (nullable) |
| fldRemovedAt | Removal timestamp (nullable) |
| fldCreatedAt | Creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Relationships:**
- FK to `tblFamilies` via `fldFamilyID`
- FK to `tblPersonalProfileDetails` via `fldUserId`
- FK to `tblReasons` via `fldRemovalReasonID`
- One member → many documents (`tblFamilyMemberDocuments`)

---

### tblFamilyMemberDocuments

**Purpose:** Documents uploaded against a specific family member, independent of any application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldFamilyMemberID | FK → tblFamilyMembers |
| fldDocumentID | Soft reference to source document requirement (NOT NULL, no FK enforced) |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other (nullable) |
| fldFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldBase64 | Raw base64 document content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Upload timestamp (default sysutcdatetime()) |

**Relationships:**
- FK to `tblFamilyMembers` via `fldFamilyMemberID`
- FK to `tblDocumentTypes` via `fldDocumentTypeId`

---

---

## Section 4 — Group Management Tables

These tables allow the principal to create and manage named groups before starting any application. One principal can own multiple groups.

> **Design note:** `tblGroupMembers` is a **lean junction table** — no personal data is stored here. All personal and passport data lives in `tblPersonalProfileDetails`. To get a group member's details, always JOIN to `tblPersonalProfileDetails` via `fldUserId`.

> **Family vs Group distinction:** Family members have a personal relationship with the principal (spouse, child, dependant). Group members are independent persons in a named group (tour travellers, corporate delegates, sports teams, school trips) with no required family relationship to the principal.

---

### tblGroups

**Purpose:** A named group created and owned by the principal. Holds group type, contact details, and deactivation tracking.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldOwnerKey | FK → tblSecUserMap.fldUserKey (GUID) — portal user who created the group |
| fldPersonId | FK → tblPersonalProfileDetails.fldID — principal's person record |
| fldGroupName | Display name of the group |
| fldGroupType | Free text group type varchar(50) |
| fldGroupTypeID | FK → tblGroupTypes (nullable) — structured group type |
| fldContactFirstName | Contact person first name |
| fldContactSurname | Contact person surname |
| fldContactPhoneCode | Dial code — check: must start with '+' |
| fldContactPhoneNumber | Contact phone number |
| fldContactFullPhone | Computed PERSISTED — concatenated phone |
| fldIsActive | Whether the group is active (default 1) |
| fldDeactivationReasonID | FK → tblReasons (nullable) |
| fldDeactivationComment | nvarchar(500) (nullable) |
| fldCreatedAt | Creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Relationships:**
- FK to `tblSecUserMap` via `fldOwnerKey` (GUID)
- FK to `tblPersonalProfileDetails` via `fldPersonId`
- FK to `tblGroupTypes` via `fldGroupTypeID`
- FK to `tblReasons` via `fldDeactivationReasonID`
- One group → many members (`tblGroupMembers`)
- One group → many group-level documents (`tblGroupDocuments`)
- Referenced by `tblVisaApplicationSubmitted` via `fldGroupID`

---

### tblGroupMembers

**Purpose:** Junction table linking a person to a group with a member type role. Personal data lives in `tblPersonalProfileDetails`.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupID | FK → tblGroups |
| fldUserId | FK → tblPersonalProfileDetails.fldID — the member's person record |
| fldMemberTypeID | FK → tblGroupMemberTypes — role in the group |
| fldStatus | 'Active', 'Removed', or 'Left' (default 'Active') |
| fldRemovalReasonID | FK → tblReasons (nullable) |
| fldRemovalComment | nvarchar(500) (nullable) |
| fldRemovedAt | Removal timestamp (nullable) |
| fldCreatedAt | Creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Relationships:**
- FK to `tblGroups` via `fldGroupID`
- FK to `tblPersonalProfileDetails` via `fldUserId`
- FK to `tblGroupMemberTypes` via `fldMemberTypeID`
- FK to `tblReasons` via `fldRemovalReasonID`
- One member → many documents (`tblGroupMemberDocuments`)

---

### tblGroupDocuments

**Purpose:** Documents uploaded at group level — shared across all members of a group. Stored in both the local database and the Laserfiche document repository.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupID | FK → tblGroups |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other (nullable) |
| fldRepoId | Laserfiche document repository entry ID (int, NOT NULL — no FK enforced) |
| fldFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldBase64 | Raw base64 document content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Upload timestamp (default sysutcdatetime()) |
| fldUploadedBy | FK → tblPersonalProfileDetails.fldID — who uploaded (nullable) |

**Relationships:**
- FK to `tblGroups` via `fldGroupID`
- FK to `tblDocumentTypes` via `fldDocumentTypeId`
- FK to `tblPersonalProfileDetails` via `fldUploadedBy`

> `fldRepoId` references the Laserfiche document management system — no FK constraint in the database.

---

### tblGroupMemberDocuments

**Purpose:** Documents uploaded against a specific group member, independent of any application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupMemberID | FK → tblGroupMembers |
| fldDocumentID | Soft reference to source document requirement (nullable, no FK enforced) |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other (nullable) |
| fldFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldBase64 | Raw base64 document content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Upload timestamp (default sysutcdatetime()) |

**Relationships:**
- FK to `tblGroupMembers` via `fldGroupMemberID`
- FK to `tblDocumentTypes` via `fldDocumentTypeId`

---

---

## Section 5 — Application Master Tables

`tblVisaApplicationSubmitted` is the central application table — all other application tables FK back to it.

---

### tblVisaApplicationSubmitted

**Purpose:** Master application record — one row per application. Tracks the full lifecycle from Draft through to Approved/Rejected/Cancelled.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldUserId | FK → tblSecUserMap.fldID — the principal applicant |
| fldApplicationRef | Application reference varchar(50) (nullable — populated after creation) |
| fldApplicationTypeID | FK → tblApplicationTypes |
| fldApplicationCategoryID | FK → tblApplicationCategories |
| fldApplicationSubcatID | FK → tblApplicationSubcategories |
| fldIsFamilyApplication | 1 = includes family members (default 0) |
| fldFamilyGroupID | FK → tblFamilies (nullable — set when family application) |
| fldIsGroupApplication | 1 = includes group members (default 0) |
| fldGroupID | FK → tblGroups (nullable — set when group application) |
| fldStatus | Full lifecycle status (default 'Draft') — see values below |
| fldQueue | 'Processing', 'Approval', or NULL |
| fldDeferCount | Number of times deferred (default 0, check: >= 0) |
| fldDeferReasonID | FK → tblReasons (type=Defer, nullable) |
| fldDeferComment | Defer notes nvarchar(500) (nullable) |
| fldDeferredAt | When deferred (nullable) |
| fldDeferDocumentsRequired | List of required documents nvarchar(max) (nullable) |
| fldCancelReasonID | FK → tblReasons (type=Cancellation, nullable) |
| fldCancelComment | Cancellation notes nvarchar(500) (nullable) |
| fldCancelledAt | When cancelled (nullable) |
| fldCancelledBy | Who cancelled nvarchar(100) (nullable) |
| fldReferReasonID | FK → tblReasons (type=Referral, nullable) |
| fldReferComment | Referral notes nvarchar(500) (nullable) |
| fldReferredAt | When referred (nullable) |
| fldReferredTo | Referred to officer nvarchar(100) (nullable) |
| fldReferDepartmentID | FK → tblDepartments (nullable) |
| fldPricePerPerson | Application fee decimal(10,2) (default 0.00) |
| fldCurrency | Currency code varchar(5) (default 'USD') |
| fldPaymentStatus | 'Unpaid', 'Paid', 'Waived', or 'Refunded' (default 'Unpaid') |
| fldPaymentRef | Payment reference varchar(100) (nullable) |
| fldPaidAt | Payment timestamp (nullable) |
| fldSubmittedAt | Write-once — stamped on first submission (nullable) |
| fldCreatedAt | Record creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Status values:** Draft → Submitted → Awaiting Processing → Under Review → Awaiting Approval → Approved / Rejected / Defer / Defer & Hold / Refer / Withdrawn / Cancelled

**Relationships:**
- FK to `tblSecUserMap` via `fldUserId`
- FK to `tblFamilies` via `fldFamilyGroupID` (nullable)
- FK to `tblGroups` via `fldGroupID` (nullable)
- FK to `tblApplicationTypes`, `tblApplicationCategories`, `tblApplicationSubcategories`
- FK to `tblReasons` (×3: defer, cancel, refer)
- FK to `tblDepartments` via `fldReferDepartmentID`
- Referenced by `tblApplicantPersonData`, `tblPrincipleDocuments`, `tblVisaApplicationApprovalHistory`, `tblSupervisorNotifications`, `tblApplicantBackgroundResponses`, `tblApplicationChecklistReview`, `tblApplicationOfficerComments`, `tblApplicationRecommendation`, `tblApplicationOfficerDocuments`, `tblApplicationApprovalDecision`, `tblApplicationAdditionalDocRequests`

---

### tblVisaApplicationApprovalHistory

**Purpose:** Append-only audit trail of every status change on an application. Auto-populated by a trigger on `tblVisaApplicationSubmitted`. Records are never updated or deleted.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldAction | The new status value applied |
| fldPreviousStatus | Status before this change (nullable) |
| fldQueue | Which queue at time of action (nullable) |
| fldReasonID | FK → tblReasons (nullable) |
| fldActionedBy | Officer username or SYSTEM_USER |
| fldActionedAt | Timestamp (default sysutcdatetime()) |
| fldComments | Free text notes nvarchar(500) (nullable) |
| fldDepartmentID | FK → tblDepartments (for referrals, nullable) |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblReasons`, `tblDepartments`

---

### tblSupervisorNotifications

**Purpose:** Outbox queue for supervisor alert emails. Populated automatically by a trigger when an application's `fldDeferCount` exceeds the `MaxDeferCount` setting.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldDeferCount | Defer count at time notification was created |
| fldIsSent | 0 = pending, 1 = email dispatched (default 0) |
| fldSentAt | When the email was sent (nullable) |
| fldCreatedAt | When the notification was created |

**Relationships:** FK to `tblVisaApplicationSubmitted`

---

---

## Section 6 — Application Person Data

Person data captured specifically for an application — linked to both the person record and the application.

---

### tblApplicantPersonData

**Purpose:** Full snapshot of the principal applicant's personal, passport, contact, and travel data at the time of application. All fields are NOT NULL — this is a frozen record, not a live reference. One record per applicant per application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserId | FK → tblPersonalProfileDetails.fldID — the applicant |
| fldFirstName | Snapshot at application time |
| fldMiddleName | (nullable) |
| fldSurname | Snapshot |
| fldDOB | Snapshot — check: < today |
| fldGenderID | FK → tblGenders |
| fldNationalityID | FK → tblNationalities |
| fldCountryOfBirth | Free text varchar(100) |
| fldPlaceOfBirth | Free text varchar(200) |
| fldMaritalStatusID | FK → tblMaritalStatuses |
| fldIsMinor | Computed — 1 if age < 18 |
| fldPassportTypeID | FK → tblPassportTypes |
| fldPassportNumber | Snapshot |
| fldPassportIssuingCountry | varchar(100) |
| fldPassportIssuingLocation | varchar(200) |
| fldPassportDateOfIssue | Snapshot — check: < fldPassportExpDate |
| fldPassportExpDate | Snapshot |
| fldPassportExpired | Computed — 1 if PassportExpDate < today |
| fldPassportExpiringSoon | Computed — 1 if PassportExpDate < today + 6 months |
| fldPassportBase64 | Snapshot passport image |
| fldPassportFileExt | File extension |
| fldPassportBase64Converted | Computed PERSISTED — full data URI |
| **fldDualNationality** | **BIT (nullable) — whether applicant holds dual nationality** *(added 2026-06-11)* |
| **fldOtherNationalityID** | **FK → tblNationalities (nullable) — second nationality when dual** *(added 2026-06-11)* |
| fldCurrentResidentialAdd | Address varchar(400) |
| fldCityOfResidence | City varchar(200) |
| fldCountryOfResidenceID | FK → tblNationalities |
| fldImmigrationStatusID | FK → tblImmigrationStatuses |
| fldCountryPhoneCode | Dial code — check: starts with '+' |
| fldPhoneNumber | Phone number |
| fldFullPhoneNumber | Computed PERSISTED — concatenated phone |
| fldEmail | Email (nullable) |
| fldPurposeOfVisitID | FK → tblPurposesOfVisit |
| fldPointOfEntryID | FK → tblPointsOfEntry |
| fldPhysicalAddressInUganda | Address in Uganda varchar(400) (nullable) |
| fldPreviousTravelHistory | Travel history notes nvarchar(max) (nullable) |
| fldDateOfArrival | Planned arrival date (nullable) |
| fldDurationOfStayDays | Planned stay length in days (nullable, check: > 0) |
| fldCreatedAt | Record creation timestamp |
| fldUpdatedAt | Last updated timestamp |

**Unique constraint:** `(fldApplicationID, fldUserId)` — one record per person per application.

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblPersonalProfileDetails`, `tblGenders`, `tblNationalities` (×3 — nationality, country of residence, other nationality), `tblMaritalStatuses`, `tblPassportTypes`, `tblImmigrationStatuses`, `tblPurposesOfVisit`, `tblPointsOfEntry`

**Business rules for dual nationality (enforced in `sp_RecordNewApplicantPersonData`):**
- `fldOtherNationalityID` is required when `fldDualNationality = 1`
- `fldOtherNationalityID` must differ from `fldNationalityID`
- Both nationalities must exist and be active in `tblNationalities`

---

### tblPrincipleDocuments

**Purpose:** Documents uploaded by the principal applicant against their specific application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserId | FK → tblSecUserMap.fldID |
| fldDocumentTypeID | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other (nullable) |
| fldFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldBase64 | Raw base64 document content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldIsIncludedInApp | Whether this doc is part of the formal submission (default 0) |
| fldUploadedAt | Upload timestamp (default sysutcdatetime()) |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblSecUserMap`, `tblDocumentTypes`

---

---

## Section 7 — Officer Processing Tables

These tables record officer actions during the Processing and Approval queue stages. All tables FK to `tblVisaApplicationSubmitted`. Most also FK to `tblApplicantPersonData` — a `NULL` `fldApplicantPersonDataID` means the record applies at the application level rather than to a specific applicant.

> **CheckGroup values** (used across checklist, comments, and recommendation tables): `Personal`, `Passport`, `Travel`, `Contact`, `Background`, `MandatoryDocuments`, `PassportPhoto`, `ReturnTicket`, `AdditionalDocuments`
>
> **QueueStage values:** `Processing`, `Approving`

---

### tblApplicantBackgroundResponses *(added 2026-06-11)*

**Purpose:** Stores one row per background question per applicant per application. Sub-fields (`fldCountry`, `fldDate`, `fldReason`, `fldDoctorName`, `fldDiagnosis`) are populated only when `fldAnswer = 1` (Yes); they are explicitly NULLed when the answer is No.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData |
| fldQuestionID | FK → tblBackgroundQuestions |
| fldAnswer | BIT — 1 = Yes, 0 = No |
| fldCountry | nvarchar(100) — required when HasCountry = 1 and Answer = Yes |
| fldDate | DATE — required when HasDate = 1 and Answer = Yes |
| fldReason | nvarchar(500) — required when HasReason = 1 and Answer = Yes |
| fldDoctorName | nvarchar(200) — required when HasDoctorName = 1 and Answer = Yes |
| fldDiagnosis | nvarchar(500) — required when HasDiagnosis = 1 and Answer = Yes |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Unique constraint:** `(fldApplicationID, fldApplicantPersonDataID, fldQuestionID)` — one response per question per applicant per application.

**Indexes:** `IX_AppBackgroundResp_ApplicationID`, `IX_AppBackgroundResp_ApplicantPersonDataID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData`, `tblBackgroundQuestions`

---

### tblApplicationChecklistReview *(added 2026-06-11)*

**Purpose:** Stores the officer's Acceptable / Not Acceptable result for each checklist section per applicant per queue stage. Upserted on every save via `sp_SaveChecklistReview`.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData |
| fldQueueStage | `Processing` or `Approving` |
| fldCheckGroup | Checklist section — see allowed values above |
| fldIsAcceptable | BIT (nullable) — NULL = not yet reviewed |
| fldReviewedBy | Officer DisplayName (resolved from session token) |
| fldReviewedAt | When last reviewed |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Unique constraint:** `(fldApplicationID, fldApplicantPersonDataID, fldQueueStage, fldCheckGroup)` — one result per section per applicant per stage.

**Index:** `IX_AppChecklistReview_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData`

---

### tblApplicationOfficerComments *(added 2026-06-11)*

**Purpose:** Append-only log of officer comments. Comments are never updated or deleted — each save inserts a new row. `NULL fldApplicantPersonDataID` = application-level comment; `NULL fldCheckGroup` = general comment not tied to a checklist section.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData (nullable) |
| fldQueueStage | `Processing` or `Approving` |
| fldCheckGroup | Checklist section (nullable) — see allowed values above |
| fldComment | nvarchar(500) |
| fldCommentBy | Officer DisplayName |
| fldCommentAt | Timestamp (default SYSUTCDATETIME()) |

**Index:** `IX_AppOfficerComments_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData` (nullable)

> **Note:** `fldCheckGroup` column was also scripted as an ALTER TABLE addition for cases where `tblApplicationOfficerComments` existed from a prior session without this column.

---

### tblApplicationRecommendation *(added 2026-06-11)*

**Purpose:** Processing officer's recommendation (`Approve` or `Reject`) per applicant per application. Upserted on every save — one row per applicant per application enforced by filtered unique indexes. Visa category/subcategory/duration fields populated on Approve.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData (nullable) |
| fldRecommendation | `Approve` or `Reject` |
| fldRecommendCategoryID | FK → tblApplicationCategories (nullable) |
| fldRecommendSubcategoryID | FK → tblApplicationSubcategories (nullable) |
| fldRecommendDuration | INT — visa duration value (nullable) |
| fldRecommendDurationUnit | `Days` or `Months` (nullable) |
| fldRecommendComment | nvarchar(500) (nullable) |
| fldRecommendedBy | Officer DisplayName |
| fldRecommendedAt | When recommendation was made |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Unique indexes:**
- `UX_AppRecommendation_SingleApplicant` — `(fldApplicationID)` WHERE `fldApplicantPersonDataID IS NULL`
- `UX_AppRecommendation_MultiApplicant` — `(fldApplicationID, fldApplicantPersonDataID)` WHERE `fldApplicantPersonDataID IS NOT NULL`

**Index:** `IX_AppRecommendation_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData` (nullable), `tblApplicationCategories`, `tblApplicationSubcategories`

---

### tblApplicationOfficerDocuments *(added 2026-06-11)*

**Purpose:** Documents uploaded by officers at the Recommendation, Approval, or Rejection stage. Supports soft delete — `fldIsDeleted = 1` marks a document as removed without destroying the record.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldDocumentStage | `Recommendation`, `Approval`, or `Rejection` |
| fldDocumentTypeID | FK → tblDocumentTypes (nullable) |
| fldOtherDocTypeName | nvarchar(100) — required when document type = Other (nullable) |
| fldFileExt | File extension varchar(10) |
| fldBase64 | Raw base64 content nvarchar(MAX) |
| fldBase64Converted | Computed PERSISTED — `data:application/{fldFileExt};base64,{fldBase64}` |
| fldUploadedBy | Officer DisplayName |
| fldUploadedAt | Timestamp (default SYSUTCDATETIME()) |
| fldIsDeleted | BIT — soft delete flag (default 0) |
| fldDeletedBy | Officer DisplayName (nullable) |
| fldDeletedAt | Timestamp (nullable) |

**Index:** `IX_AppOfficerDocs_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblDocumentTypes` (nullable)

> **Note:** `fldIsDeleted`, `fldDeletedBy`, and `fldDeletedAt` were also scripted as an ALTER TABLE addition (guarded with IF NOT EXISTS) for cases where this table was created prior to this session without those columns.

---

### tblApplicationApprovalDecision *(added 2026-06-11)*

**Purpose:** Approving officer's final decision (`Approved` or `Rejected`) per applicant per application. Upserted on every save — one row per applicant per application enforced by filtered unique indexes.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData (nullable) |
| fldDecision | `Approved` or `Rejected` |
| fldApproveCategoryID | FK → tblApplicationCategories (nullable) |
| fldApproveSubcategoryID | FK → tblApplicationSubcategories (nullable) |
| fldApproveDuration | INT — approved visa duration value (nullable) |
| fldApproveDurationUnit | `Days` or `Months` (nullable) |
| fldApproveComment | nvarchar(500) (nullable) |
| fldApprovedBy | Officer DisplayName |
| fldApprovedAt | When decision was made |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Unique indexes:**
- `UX_AppApprovalDecision_SingleApplicant` — `(fldApplicationID)` WHERE `fldApplicantPersonDataID IS NULL`
- `UX_AppApprovalDecision_MultiApplicant` — `(fldApplicationID, fldApplicantPersonDataID)` WHERE `fldApplicantPersonDataID IS NOT NULL`

**Index:** `IX_AppApprovalDecision_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData` (nullable), `tblApplicationCategories`, `tblApplicationSubcategories`

---

### tblApplicationAdditionalDocRequests *(added 2026-06-11)*

**Purpose:** Tracks officer requests for additional documents from applicants. `fldIsDeleted = 1` when the officer cancels the request. `fldReceivedAt` is stamped when the applicant uploads the requested document.

| Field | Description |
|---|---|
| fldID | Primary key (IDENTITY) |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicantPersonDataID | FK → tblApplicantPersonData (nullable) |
| fldDocumentTypeID | FK → tblDocumentTypes (nullable) |
| fldOtherDocTypeName | nvarchar(100) (nullable) |
| fldRequestComment | nvarchar(500) (nullable) |
| fldRequestedBy | Officer DisplayName |
| fldRequestedAt | Timestamp (default SYSUTCDATETIME()) |
| fldReceivedAt | Timestamp (nullable) — stamped when document is received |
| fldIsDeleted | BIT — 1 when request cancelled (default 0) |
| fldCreatedAt | Timestamp |

**Index:** `IX_AppAdditionalDocReq_ApplicationID`

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicantPersonData` (nullable), `tblDocumentTypes` (nullable)

---

---

## Section 8 — Workflow & Permit Tables

Tables supporting the permit application workflow system — separate from the core visa application flow.

---

### tblApplicationWorkflowType

**Purpose:** Master list of workflow types that a permit or application can be processed through.

| Field | Description |
|---|---|
| fldWorkflowTypeId | Primary key |
| fldKey | Unique key identifier nvarchar(50) |
| fldName | Display name nvarchar(100) |
| fldDescription | Optional description nvarchar(300) (nullable) |
| fldIsActive | Controls availability (default 1) |

**Relationships:** Referenced by `tblApplicationWorkflowRequest` via `fldWorkflowTypeId` (soft reference — no enforced FK)

---

### tblApplicationWorkflowRequest

**Purpose:** Records workflow requests such as passport renewals, permit changes, or citizenship transfers. References applications by their string reference number (not an enforced int FK) to support cross-system requests.

| Field | Description |
|---|---|
| fldWorkflowRequestId | Primary key |
| fldWorkflowTypeId | int — references tblApplicationWorkflowType (soft, no FK enforced) |
| fldOriginalApplicationId | nvarchar(50) — application reference string (not int FK) |
| fldPreviousPassportNumber | Previous passport identifier nvarchar(50) |
| fldDateOfBirth | Applicant date of birth — used for identity lookup |
| fldNewPermitSubcategoryId | int (nullable) — target subcategory (soft, no FK enforced) |
| fldRequestedOn | Request timestamp (default sysutcdatetime()) |
| fldStatus | Processing status nvarchar(30) (default 'PENDING') |
| fldNotes | Additional notes nvarchar(500) (nullable) |

> **No enforced FK constraints** on this table — all references are soft links. Draw relationship lines as dashed in the ERD.

---

---

## Section 9 — Operational & System Tables

These tables support system operations and logging. They are not part of the core business domain model and are not included in the main ERD.

---

### tblAuditLog

**Purpose:** System-level audit trail — records data changes across the database. Populated by triggers.

---

### tblErrorLog

**Purpose:** Application and database error logging — records exceptions and failures for diagnostics.

---

### tblApplicationID

**Purpose:** Sequence or reference number generator for application identifiers.

---

### sysdiagrams

SQL Server system table for SSMS diagram definitions — not part of the application schema.

---

### Future Module Reference Tables

The following 30 lookup tables were added in a single batch (2026-05-26) as reference data for future immigration modules (permits, citizenship, biometrics, etc.). They have no FK connections to the current application tables and are not part of the current ERD scope.

| Category | Tables |
|---|---|
| Physical description | tblEyeColors, tblHairColors, tblSkinColors |
| Business / entity | tblBanks, tblCompanyTypes, tblNonProfitCompanyTypes, tblOperators |
| Person classification | tblPersonTypes, tblCitizenshipTypes, tblProfessions, tblIndigenousCommunities |
| Travel | tblModesOfTravel, tblTempTravelDocTypes, tblVisaIssuingAuthorities, tblVisaExemptReasons |
| Financial | tblCurrencies, tblPaymentModes, tblMonthlyIncomeRanges |
| Agriculture / resources | tblAgroProductTypes, tblSpecificMinerals, tblOtherMinerals |
| Education | tblSchoolTypes, tblRareSkills |
| Status / admin | tblStatusTypes, tblRemovalTypes, tblSourceAuthorities |
| Biometrics | tblBiometricCaptureFailReasons |

These should be documented in a separate ERD sheet when their respective modules are built.

---

---

## Section 10 — Stored Procedures

### Registration & Profile

| Procedure | Purpose |
|---|---|
| proc_Records_PassportDocument | Upserts passport image record |
| sp_RecordVisaApplicationPassportDetails | Upserts passport personal details + creates tblSecUserMap entry on first call |
| sp_RecordVisaApplicationNewPrincipalInfo | Upserts principal contact/residence info |
| sp_GetUserPassportImageDetails | Returns passport image base64 for a user by token |
| sp_GetApplicantProfilePic | Returns profile photo base64 by ApplicationID |
| sp_GetApplicantReturnTicketImage | Returns return flight ticket base64 by ApplicationID |

### Application Lifecycle

| Procedure | Purpose |
|---|---|
| sp_RecordVisaApplication | Upserts master application record in tblVisaApplicationSubmitted. Resolves type/category/subcategory from names. Price/currency derived from subcategory. Re-saveable only while status = 'Awaiting Processing'. *(updated 2026-06-11)* |
| sp_CreateVisaApplicationReference | Creates the application reference number |
| sp_RecordNewApplicantPersonData | Upserts applicant person data in tblApplicantPersonData. Now includes `@DualNationality` (BIT) and `@OtherNationality` (NVARCHAR) — validates that other nationality is required and differs from primary when dual = 1. *(updated 2026-06-11)* |
| sp_RecordApplicantDocument | Upserts applicant document in tblPrincipleDocuments |

### Background Declarations

| Procedure | Purpose |
|---|---|
| sp_SaveBackgroundResponse | Upserts one background question response per applicant per application. Takes `@QuestionCode` — looks up question flags from `tblBackgroundQuestions` and validates required sub-fields. Clears sub-fields when answer = No. *(added 2026-06-11)* |
| sp_GetBackgroundResponse | Returns one background question response for a specific applicant by `@ApplicationID`, `@ApplicantProfileID`, and `@QuestionCode`. Used by Laserfiche lookup rules. Answer returned as 'Yes' / 'No' / NULL. *(added 2026-06-11)* |

### Family & Group Member Documents

| Procedure | Purpose |
|---|---|
| sp_UpsertFamilyMemberDocument | Upload or hard-delete a document for a family member. Caller must be the family principal or the member themselves. `@Action` = 'Upload' or 'Delete'. *(added 2026-06-11)* |
| sp_UpsertGroupMemberDocument | Upload or hard-delete a document for a group member. `@GroupID` pins the exact group. Caller must be the group principal or the member themselves. `@Action` = 'Upload' or 'Delete'. *(added 2026-06-11)* |

### Officer Processing

| Procedure | Purpose |
|---|---|
| proc_VisaApplication_GetById | Returns full application details by ID |
| proc_VisaApplication_Approve | Approves application — updates status, writes approval history |
| proc_VisaApplication_Reject | Rejects application — updates status, writes rejection history |
| proc_VisaApplication_Defer | Defers application back to applicant — updates status, increments defer count |
| proc_VisaApplication_DeferAndHold | Defer & Hold — preserves originating queue for correct routing on resubmit |
| proc_VisaApplication_Refer | Refers application to another department or officer |
| sp_SaveChecklistReview | Upserts one checklist section result (Acceptable/Not Acceptable) per applicant per queue stage per CheckGroup. Resolves officer name from session token. *(added 2026-06-11)* |
| sp_SaveOfficerComment | Inserts an officer comment (append-only). `fldApplicantPersonDataID` and `fldCheckGroup` are both optional. *(added 2026-06-11)* |
| sp_SaveRecommendation | Upserts processing officer recommendation (`Approve`/`Reject`) with optional category/subcategory/duration. *(added 2026-06-11)* |
| sp_SaveOfficerDocument | Upload or soft-delete an officer document. `@Action` = 'Upload' or 'Delete'. `@DocumentStage` = 'Recommendation', 'Approval', or 'Rejection'. *(added 2026-06-11)* |
| sp_SaveApprovalDecision | Upserts approving officer final decision (`Approved`/`Rejected`) with optional category/subcategory/duration. *(added 2026-06-11)* |
| sp_SaveAdditionalDocRequest | Manages additional document requests. `@Action` = 'Request', 'Received', or 'Delete'. *(added 2026-06-11)* |

### Page / List Queries

| Procedure | Purpose |
|---|---|
| proc_Page_VisaApplications | Returns paginated application list for officer queue |
| proc_Page_VisaApplications_Overview | Returns application summary and overview data |
| proc_Page_DeferredVisaApplications | Returns applications in Defer status |
| proc_Page_DeferredAndHoldVisaApplications | Returns applications in Defer & Hold status |
| proc_Page_RecommendationsVisaApplications | ⚠️ Needs verification — possibly referral recommendations |
| proc_Page_OfficialApplicationQueue | Officer queue grid. Updated to read from `vw_ApplicationQueueDetails`. Role detection via `Uganda_Portal.dbo.SecGroups`. *(updated 2026-06-11)* |

### Laserfiche Integration

| Procedure | Purpose |
|---|---|
| proc_Laserfiche_getFormFile | Retrieves a single form file from Laserfiche |
| proc_Laserfiche_getFormFilesList | Retrieves list of form files from Laserfiche |
| proc_Laserfiche_getFormFilesSingle | ⚠️ Unclear difference from getFormFile — needs verification |

### System / Diagram (not application logic)

`sp_alterdiagram`, `sp_creatediagram`, `sp_dropdiagram`, `sp_helpdiagrams`, `sp_helpdiagramdefinition`, `sp_renamediagram`, `sp_upgraddiagrams` — SQL Server system procedures for SSMS diagram management.

---

---

## Section 11 — Views

| View | Purpose |
|---|---|
| vw_ActiveLookups | Single view returning all active reference/lookup data — used to populate all dropdowns from one call |
| vw_FullApplicationDetails | Complete single-row-per-application view joining all tables — used for application detail screens |
| vw_VisaApplicationSummary | Summarised application view for lists and dashboards |
| vw_PendingApplications | Filtered view of applications awaiting officer action |
| vw_ApplicantFullDetails | Full resolved applicant details with all FK IDs replaced by display names |
| **vw_ApplicationQueueDetails** | **Full officer queue view. One row per application. Includes dual nationality columns, ApplicantCount (principal + family + group members), and latest assigned officer from tblVisaApplicationApprovalHistory. Used by proc_Page_OfficialApplicationQueue.** *(added 2026-06-11)* |
| **vw_ApplicationQueueImages** | **Passport image (from tblApplicantPersonData snapshot) and profile photo (from live tblPersonalProfileDetails record) per application. Returns HasPassportImage and HasProfileImage BIT flags.** *(added 2026-06-11)* |
| **vw_ApplicantBackgroundResponses** | **One row per question per applicant per application. CROSS JOINs all active tblBackgroundQuestions so all 5 questions appear even when unanswered. Returns IsAnswered and AllQuestionsAnswered flags.** *(added 2026-06-11)* |
| vw_ApplicationQueue | ⚠️ Superseded by vw_ApplicationQueueDetails — verify if still in use |
| vw_VisaApplicationsOverview | ⚠️ Needs verification — likely dashboard summary counts |
| vw_VisaApplicationsOverviewTest | Test/development version of overview — likely not production |
| vw_VisaApplicationsPending | ⚠️ May overlap with vw_PendingApplications — needs verification |
| vw_VisaApplicationsSubmitted | Applications in Submitted status |
| vw_VisaApplicationsSubmittedConsolidated | ⚠️ Consolidated version — needs verification |
| vw_VisaApplicationsSubmittedFormsTasks | ⚠️ Likely Laserfiche Forms integration view — needs verification |
| vw_VisaApplicationsApprove | Applications eligible for approval action |
| vw_VisaApplicationsReject | Applications eligible for rejection action |
| vw_VisaApplicationsDefer | Applications in Defer status |
| vw_VisaApplicationsDefer&Hold | Applications in Defer & Hold status |
| vw_VisaApplicationsRefer | Applications in Refer status |
| vw_PassportBase64Lookup | ⚠️ Likely returns passport image data for rendering — needs verification |
| vw_VisaApplicantDetails | ⚠️ May overlap with vw_ApplicantFullDetails — needs verification |

---

---

## Changelog

### v2.1 — 2026-06-11

**Schema changes (ALTER TABLE on existing tables):**
- `tblApplicantPersonData` — added `fldDualNationality` (BIT NULL) and `fldOtherNationalityID` (INT NULL, FK → tblNationalities)
- `tblApplicationOfficerDocuments` — added `fldIsDeleted`, `fldDeletedBy`, `fldDeletedAt` (IF NOT EXISTS guarded)
- `tblApplicationOfficerComments` — added `fldCheckGroup` (VARCHAR 50 NULL) with CHECK constraint (IF NOT EXISTS guarded)

**New tables (8):** `tblBackgroundQuestions`, `tblApplicantBackgroundResponses`, `tblApplicationChecklistReview`, `tblApplicationOfficerComments`, `tblApplicationRecommendation`, `tblApplicationOfficerDocuments`, `tblApplicationApprovalDecision`, `tblApplicationAdditionalDocRequests`

**Seed data:** 5 background questions inserted into `tblBackgroundQuestions`

**New views (3):** `vw_ApplicationQueueDetails`, `vw_ApplicationQueueImages`, `vw_ApplicantBackgroundResponses`

**New stored procedures (10):** `sp_SaveChecklistReview`, `sp_SaveOfficerComment`, `sp_SaveRecommendation`, `sp_SaveOfficerDocument`, `sp_SaveApprovalDecision`, `sp_SaveAdditionalDocRequest`, `sp_UpsertFamilyMemberDocument`, `sp_UpsertGroupMemberDocument`, `sp_SaveBackgroundResponse`, `sp_GetBackgroundResponse`

**Updated stored procedures (3):** `sp_RecordNewApplicantPersonData` (dual nationality), `sp_RecordVisaApplication` (current pattern), `proc_Page_OfficialApplicationQueue` (uses vw_ApplicationQueueDetails)

**Document structure:** New Section 7 (Officer Processing Tables) inserted; Sections 7–10 renumbered to 8–11

---

### v2.0 — June 2026

Major corrections based on full DDL review of all tables in `Uganda_Visa_Applications`.

**Database renamed:** `Uganda_Forms` → `Uganda_Visa_Applications`

**Architecture corrected — no application-layer snapshot tables:**

The prior design described a two-layer architecture with snapshot copies of family/group member data at application time (`tblApplicationFamilyMembers`, `tblApplicationGroupMembers`, `tblApplicationGroups`, `tblApplicationFamilyMemberDocuments`, `tblApplicationGroupMemberDocuments`). These tables **do not exist**. The actual design uses the pre-application tables directly.

| Removed (did not exist) | Replaced by |
|---|---|
| tblApplicationFamilyMembers | tblFamilyMembers (used directly) |
| tblApplicationGroupMembers | tblGroupMembers (used directly) |
| tblApplicationGroups | tblGroups (used directly) |
| tblApplicationFamilyMemberDocuments | tblFamilyMemberDocuments (used directly) |
| tblApplicationGroupMemberDocuments | tblGroupMemberDocuments (used directly) |
| tblApplicantDocuments | tblPrincipleDocuments (renamed) |

**Central person hub introduced:**

`tblPersonalProfileDetails` is the central person record. `tblFamilyMembers` and `tblGroupMembers` are now lean junction tables — all personal/passport data removed from those tables and lives in `tblPersonalProfileDetails`.

| Removed from ERD (replaced by tblPersonalProfileDetails) |
|---|
| tblVisaApplicationPassport |
| tblVisaApplicationPassportDetails |
| tblVisaApplicationNewPrincipalInfo |

**Tables corrected:**

| Table | Correction |
|---|---|
| tblSecUserMap | Added fldUUID, fldPortalSecUserId, fldLastUpdatedAt. Documented three unique identifiers (fldID, fldUserKey, fldPortalSecUserId). |
| tblPersonalProfileDetails | New table replacing registration tables. Added fldPassportIssuingCountry/Location/DateOfIssue, fldPrincipalInfoCaptured, fldProfileBase64/FileExt/Base64Converted. Bug noted in fldProfileBase64Converted computed expression. |
| tblGuardian | New table — junction linking minor to guardian via tblPersonalProfileDetails (×2). |
| tblFamilies | FK corrected: fldUserId → tblPersonalProfileDetails (was fldOwnerKey → tblSecUserMap). Added fldCreatedAt, fldUpdatedAt. |
| tblFamilyMembers | Completely rewritten as lean junction. All personal/passport fields removed. fldRelationship is free text nvarchar(50), not FK to tblGuardianRelationships. Added removal detail fields. |
| tblFamilyMemberDocuments | Added fldDocumentID, fldFileExt, fldBase64, fldUploadedAt. |
| tblGroups | Added fldPersonId FK→tblPersonalProfileDetails, fldGroupTypeID FK→tblGroupTypes, fldDeactivationReasonID, fldDeactivationComment, fldIsActive, fldCreatedAt, fldUpdatedAt. |
| tblGroupMembers | Completely rewritten as lean junction. All personal/passport fields removed. FK is fldUserId → tblPersonalProfileDetails. |
| tblGroupDocuments | Added fldRepoId (Laserfiche entry ID), fldFileExt, fldBase64, fldUploadedBy FK→tblPersonalProfileDetails. |
| tblGroupMemberDocuments | New table — per-member documents, FK to tblGroupMembers. |
| tblGroupTypes | New lookup table — FK from tblGroups.fldGroupTypeID. |
| tblVisaApplicationSubmitted | Changed fldUserId FK → tblSecUserMap.fldID (was fldUserKey GUID). Added fldFamilyGroupID FK → tblFamilies. Changed fldGroupID FK → tblGroups (was tblApplicationGroups). fldApplicationRef is plain varchar not computed. Added: fldPricePerPerson, fldCurrency, fldPaymentRef, fldPaidAt, fldDeferComment, fldDeferredAt, fldDeferDocumentsRequired, fldCancelComment, fldCancelledAt, fldCancelledBy, fldReferComment, fldReferredAt, fldReferredTo, fldCreatedAt, fldUpdatedAt. |
| tblApplicantPersonData | FK corrected: fldUserId → tblPersonalProfileDetails (was tblSecUserMap). Added fldPassportIssuingCountry, fldPassportIssuingLocation, fldPassportDateOfIssue, fldPhysicalAddressInUganda, fldPreviousTravelHistory. Unique constraint (fldApplicationID, fldUserId). All fields NOT NULL. |
| tblPrincipleDocuments | Renamed from tblApplicantDocuments. FK fldUserId → tblSecUserMap.fldID. Added fldFileExt, fldBase64, fldUploadedAt. fldBase64Converted is PERSISTED computed. |
| tblVisaApplicationApprovalHistory | Added fldComments nvarchar(500). |
| tblSupervisorNotifications | Added fldCreatedAt. |
| tblReasons | Updated discriminator list — added: Rejection, Internship, Research, SpecialPass, Deprivation, NationalityLost, RejectCitizenship, ToSecondary, CancellationByUser. |
| tblPermitDocumentRequirement | New table — enhanced document requirement junction for permit applications. |
| tblApplicationWorkflowType | New table — workflow type lookup. |
| tblApplicationWorkflowRequest | New table — workflow request log. All references are soft (no FK constraints). |

---

*Last updated: 2026-06-11 — v2.1*
*Database: Uganda_Visa_Applications*
*Classification: Confidential*
