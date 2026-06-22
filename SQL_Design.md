# Uganda Unified Border Management — Database Reference

**Database:** `Uganda_Visa_Applications`
**Version:** 2.1 — June 2026
**Classification:** Confidential / In Commercial Confidence

> This document is kept in sync with `SQL_ERD_Design.md`. Both files carry the same content — `SQL_ERD_Design.md` is the primary source; update both when making changes.

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
- `tblFamilyMembers` and `tblGroupMembers` are **lean junction tables** — personal data lives entirely in `tblPersonalProfileDetails`.
- There are **no application-layer snapshot copies** of family or group member data.
- `tblApplicantPersonData` is the only snapshot table — it freezes the principal's personal and travel data at application time.
- Family and group chains are **fully independent** — group members have no FK to `tblFamilyMembers`.
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

---

### tblSettings

**Purpose:** System-wide configurable parameters that drive business rules across the application.

| Field | Description |
|---|---|
| fldKey | Unique parameter name |
| fldValue | Parameter value stored as string — cast on read |
| fldDataType | Data type hint: INT, DECIMAL, VARCHAR, EMAIL, BOOL |
| fldDescription | Human-readable explanation |
| fldUpdatedAt | Last modified timestamp |
| fldUpdatedBy | Who last changed the value |

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

**Purpose:** Master list of immigration application types.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Short code (e.g. `VISA`, `EP`, `SP`) |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |
| fldCreatedAt | Creation timestamp |

**Relationships:** One type → many categories (`tblApplicationCategories`)

**Values:** Visa, Entry Permit, Student Pass, Special Pass, Dependent Pass, Intern/Research Pass, Certificate of Residence, Citizenship

---

### tblApplicationCategories

**Purpose:** Categories within each application type.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationTypeID | FK → tblApplicationTypes |
| fldName | Display name |
| fldCode | Short code |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |
| fldCreatedAt | Creation timestamp |

**Relationships:** FK to `tblApplicationTypes`; One category → many subcategories (`tblApplicationSubcategories`)

---

### tblApplicationSubcategories

**Purpose:** Subcategories within each category. Holds price per person.

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

**Relationships:** FK to `tblApplicationCategories`; Referenced by `tblSubcategoryMandatoryDocuments` and `tblPermitDocumentRequirement`

---

### tblSubcategoryMandatoryDocuments

**Purpose:** Junction table — defines which documents are mandatory per visa subcategory.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationSubcategoryID | FK → tblApplicationSubcategories |
| fldDocumentTypeID | FK → tblDocumentTypes |

> For permit-type applications with richer metadata, see `tblPermitDocumentRequirement`.

---

### tblPermitDocumentRequirement

**Purpose:** Enhanced document requirement junction for permit-type applications — adds mandatory/confirmation flags.

| Field | Description |
|---|---|
| fldPermitDocumentRequirementId | Primary key |
| fldApplicationSubcategoryId | FK → tblApplicationSubcategories |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldIsMandatory | Required flag (default 1) |
| fldRequiresConfirmation | Officer confirmation required (default 0) |
| fldNotes | Guidance notes (nullable) |

**Unique constraint:** `(fldApplicationSubcategoryId, fldDocumentTypeId)`

---

### tblDocumentTypes

**Purpose:** Master list of all document types across the system.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Short code |
| fldDescription | Optional description |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |

**Referenced by:** tblSubcategoryMandatoryDocuments, tblPermitDocumentRequirement, tblFamilyMemberDocuments, tblGroupMemberDocuments, tblGroupDocuments, tblPrincipleDocuments, tblApplicationOfficerDocuments, tblApplicationAdditionalDocRequests

---

### tblNationalities

**Purpose:** Full country list with visa exemption and EAC membership indicators.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldCountryName | Full country name |
| fldISO2 | ISO 3166-1 alpha-2 code |
| fldISO3 | ISO 3166-1 alpha-3 code |
| fldDialCode | International dial code |
| fldIsVisaExempt | 1 = no visa required |
| fldIsEAC | 1 = EAC member |
| fldIsActive | Controls visibility |

**Referenced by:** tblPersonalProfileDetails (fldNationalityID, fldCountryOfResidenceID), tblApplicantPersonData (fldNationalityID, fldCountryOfResidenceID, fldOtherNationalityID)

---

### tblPassportTypes

**Purpose:** Valid passport type values.

**Referenced by:** tblPersonalProfileDetails, tblApplicantPersonData

**Values:** Ordinary, Diplomatic, Official/Service, ID Card, Other

---

### tblGenders

**Purpose:** Valid gender values.

**Referenced by:** tblPersonalProfileDetails, tblApplicantPersonData

**Values:** Male (M), Female (F)

---

### tblMaritalStatuses

**Purpose:** Valid marital status values.

**Referenced by:** tblPersonalProfileDetails, tblApplicantPersonData

**Values:** Single, Married, Divorced, Widowed, Separated, Other

---

### tblGuardianRelationships

**Purpose:** Valid legal guardian relationship types.

**Referenced by:** tblGuardian via fldGuardianTypeId

**Values:** Parent, Court Appointed Guardian, Testamentary Guardian, Foster Parent

---

### tblGroupMemberTypes

**Purpose:** Role a member plays within a group.

**Referenced by:** tblGroupMembers via fldMemberTypeID

**Values:** Principal, Responsible, Group Member

---

### tblGroupTypes

**Purpose:** Valid group type values — classifies the nature of a group.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Unique short code |
| fldIsActive | Controls visibility (default 1) |
| fldSortOrder | Display order (default 0) |

**Unique constraint:** `fldCode`

**Referenced by:** tblGroups via fldGroupTypeID

---

### tblPurposesOfVisit

**Purpose:** Valid purpose of visit values.

**Referenced by:** tblApplicantPersonData via fldPurposeOfVisitID

**Values:** Tourism, Medical, Family Visit (Foreign National), Returning Resident, Family Visit (Former Ugandan), Returning Citizen, Transit, Conference, Other

---

### tblPointsOfEntry

**Purpose:** Valid Uganda entry points.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Entry point name |
| fldType | Airport, Land, or Water |
| fldRegion | Geographic region |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |

**Referenced by:** tblApplicantPersonData via fldPointOfEntryID

---

### tblImmigrationStatuses

**Purpose:** Immigration status in country of residence.

**Referenced by:** tblPersonalProfileDetails, tblApplicantPersonData

**Values:** Citizen, Student, Tourist, Work, Other

---

### tblReasons

**Purpose:** Unified reasons table for all reason dropdowns. `fldReasonType` discriminator identifies which list each row belongs to.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldReasonType | Discriminator — see full list below |
| fldName | Display name |
| fldCode | Short code |
| fldIsActive | Controls visibility (default 1) |
| fldSortOrder | Display order (default 0) |

**Unique constraint:** `(fldReasonType, fldCode)`

**Full fldReasonType list:** FamilyRemoval, LeaveFamily, RemovalFromFamily, LeaveGroup, RemovalFromGroup, RemovalFromApplication, Cancellation, CancellationByUser, Defer, Referral, ApplicantRemoval, Rejection, Internship, Research, SpecialPass, Deprivation, NationalityLost, RejectCitizenship, ToSecondary

**Referenced by:** tblVisaApplicationSubmitted (×3), tblVisaApplicationApprovalHistory, tblFamilyMembers, tblGroupMembers, tblGroups

---

### tblDepartments

**Purpose:** Immigration departments for referrals.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Department name |
| fldCode | Short code |
| fldManagerName | Department manager |
| fldEmail | Contact email |
| fldIsActive | Controls visibility |
| fldCreatedAt | Creation timestamp |

**Referenced by:** tblVisaApplicationSubmitted via fldReferDepartmentID, tblVisaApplicationApprovalHistory via fldDepartmentID

---

### tblBackgroundQuestions *(added 2026-06-11)*

**Purpose:** Lookup table defining each background declaration question and its conditional sub-field requirements. The `fldHas*` flags drive which detail fields are required when `fldAnswer = 1` (Yes).

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

**Referenced by:** tblApplicantBackgroundResponses via fldQuestionID; vw_ApplicantBackgroundResponses; sp_SaveBackgroundResponse; sp_GetBackgroundResponse

---

---

## Section 2 — User Identity & Person Data

---

### tblSecUserMap

**Purpose:** Permanent identity bridge between the Uganda Portal user account and this database.

| Field | Description |
|---|---|
| fldID | Primary key (int) — FK used by most tables |
| fldUUID | Unique nvarchar(50) (nullable) |
| fldUserKey | Unique UNIQUEIDENTIFIER — FK used by tblGroups.fldOwnerKey |
| fldPortalSecUserId | Unique int (nullable) — links to Uganda_Portal |
| fldDisplayName | User's display name |
| fldCreatedAt | Creation timestamp |
| fldLastSeenAt | Last activity timestamp |
| fldLastUpdatedAt | Last profile update |

> Most tables FK to `fldID` (int). `tblGroups.fldOwnerKey` is the exception — it uses `fldUserKey` (uniqueidentifier).

---

### tblPersonalProfileDetails

**Purpose:** Central person record for the entire system. One record per person — portal users, family members, and group members all share this table. `fldSecUserId` is nullable — non-portal persons (manually added members) have no portal account.

| Field | Description |
|---|---|
| fldID | Primary key — used as FK across family, group, and application tables |
| fldSecUserId | FK → tblSecUserMap.fldID (nullable) |
| fldFirstName, fldMiddleName, fldSurname | Personal name |
| fldDOB | Date of birth — check: < today |
| fldGenderID | FK → tblGenders |
| fldNationalityID | FK → tblNationalities |
| fldCountryOfBirth | Free text varchar(100) |
| fldPlaceOfBirth | Free text varchar(200) |
| fldMaritalStatusID | FK → tblMaritalStatuses |
| fldPassportTypeID | FK → tblPassportTypes |
| fldPassportNumber | Unique across system (uq_PassportNumber) |
| fldPassportIssuingCountry | varchar(100) |
| fldPassportIssuingLocation | varchar(200) |
| fldPassportDateOfIssue | check: < fldPassportExpDate |
| fldPassportExpDate | Passport expiry |
| fldPassportBase64 | Raw passport image |
| fldPassportFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldPassportBase64Converted | Computed PERSISTED — full data URI |
| fldPassportExpired | Computed — 1 if expired |
| fldPassportExpiringSoon | Computed — 1 if expires within 6 months |
| fldProfileBase64 | Raw profile photo |
| fldProfileFileExt | Profile photo file extension |
| fldProfileBase64Converted | Computed PERSISTED — full data URI for profile photo |
| fldCurrentResidentialAdd | Home address varchar(400) |
| fldCityOfResidence | City varchar(200) |
| fldCountryOfResidenceID | FK → tblNationalities |
| fldImmigrationStatusID | FK → tblImmigrationStatuses |
| fldCountryPhoneCode | Dial code — check: starts with '+' |
| fldPhoneNumber | varchar(15) |
| fldFullPhoneNumber | Computed PERSISTED — concatenated phone |
| fldEmail | varchar(200) — unique if provided |
| fldPrincipalInfoCaptured | bit — 0 = incomplete, 1 = complete (default 0) |
| fldIsMinor | Computed — 1 if age < 18 |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Referenced by:** tblFamilies, tblFamilyMembers, tblGroups (fldPersonId), tblGroupMembers, tblApplicantPersonData, tblGuardian (×2), tblGroupDocuments (fldUploadedBy)

---

### tblGuardian

**Purpose:** Junction table establishing a legal guardian relationship. Both the minor and guardian are `tblPersonalProfileDetails` records.

| Field | Description |
|---|---|
| fldId | Primary key |
| fldUserId | FK → tblPersonalProfileDetails — the minor |
| fldGuardianId | FK → tblPersonalProfileDetails — the guardian |
| fldGuardianTypeId | FK → tblGuardianRelationships |
| fldIsActive | Whether relationship is current (default 1) |

---

---

## Section 3 — Family Management Tables

> `tblFamilies` and `tblFamilyMembers` are **lean junction tables**. Personal data lives in `tblPersonalProfileDetails`. Always JOIN there via `fldUserId` to get member details.

---

### tblFamilies

**Purpose:** Family unit owned by the principal.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldUserId | FK → tblPersonalProfileDetails — the owner |
| fldIsActive | Soft delete (default 1) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Referenced by:** tblVisaApplicationSubmitted via fldFamilyGroupID

---

### tblFamilyMembers

**Purpose:** Junction linking a person to a family. Status and relationship tracking only.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldFamilyID | FK → tblFamilies |
| fldUserId | FK → tblPersonalProfileDetails |
| fldRelationship | Free text nvarchar(50) — e.g. Spouse, Child (not a FK) |
| fldStatus | 'Active', 'Removed', 'Left' (default 'Active') |
| fldRemovalReasonID | FK → tblReasons (nullable) |
| fldRemovalComment | nvarchar(500) (nullable) |
| fldRemovedAt | Timestamp (nullable) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

---

### tblFamilyMemberDocuments

**Purpose:** Documents uploaded against a family member, independent of any application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldFamilyMemberID | FK → tblFamilyMembers |
| fldDocumentID | Soft reference — no FK enforced |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text (nullable) |
| fldFileExt | File extension |
| fldBase64 | Raw base64 content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Timestamp |

---

---

## Section 4 — Group Management Tables

> `tblGroupMembers` is a **lean junction table**. Personal data lives in `tblPersonalProfileDetails`. Always JOIN there via `fldUserId`.

---

### tblGroups

**Purpose:** Named group created by the principal.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldOwnerKey | FK → tblSecUserMap.fldUserKey (GUID) |
| fldPersonId | FK → tblPersonalProfileDetails — principal's person record |
| fldGroupName | Display name |
| fldGroupType | Free text type varchar(50) |
| fldGroupTypeID | FK → tblGroupTypes (nullable) |
| fldContactFirstName, fldContactSurname | Contact person |
| fldContactPhoneCode, fldContactPhoneNumber | Contact phone — code check: starts with '+' |
| fldContactFullPhone | Computed PERSISTED |
| fldIsActive | Active flag (default 1) |
| fldDeactivationReasonID | FK → tblReasons (nullable) |
| fldDeactivationComment | nvarchar(500) (nullable) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Referenced by:** tblVisaApplicationSubmitted via fldGroupID

---

### tblGroupMembers

**Purpose:** Junction linking a person to a group with a role. Status tracking only.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupID | FK → tblGroups |
| fldUserId | FK → tblPersonalProfileDetails |
| fldMemberTypeID | FK → tblGroupMemberTypes |
| fldStatus | 'Active', 'Removed', 'Left' (default 'Active') |
| fldRemovalReasonID | FK → tblReasons (nullable) |
| fldRemovalComment | nvarchar(500) (nullable) |
| fldRemovedAt | Timestamp (nullable) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

---

### tblGroupDocuments

**Purpose:** Documents uploaded at group level — shared across all members. Stored locally and in Laserfiche.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupID | FK → tblGroups |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text (nullable) |
| fldRepoId | Laserfiche document repository entry ID (soft reference — no FK) |
| fldFileExt | File extension |
| fldBase64 | Raw base64 content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Timestamp |
| fldUploadedBy | FK → tblPersonalProfileDetails (nullable) |

---

### tblGroupMemberDocuments

**Purpose:** Documents uploaded against a specific group member, independent of any application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldGroupMemberID | FK → tblGroupMembers |
| fldDocumentID | Soft reference (nullable — no FK enforced) |
| fldDocumentTypeId | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text (nullable) |
| fldFileExt | File extension |
| fldBase64 | Raw base64 content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldUploadedAt | Timestamp |

---

---

## Section 5 — Application Master Tables

---

### tblVisaApplicationSubmitted

**Purpose:** Master application record — one row per application. Central anchor for all application data.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldUserId | FK → tblSecUserMap.fldID — the principal |
| fldApplicationRef | varchar(50) nullable — set after creation |
| fldApplicationTypeID | FK → tblApplicationTypes |
| fldApplicationCategoryID | FK → tblApplicationCategories |
| fldApplicationSubcatID | FK → tblApplicationSubcategories |
| fldIsFamilyApplication | 1 = family application (default 0) |
| fldFamilyGroupID | FK → tblFamilies (nullable) |
| fldIsGroupApplication | 1 = group application (default 0) |
| fldGroupID | FK → tblGroups (nullable) |
| fldStatus | Lifecycle status (default 'Draft') |
| fldQueue | 'Processing', 'Approval', or NULL |
| fldDeferCount | Times deferred (default 0) |
| fldDeferReasonID | FK → tblReasons (nullable) |
| fldDeferComment | nvarchar(500) (nullable) |
| fldDeferredAt | Timestamp (nullable) |
| fldDeferDocumentsRequired | nvarchar(max) (nullable) |
| fldCancelReasonID | FK → tblReasons (nullable) |
| fldCancelComment | nvarchar(500) (nullable) |
| fldCancelledAt | Timestamp (nullable) |
| fldCancelledBy | nvarchar(100) (nullable) |
| fldReferReasonID | FK → tblReasons (nullable) |
| fldReferComment | nvarchar(500) (nullable) |
| fldReferredAt | Timestamp (nullable) |
| fldReferredTo | nvarchar(100) (nullable) |
| fldReferDepartmentID | FK → tblDepartments (nullable) |
| fldPricePerPerson | decimal(10,2) (default 0.00) |
| fldCurrency | varchar(5) (default 'USD') |
| fldPaymentStatus | 'Unpaid', 'Paid', 'Waived', 'Refunded' (default 'Unpaid') |
| fldPaymentRef | varchar(100) (nullable) |
| fldPaidAt | Timestamp (nullable) |
| fldSubmittedAt | Write-once on first submission (nullable) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Status values:** Draft, Submitted, Awaiting Processing, Under Review, Awaiting Approval, Approved, Rejected, Defer, Defer & Hold, Refer, Withdrawn, Cancelled

---

### tblVisaApplicationApprovalHistory

**Purpose:** Append-only audit trail of every status change. Populated by trigger — records never updated.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldAction | New status applied |
| fldPreviousStatus | Prior status (nullable) |
| fldQueue | Queue at time of action (nullable) |
| fldReasonID | FK → tblReasons (nullable) |
| fldActionedBy | Officer username or SYSTEM_USER |
| fldActionedAt | Timestamp |
| fldComments | Free text notes nvarchar(500) (nullable) |
| fldDepartmentID | FK → tblDepartments (nullable) |

---

### tblSupervisorNotifications

**Purpose:** Outbox queue for supervisor alert emails — triggered when deferCount exceeds MaxDeferCount.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldDeferCount | Count at notification creation time |
| fldIsSent | 0 = pending, 1 = sent (default 0) |
| fldSentAt | When sent (nullable) |
| fldCreatedAt | Creation timestamp |

---

---

## Section 6 — Application Person Data

---

### tblApplicantPersonData

**Purpose:** Frozen snapshot of the principal applicant's personal, passport, and travel data at application time. All fields NOT NULL. One record per applicant per application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserId | FK → tblPersonalProfileDetails — the applicant |
| fldFirstName, fldMiddleName, fldSurname | Snapshot |
| fldDOB | Snapshot — check: < today |
| fldGenderID | FK → tblGenders |
| fldNationalityID | FK → tblNationalities |
| fldCountryOfBirth | Free text varchar(100) |
| fldPlaceOfBirth | varchar(200) |
| fldMaritalStatusID | FK → tblMaritalStatuses |
| fldIsMinor | Computed — 1 if age < 18 |
| fldPassportTypeID | FK → tblPassportTypes |
| fldPassportNumber | Snapshot |
| fldPassportIssuingCountry | varchar(100) |
| fldPassportIssuingLocation | varchar(200) |
| fldPassportDateOfIssue | check: < fldPassportExpDate |
| fldPassportExpDate | Snapshot |
| fldPassportExpired | Computed |
| fldPassportExpiringSoon | Computed |
| fldPassportBase64 | Snapshot image |
| fldPassportFileExt | File extension |
| fldPassportBase64Converted | Computed PERSISTED — full data URI |
| **fldDualNationality** | **BIT (nullable) — whether applicant holds dual nationality** *(added 2026-06-11)* |
| **fldOtherNationalityID** | **FK → tblNationalities (nullable) — second nationality when dual** *(added 2026-06-11)* |
| fldCurrentResidentialAdd | varchar(400) |
| fldCityOfResidence | varchar(200) |
| fldCountryOfResidenceID | FK → tblNationalities |
| fldImmigrationStatusID | FK → tblImmigrationStatuses |
| fldCountryPhoneCode | check: starts with '+' |
| fldPhoneNumber | varchar(15) |
| fldFullPhoneNumber | Computed PERSISTED |
| fldEmail | varchar(200) (nullable) |
| fldPurposeOfVisitID | FK → tblPurposesOfVisit |
| fldPointOfEntryID | FK → tblPointsOfEntry |
| fldPhysicalAddressInUganda | varchar(400) (nullable) |
| fldPreviousTravelHistory | nvarchar(max) (nullable) |
| fldDateOfArrival | Planned arrival (nullable) |
| fldDurationOfStayDays | Stay length in days (nullable, check: > 0) |
| fldCreatedAt, fldUpdatedAt | Timestamps |

**Unique constraint:** `(fldApplicationID, fldUserId)`

**Business rules for dual nationality (enforced in sp_RecordNewApplicantPersonData):**
- `fldOtherNationalityID` is required when `fldDualNationality = 1`
- `fldOtherNationalityID` must differ from `fldNationalityID`
- Both nationalities must exist and be active in `tblNationalities`

---

### tblPrincipleDocuments

**Purpose:** Documents uploaded by the principal applicant against their application.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserId | FK → tblSecUserMap.fldID |
| fldDocumentTypeID | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text (nullable) |
| fldFileExt | File extension (.jpg, .jpeg, .png, .bmp, .pdf) |
| fldBase64 | Raw base64 content |
| fldBase64Converted | Computed PERSISTED — full data URI |
| fldIsIncludedInApp | Formal submission flag (default 0) |
| fldUploadedAt | Timestamp |

---

---

## Section 7 — Officer Processing Tables

> All tables in this section have `fldApplicationID` → `tblVisaApplicationSubmitted` and most have `fldApplicantPersonDataID` → `tblApplicantPersonData`. A NULL `fldApplicantPersonDataID` indicates an application-level record (applies to the whole application, not a specific applicant).
>
> **CheckGroup values** used across checklist, comments, and recommendation tables: `Personal`, `Passport`, `Travel`, `Contact`, `Background`, `MandatoryDocuments`, `PassportPhoto`, `ReturnTicket`, `AdditionalDocuments`
>
> **QueueStage values:** `Processing`, `Approving`

---

### tblApplicantBackgroundResponses *(added 2026-06-11)*

**Purpose:** Stores one row per background question per applicant per application. Sub-fields (`fldCountry`, `fldDate`, `fldReason`, `fldDoctorName`, `fldDiagnosis`) are only populated when `fldAnswer = 1` (Yes); they are explicitly NULLed on a No answer.

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

---

### tblApplicationChecklistReview *(added 2026-06-11)*

**Purpose:** Stores the officer's Acceptable / Not Acceptable result for each checklist section (`fldCheckGroup`) per applicant per queue stage. Upserted on every save.

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

---

### tblApplicationRecommendation *(added 2026-06-11)*

**Purpose:** Processing officer's recommendation (`Approve` or `Reject`) per applicant per application. Upserted on every save — one row per applicant per application. Visa category/subcategory/duration fields are populated on Approve.

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

> **Note:** The `fldIsDeleted`, `fldDeletedBy`, and `fldDeletedAt` columns were also scripted as an ALTER TABLE addition (Section 1.2 of the session script) for cases where the table was created prior to this session without those columns.

---

### tblApplicationApprovalDecision *(added 2026-06-11)*

**Purpose:** Approving officer's final decision (`Approved` or `Rejected`) per applicant per application. Upserted on every save — one row per applicant per application.

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

---

### tblApplicationAdditionalDocRequests *(added 2026-06-11)*

**Purpose:** Tracks officer requests for additional documents from applicants. `fldIsDeleted = 1` when an officer cancels the request. `fldReceivedAt` is stamped when the applicant uploads the requested document.

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

---

---

## Section 8 — Workflow & Permit Tables

---

### tblApplicationWorkflowType

**Purpose:** Master list of workflow types for permit and application processing.

| Field | Description |
|---|---|
| fldWorkflowTypeId | Primary key |
| fldKey | Unique key identifier nvarchar(50) |
| fldName | Display name nvarchar(100) |
| fldDescription | Optional description (nullable) |
| fldIsActive | Controls availability (default 1) |

---

### tblApplicationWorkflowRequest

**Purpose:** Records workflow requests (passport renewals, permit changes, citizenship transfers). References applications by string ref number — no enforced FKs.

| Field | Description |
|---|---|
| fldWorkflowRequestId | Primary key |
| fldWorkflowTypeId | int — soft reference to tblApplicationWorkflowType |
| fldOriginalApplicationId | nvarchar(50) — application ref string (not int FK) |
| fldPreviousPassportNumber | nvarchar(50) |
| fldDateOfBirth | For identity lookup |
| fldNewPermitSubcategoryId | int (nullable — soft reference) |
| fldRequestedOn | Timestamp (default sysutcdatetime()) |
| fldStatus | nvarchar(30) (default 'PENDING') |
| fldNotes | nvarchar(500) (nullable) |

> No enforced FK constraints — all references are soft links. Draw as dashed lines in the ERD.

---

---

## Section 9 — Operational & System Tables

Not part of the business domain ERD.

| Table | Purpose |
|---|---|
| tblAuditLog | System-level audit trail — populated by triggers |
| tblErrorLog | Error and exception logging |
| tblApplicationID | Application reference number sequencer |
| sysdiagrams | SQL Server system table — SSMS diagrams |

### Future Module Reference Tables

Created 2026-05-26 for future immigration modules. Not connected to current application tables — document in a separate ERD when modules are built.

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

---

---

## Section 10 — Stored Procedures

### Registration & Profile

| Procedure | Purpose |
|---|---|
| proc_Records_PassportDocument | Upserts passport image record |
| sp_RecordVisaApplicationPassportDetails | Upserts passport personal details + creates tblSecUserMap entry on first call |
| sp_RecordVisaApplicationNewPrincipalInfo | Upserts principal contact/residence info |
| sp_GetUserPassportImageDetails | Returns passport image base64 by token |
| sp_GetApplicantProfilePic | Returns profile photo base64 by ApplicationID |
| sp_GetApplicantReturnTicketImage | Returns return flight ticket base64 by ApplicationID |

### Application Lifecycle

| Procedure | Purpose |
|---|---|
| sp_RecordVisaApplication | Upserts master application record in tblVisaApplicationSubmitted. Resolves type/category/subcategory from names. Price/currency derived from subcategory. Re-saveable only while status = 'Awaiting Processing'. *(updated 2026-06-11)* |
| sp_CreateVisaApplicationReference | Creates the application reference number |
| sp_RecordNewApplicantPersonData | Upserts applicant person data in tblApplicantPersonData. Now includes `@DualNationality` (BIT) and `@OtherNationality` (NVARCHAR) parameters — validates that other nationality is required and differs from primary when dual = 1. *(updated 2026-06-11)* |
| sp_RecordApplicantDocument | Upserts applicant document in tblPrincipleDocuments |

### Background Declarations

| Procedure | Purpose |
|---|---|
| sp_SaveBackgroundResponse | Upserts one background question response per applicant per application. Takes `@QuestionCode` (VARCHAR) — looks up question flags from `tblBackgroundQuestions` and validates required sub-fields based on question configuration. Clears sub-fields when answer = No. *(added 2026-06-11)* |
| sp_GetBackgroundResponse | Returns one background question response for a specific applicant by `@ApplicationID`, `@ApplicantProfileID`, and `@QuestionCode`. Used by Laserfiche lookup rules — one rule per question. Answer returned as 'Yes' / 'No' / NULL. *(added 2026-06-11)* |

### Family & Group Member Documents

| Procedure | Purpose |
|---|---|
| sp_UpsertFamilyMemberDocument | Upload or hard-delete a document for a family member. Caller must be the family principal or the member themselves. `@Action` = 'Upload' or 'Delete'. *(added 2026-06-11)* |
| sp_UpsertGroupMemberDocument | Upload or hard-delete a document for a group member. `@GroupID` pins the exact group. Caller must be the group principal or the member themselves. `@Action` = 'Upload' or 'Delete'. *(added 2026-06-11)* |

### Officer Processing

| Procedure | Purpose |
|---|---|
| proc_VisaApplication_GetById | Returns full application details by ID |
| proc_VisaApplication_Approve | Approves application |
| proc_VisaApplication_Reject | Rejects application |
| proc_VisaApplication_Defer | Defers application — increments defer count |
| proc_VisaApplication_DeferAndHold | Defer & Hold — preserves originating queue |
| proc_VisaApplication_Refer | Refers to another department or officer |
| sp_SaveChecklistReview | Upserts one checklist section result (Acceptable/Not Acceptable) per applicant per queue stage per CheckGroup. Resolves officer name from session token. *(added 2026-06-11)* |
| sp_SaveOfficerComment | Inserts an officer comment (append-only). `fldApplicantPersonDataID` and `fldCheckGroup` are both optional (NULL = application-level or general comment). *(added 2026-06-11)* |
| sp_SaveRecommendation | Upserts processing officer recommendation (`Approve`/`Reject`) with optional category/subcategory/duration fields. *(added 2026-06-11)* |
| sp_SaveOfficerDocument | Upload or soft-delete an officer document. `@Action` = 'Upload' or 'Delete'. `@DocumentStage` = 'Recommendation', 'Approval', or 'Rejection'. Delete sets `fldIsDeleted = 1`. *(added 2026-06-11)* |
| sp_SaveApprovalDecision | Upserts approving officer final decision (`Approved`/`Rejected`) with optional category/subcategory/duration. *(added 2026-06-11)* |
| sp_SaveAdditionalDocRequest | Manages additional document requests. `@Action` = 'Request' (insert), 'Received' (stamp fldReceivedAt), or 'Delete' (soft delete). *(added 2026-06-11)* |

### Page / List Queries

| Procedure | Purpose |
|---|---|
| proc_Page_VisaApplications | Paginated application list for officer queue |
| proc_Page_VisaApplications_Overview | Application summary and overview data |
| proc_Page_DeferredVisaApplications | Applications in Defer status |
| proc_Page_DeferredAndHoldVisaApplications | Applications in Defer & Hold status |
| proc_Page_RecommendationsVisaApplications | ⚠️ Needs verification |
| proc_Page_OfficialApplicationQueue | Officer queue grid. Updated to read from `vw_ApplicationQueueDetails`. Role detection via `Uganda_Portal.dbo.SecGroups` — non-admin sees Processing queue; Visa Approvals sees Approval queue; Developer/admin sees all non-terminal statuses. *(updated 2026-06-11)* |

### Laserfiche Integration

| Procedure | Purpose |
|---|---|
| proc_Laserfiche_getFormFile | Retrieves a single form file from Laserfiche |
| proc_Laserfiche_getFormFilesList | Retrieves list of form files |
| proc_Laserfiche_getFormFilesSingle | ⚠️ Unclear difference from getFormFile — needs verification |

### System / Diagram

`sp_alterdiagram`, `sp_creatediagram`, `sp_dropdiagram`, `sp_helpdiagrams`, `sp_helpdiagramdefinition`, `sp_renamediagram`, `sp_upgraddiagrams` — SQL Server SSMS diagram management.

---

---

## Section 11 — Views

| View | Purpose |
|---|---|
| vw_ActiveLookups | All active reference/lookup data — populates all dropdowns |
| vw_FullApplicationDetails | Complete single-row-per-application view |
| vw_VisaApplicationSummary | Summarised view for lists and dashboards |
| vw_PendingApplications | Applications awaiting officer action |
| vw_ApplicantFullDetails | Full applicant details with FK IDs resolved to display names |
| **vw_ApplicationQueueDetails** | **Full officer queue view. One row per application. Includes dual nationality columns, ApplicantCount (principal + family + group members), and latest assigned officer from tblVisaApplicationApprovalHistory. Used by proc_Page_OfficialApplicationQueue.** *(added 2026-06-11)* |
| **vw_ApplicationQueueImages** | **Passport image (from tblApplicantPersonData snapshot) and profile photo (from live tblPersonalProfileDetails record) per application. Returns HasPassportImage and HasProfileImage BIT flags.** *(added 2026-06-11)* |
| **vw_ApplicantBackgroundResponses** | **One row per question per applicant per application. CROSS JOINs all active tblBackgroundQuestions so all 5 questions appear even when unanswered. Returns IsAnswered and AllQuestionsAnswered flags. Used by officer processing and applicant portal review screens.** *(added 2026-06-11)* |
| vw_ApplicationQueue | ⚠️ Superseded by vw_ApplicationQueueDetails — verify if still in use |
| vw_VisaApplicationsOverview | ⚠️ Needs verification — likely dashboard counts |
| vw_VisaApplicationsOverviewTest | Test/dev version — likely not production |
| vw_VisaApplicationsPending | ⚠️ May overlap with vw_PendingApplications |
| vw_VisaApplicationsSubmitted | Applications in Submitted status |
| vw_VisaApplicationsSubmittedConsolidated | ⚠️ Needs verification |
| vw_VisaApplicationsSubmittedFormsTasks | ⚠️ Likely Laserfiche Forms integration |
| vw_VisaApplicationsApprove | Applications eligible for approval |
| vw_VisaApplicationsReject | Applications eligible for rejection |
| vw_VisaApplicationsDefer | Applications in Defer status |
| vw_VisaApplicationsDefer&Hold | Applications in Defer & Hold status |
| vw_VisaApplicationsRefer | Applications in Refer status |
| vw_PassportBase64Lookup | ⚠️ Returns passport image data — needs verification |
| vw_VisaApplicantDetails | ⚠️ May overlap with vw_ApplicantFullDetails |

---

---

## Changelog

### v2.1 — 2026-06-11

**Schema changes (ALTER TABLE on existing tables):**
- `tblApplicantPersonData` — added `fldDualNationality` (BIT NULL) and `fldOtherNationalityID` (INT NULL, FK → tblNationalities). Business rules enforced in `sp_RecordNewApplicantPersonData`.
- `tblApplicationOfficerDocuments` — added `fldIsDeleted` (BIT NOT NULL default 0), `fldDeletedBy` (NVARCHAR 200 NULL), `fldDeletedAt` (DATETIME2 NULL). Guarded with IF NOT EXISTS for idempotency.
- `tblApplicationOfficerComments` — added `fldCheckGroup` (VARCHAR 50 NULL) with CHECK constraint matching the 9 defined checklist sections. Guarded with IF NOT EXISTS.

**New tables (8):**
- `tblBackgroundQuestions` — lookup for BRD background questions with conditional sub-field flags
- `tblApplicantBackgroundResponses` — one response per question per applicant per application
- `tblApplicationChecklistReview` — officer checklist section results per queue stage
- `tblApplicationOfficerComments` — append-only officer comments per stage/section
- `tblApplicationRecommendation` — processing officer recommendation per applicant
- `tblApplicationOfficerDocuments` — officer-uploaded documents with soft delete
- `tblApplicationApprovalDecision` — approving officer final decision per applicant
- `tblApplicationAdditionalDocRequests` — officer requests for additional applicant documents

**Seed data:**
- 5 background questions inserted into `tblBackgroundQuestions`: VISA_DENIED, DEPORTED, CONVICTED, CRIMINAL_PROCEEDINGS, MENTAL_ILLNESS

**New views (3):**
- `vw_ApplicationQueueDetails` — full officer queue view including dual nationality
- `vw_ApplicationQueueImages` — passport and profile photo data per application
- `vw_ApplicantBackgroundResponses` — cross-joined question × applicant response view

**New stored procedures (10):**
- `sp_SaveChecklistReview`, `sp_SaveOfficerComment`, `sp_SaveRecommendation`, `sp_SaveOfficerDocument`, `sp_SaveApprovalDecision`, `sp_SaveAdditionalDocRequest`
- `sp_UpsertFamilyMemberDocument`, `sp_UpsertGroupMemberDocument`
- `sp_SaveBackgroundResponse`, `sp_GetBackgroundResponse`

**Updated stored procedures (3):**
- `sp_RecordNewApplicantPersonData` — dual nationality parameters added
- `sp_RecordVisaApplication` — updated to current pattern (CREATE OR ALTER)
- `proc_Page_OfficialApplicationQueue` — rewritten to use `vw_ApplicationQueueDetails`

**Document structure:**
- New Section 7 — Officer Processing Tables inserted
- Sections 7–10 renumbered to 8–11
- Table Inventory updated

---

### v2.0 — June 2026

Full DDL-verified corrections. See `SQL_ERD_Design.md` changelog for the complete list of changes.

**Summary of breaking changes:**
- Database name corrected: `Uganda_Forms` → `Uganda_Visa_Applications`
- Application-layer snapshot tables removed (did not exist)
- `tblPersonalProfileDetails` introduced as central person hub
- `tblFamilyMembers` and `tblGroupMembers` rewritten as lean junction tables
- `tblApplicantDocuments` renamed to `tblPrincipleDocuments`
- `tblVisaApplicationSubmitted` corrected with 15+ missing fields
- 6 new tables added: `tblGroupTypes`, `tblGroupMemberDocuments`, `tblGuardian`, `tblPermitDocumentRequirement`, `tblApplicationWorkflowType`, `tblApplicationWorkflowRequest`

---

*Last updated: 2026-06-11 — v2.1*
*Database: Uganda_Visa_Applications*
*Classification: Confidential*
