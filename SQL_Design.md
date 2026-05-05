# Uganda Unified Border Management — Database Reference

**Database:** `Uganda_Forms`
**Version:** 1.0 — April 2026
**Classification:** Confidential / In Commercial Confidence

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Section 1 — Reference / Lookup Tables](#section-1--reference--lookup-tables)
4. [Section 2 — User Identity Tables](#section-2--user-identity-tables)
5. [Section 3 — Family Management Tables](#section-3--family-management-tables)
6. [Section 4 — Group Management Tables](#section-4--group-management-tables)
7. [Section 5 — Application Master Tables](#section-5--application-master-tables)
8. [Section 6 — Application Person Data](#section-6--application-person-data)
9. [Section 7 — Application Family & Group Member Tables](#section-7--application-family--group-member-tables)
10. [Section 8 — Objects Requiring Verification](#section-8--objects-requiring-verification)
11. [Section 9 — Stored Procedures](#section-9--stored-procedures)
12. [Section 10 — Views](#section-10--views)

---

## Overview

This document describes the full database schema for the Uganda Unified Border Management Client Portal. It covers all tables, their purpose, their relationships, and all stored procedures and views. It is intended as the primary reference for ERD creation and onboarding of new developers.

The database supports the following end-to-end workflow:

```
Portal Registration
      ↓
Upload Passport + Complete Principal Profile
      ↓
Manage Family Unit (pre-application)
      ↓
Manage Groups (pre-application)
      ↓
Start New Application → Select Type / Category / Subcategory
      ↓
Include Family / Group Members
      ↓
Upload Documents per Applicant
      ↓
Submit Application
      ↓
Officer Processing Queue → Approve / Reject / Defer / Refer
```

---

## Architecture Summary

The schema is divided into two layers:

**Pre-Application Layer** — data the user manages on their account before starting any application. This data is editable at any time.

| Table Group | Tables |
|---|---|
| User Identity | tblSecUserMap, tblVisaApplicationPassport, tblVisaApplicationPassportDetails, tblVisaApplicationNewPrincipalInfo |
| Family Management | tblFamilies, tblFamilyMembers, tblFamilyMemberDocuments |
| Group Management | tblGroups, tblGroupMembers, tblGroupDocuments |
| Reference / Config | tblSettings, tblApplicationTypes, tblApplicationCategories, tblApplicationSubcategories, tblDocumentTypes, tblNationalities, tblPassportTypes, tblGenders, tblMaritalStatuses, tblGuardianRelationships, tblGroupMemberTypes, tblPurposesOfVisit, tblPointsOfEntry, tblImmigrationStatuses, tblReasons, tblDepartments |

**Application Layer** — data locked in at the time an application is created or submitted. Changes to pre-application data do not affect submitted applications.

| Table Group | Tables |
|---|---|
| Application Master | tblVisaApplicationSubmitted, tblVisaApplicationApprovalHistory, tblSupervisorNotifications |
| Applicant Data | tblApplicantPersonData, tblApplicantDocuments |
| Family Members on Application | tblApplicationFamilyMembers, tblApplicationFamilyMemberDocuments |
| Group Members on Application | tblApplicationGroups, tblApplicationGroupMembers, tblApplicationGroupMemberDocuments |

---

## Section 1 — Reference / Lookup Tables

These tables contain static configuration data. They populate dropdowns, drive validation rules, and define the allowed values for fields across the system. They contain no user-generated transaction data.

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

**Relationships:** Standalone — no FK relationships. Read by application logic and stored procedures.

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

**Relationships:**
- FK to `tblApplicationTypes` via `fldApplicationTypeID`
- One category → many subcategories (`tblApplicationSubcategories`)

**Example values (Visa):** Ordinary/Tourist Visa, East African Tourist Visa, Transit, Multiple Entry, Diplomatic or Official

---

### tblApplicationSubcategories

**Purpose:** Subcategories within each category. Holds price per person and links to mandatory documents. The price stored here is automatically applied to the application when selected.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationCategoryID | FK → tblApplicationCategories |
| fldName | Display name |
| fldCode | Short code |
| fldPricePerPerson | Cost in fldCurrency |
| fldCurrency | Currency code (default USD) |
| fldIsActive | Controls visibility |

**Relationships:**
- FK to `tblApplicationCategories` via `fldApplicationCategoryID`
- One subcategory → many mandatory documents (`tblSubcategoryMandatoryDocuments`)

---

### tblDocumentTypes

**Purpose:** Master list of all document types used across the system — for uploads, mandatory document lists, and dropdowns.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldName | Display name |
| fldCode | Short code (e.g. `FLIGHT`, `PHOTO`) |
| fldIsActive | Controls visibility |
| fldSortOrder | Display order |

**Relationships:** Referenced by `tblSubcategoryMandatoryDocuments`, `tblFamilyMemberDocuments`, `tblGroupDocuments`, `tblApplicantDocuments`

**Example values:** Passport, Bank Statement, Hotel Booking, Return Flight Ticket, Profile Photo, Yellow Fever Certificate

---

### tblSubcategoryMandatoryDocuments

**Purpose:** Junction table defining which document types are mandatory for each subcategory. Drives the mandatory documents display list in the application start screen.

| Field | Description |
|---|---|
| fldID | Primary key |
| fldApplicationSubcategoryID | FK → tblApplicationSubcategories |
| fldDocumentTypeID | FK → tblDocumentTypes |

**Relationships:** Many-to-many resolver between `tblApplicationSubcategories` and `tblDocumentTypes`

---

### tblNationalities

**Purpose:** Full country list with visa exemption and EAC membership indicators. Used for nationality, country of birth, and country of residence dropdowns across the system.

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

**Relationships:** Referenced by `tblFamilyMembers` and `tblApplicantPersonData` for both `fldNationalityID` and `fldCountryOfResidenceID`

---

### tblPassportTypes

**Purpose:** Valid passport type values.

**Relationships:** Referenced by `tblFamilyMembers`, `tblApplicantPersonData`

**Values:** Ordinary, Diplomatic, Official/Service, ID Card, Other

---

### tblGenders

**Purpose:** Valid gender values.

**Relationships:** Referenced by `tblFamilyMembers`, `tblApplicantPersonData`

**Values:** Male (M), Female (F)

---

### tblMaritalStatuses

**Purpose:** Valid marital status values.

**Relationships:** Referenced by `tblFamilyMembers`, `tblApplicantPersonData`, `tblVisaApplicationNewPrincipalInfo`

**Values:** Single, Married, Divorced, Widowed, Separated, Other

---

### tblGuardianRelationships

**Purpose:** Valid legal guardian relationship types — used when a minor is added to a family or application.

**Relationships:** Referenced by `tblFamilyMembers`, `tblApplicationFamilyMembers`

**Values:** Parent, Court Appointed Guardian, Testamentary Guardian, Foster Parent

---

### tblGroupMemberTypes

**Purpose:** Defines the role a member plays within a group or on an application.

**Relationships:** Referenced by `tblGroupMembers`, `tblApplicationFamilyMembers`, `tblApplicationGroupMembers`

**Values:** Principal, Responsible, Group Member

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
| fldType | Airport, Land, or Water |
| fldRegion | Geographic region within Uganda |

**Relationships:** Referenced by `tblApplicantPersonData` via `fldPointOfEntryID`

**Example values:** Entebbe International Airport, Malaba Border Post, Katuna Border Post, Port Bell

---

### tblImmigrationStatuses

**Purpose:** Immigration status of the applicant in their country of residence.

**Relationships:** Referenced by `tblApplicantPersonData`, `tblFamilyMembers`

**Values:** Citizen, Student, Tourist, Work, Other

---

### tblReasons

**Purpose:** Unified reasons table covering all reason dropdown lists across the system. A single `fldReasonType` discriminator column identifies which list each row belongs to — avoiding ten near-identical separate tables.

| Field | Description |
|---|---|
| fldReasonType | Discriminator — see types below |
| fldName | Display name |
| fldCode | Short code |

**Reason types:** FamilyRemoval, LeaveGroup, LeaveFamily, RemovalFromFamily, RemovalFromGroup, RemovalFromApplication, Cancellation, Referral, Defer, ApplicantRemoval

**Relationships:** Referenced by `tblVisaApplicationSubmitted`, `tblApplicationFamilyMembers`, `tblApplicationGroupMembers`, `tblFamilyMembers`, `tblGroupMembers`, `tblVisaApplicationApprovalHistory`

---

### tblDepartments

**Purpose:** Immigration departments — used when an application is referred to a specific department.

**Relationships:** Referenced by `tblVisaApplicationSubmitted` via `fldReferDepartmentID` and `tblVisaApplicationApprovalHistory` via `fldDepartmentID`

---

---

## Section 2 — User Identity Tables

These tables manage the portal user's identity and their initial profile data completed during registration.

---

### tblSecUserMap

**Purpose:** Permanent identity bridge between the portal user account (`Uganda_Portal.dbo.SecUsers`) and all `Uganda_Forms` transaction data. The `fldUserKey` GUID is the stable identity used as a FK across every transaction table. It never changes even when the portal authentication token rotates.

| Field | Description |
|---|---|
| fldSecUserID | FK → Uganda_Portal.dbo.SecUsers.ID |
| fldUserKey | Permanent UNIQUEIDENTIFIER — used as FK everywhere |
| fldDisplayName | Snapshot of user's display name |
| fldCreatedAt | When the map entry was first created |
| fldLastSeenAt | Last activity timestamp |

**Relationships:** Central identity hub — virtually every transaction table in Uganda_Forms has a FK back to this table via `fldUserKey`. One entry is created the first time a user submits passport details.

---

### tblVisaApplicationPassport

**Purpose:** Stores the passport image (base64) uploaded during step 1 of account registration. One record per portal user.

| Field | Description |
|---|---|
| fldUUID | Stable UUID used to link to passport details |
| fldPortalUserID | FK → Uganda_Portal.dbo.SecUsers |
| fldBase64 | Raw base64 image string |
| fldFileExt | File extension (.jpg, .pdf, etc.) |
| fldBase64Converted | Computed — full data URI for rendering |
| fldStatus | Processing status of the upload |

**Relationships:**
- FK to `Uganda_Portal.dbo.SecUsers` via `fldPortalUserID`
- Linked to `tblVisaApplicationPassportDetails` via `fldUUID`

---

### tblVisaApplicationPassportDetails

**Purpose:** Personal details extracted from the passport — entered during step 2 of account registration. One record per portal user.

| Field | Description |
|---|---|
| fldUUID | FK → tblVisaApplicationPassport.fldUUID |
| fldUserKey | FK → tblSecUserMap |
| fldFirstName, fldSurname | Personal name |
| fldDOB | Date of birth |
| fldGender, fldNationality | Demographics |
| fldPassportNumber | Passport identifier |
| fldPassportExpDate | Expiry date |

**Relationships:**
- FK to `tblVisaApplicationPassport` via `fldUUID`
- FK to `tblSecUserMap` via `fldUserKey`

---

### tblVisaApplicationNewPrincipalInfo

**Purpose:** Contact and residence details for the principal — entered during step 3 of account registration. One record per portal user.

| Field | Description |
|---|---|
| fldUserKey | FK → tblSecUserMap |
| fldCountryOfBirth, fldPlaceOfBirth | Birth details |
| fldMaritalStatus | Marital status |
| fldCurrentResidentialAdd | Home address |
| fldCityOfResidence, fldCountryOfResidence | Location |
| fldCountryPhoneCode, fldPhoneNumber | Contact |
| fldFullPhoneNumber | Computed — concatenated phone |

**Relationships:** FK to `tblSecUserMap` via `fldUserKey`

> Together, `tblVisaApplicationPassport`, `tblVisaApplicationPassportDetails`, and `tblVisaApplicationNewPrincipalInfo` represent the complete principal profile captured at registration.

---

---

## Section 3 — Family Management Tables

These tables allow the principal to build and manage their family unit before starting any application. Data here is editable at any time — changes do not affect already-submitted applications.

---

### tblFamilies

**Purpose:** A family unit created and owned by the principal. One family per principal (enforced by UNIQUE constraint on `fldOwnerKey`).

| Field | Description |
|---|---|
| fldOwnerKey | FK → tblSecUserMap — the principal who created the family |
| fldIsActive | Soft delete flag |

**Relationships:**
- FK to `tblSecUserMap` via `fldOwnerKey`
- One family → many members (`tblFamilyMembers`)

---

### tblFamilyMembers

**Purpose:** Individual family members added to a family unit. Holds complete personal and passport data for each member. Members may or may not have their own portal account — `fldMemberUserKey` is nullable to support minors and dependants without accounts.

| Field | Description |
|---|---|
| fldFamilyID | FK → tblFamilies |
| fldMemberUserKey | FK → tblSecUserMap (nullable) |
| fldIsMinor | Computed from DOB vs AdultAge setting |
| fldGuardianRelID | FK → tblGuardianRelationships (if minor) |
| fldGuardianUserKey | FK → tblSecUserMap — responsible adult |
| fldPassportExpired | Computed — is passport currently expired |
| fldPassportExpiringSoon | Computed — expires within 6-month buffer |
| fldPassportBase64Converted | Computed — full data URI for rendering |
| fldStatus | Active, Removed, or Left |
| fldRemovalReasonID | FK → tblReasons |

**Relationships:**
- FK to `tblFamilies`, `tblSecUserMap` (×3), `tblGuardianRelationships`
- FK to all personal data lookups: `tblGenders`, `tblNationalities`, `tblMaritalStatuses`, `tblPassportTypes`, `tblImmigrationStatuses`
- Referenced by `tblFamilyMemberDocuments`, `tblGroupMembers`, `tblApplicationFamilyMembers`, `tblApplicationGroupMembers`

---

### tblFamilyMemberDocuments

**Purpose:** Documents uploaded against a specific family member — independent of any application. These are the source documents that are referenced (and their data copied) when a member is included on an application.

| Field | Description |
|---|---|
| fldFamilyMemberID | FK → tblFamilyMembers |
| fldDocumentTypeID | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other |
| fldBase64Converted | Computed — full data URI |

**Relationships:**
- FK to `tblFamilyMembers`, `tblDocumentTypes`
- Referenced by `tblApplicationFamilyMemberDocuments` via `fldFamilyMemberDocumentID` for traceability

---

---

## Section 4 — Group Management Tables

These tables allow the principal to create and manage named groups before starting any application. One principal can own multiple groups.

---

### tblGroups

**Purpose:** A named group created by the principal. Holds group type and contact person details as per BRD section 25.

| Field | Description |
|---|---|
| fldOwnerKey | FK → tblSecUserMap |
| fldGroupName | Display name of the group |
| fldGroupType | Type of group (e.g. Tour Group, Corporate, School) |
| fldContactFirstName, fldContactSurname | Contact person |
| fldContactPhoneCode, fldContactPhoneNumber | Contact phone |
| fldContactFullPhone | Computed — concatenated phone |

**Relationships:**
- FK to `tblSecUserMap` via `fldOwnerKey`
- One group → many members (`tblGroupMembers`)
- One group → many documents (`tblGroupDocuments`)
- Referenced by `tblApplicationGroups` via `fldGroupID` for traceability

---

### tblGroupMembers

**Purpose:** Links family members into a group. A member must already exist in `tblFamilyMembers` — their personal and passport data lives there and is not duplicated here.

| Field | Description |
|---|---|
| fldGroupID | FK → tblGroups |
| fldFamilyMemberID | FK → tblFamilyMembers |
| fldMemberTypeID | FK → tblGroupMemberTypes |
| fldStatus | Active, Removed, or Left |
| fldRemovalReasonID | FK → tblReasons |

**Relationships:** FK to `tblGroups`, `tblFamilyMembers`, `tblGroupMemberTypes`, `tblReasons`

---

### tblGroupDocuments

**Purpose:** Documents common to all members of a group — uploaded at group level rather than per member. Independent of any application.

| Field | Description |
|---|---|
| fldGroupID | FK → tblGroups |
| fldDocumentTypeID | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other |
| fldBase64Converted | Computed — full data URI |

**Relationships:**
- FK to `tblGroups`, `tblDocumentTypes`
- Referenced by `tblApplicationGroupMemberDocuments` via `fldGroupDocumentID` for traceability

---

---

## Section 5 — Application Master Tables

The core application transaction tables. `tblVisaApplicationSubmitted` is the central table — all other application tables FK back to it.

---

### tblVisaApplicationSubmitted

**Purpose:** Master application record — one row per application. Tracks the full lifecycle from Draft through to Approved/Rejected.

| Field | Description |
|---|---|
| fldApplicationRef | Computed — human-readable reference e.g. UGA-00000001 |
| fldUserKey | FK → tblSecUserMap — the principal applicant |
| fldApplicationTypeID | FK → tblApplicationTypes |
| fldApplicationCategoryID | FK → tblApplicationCategories |
| fldApplicationSubcatID | FK → tblApplicationSubcategories |
| fldIsFamilyApplication | Flag — includes family members |
| fldIsGroupApplication | Flag — includes group members |
| fldGroupID | FK → tblApplicationGroups (when group application) |
| fldStatus | Full lifecycle status — see values below |
| fldQueue | Processing or Approval — tracks which officer queue |
| fldDeferCount | Incremented each time application is deferred |
| fldDeferReasonID | FK → tblReasons (type=Defer) |
| fldCancelReasonID | FK → tblReasons (type=Cancellation) |
| fldReferReasonID | FK → tblReasons (type=Referral) |
| fldReferDepartmentID | FK → tblDepartments |
| fldPaymentStatus | Unpaid, Paid, Waived, Refunded |
| fldSubmittedAt | Write-once — stamped when first submitted |

**Status values:** Draft → Submitted → Awaiting Processing → Under Review → Awaiting Approval → Approved / Rejected / Defer / Defer & Hold / Refer / Withdrawn / Cancelled

**Relationships:**
- FK to `tblSecUserMap`, `tblApplicationTypes`, `tblApplicationCategories`, `tblApplicationSubcategories`, `tblApplicationGroups`, `tblReasons` (×3), `tblDepartments`
- Referenced by all application child tables as the anchor FK

---

### tblVisaApplicationApprovalHistory

**Purpose:** Append-only audit trail of every status change on an application. Auto-populated by a trigger on `tblVisaApplicationSubmitted` when `fldStatus` changes. Records are never updated.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldAction | New status value |
| fldPreviousStatus | What status was before this change |
| fldQueue | Which queue at time of action |
| fldReasonID | FK → tblReasons |
| fldActionedBy | Officer username or SYSTEM_USER |
| fldActionedAt | Timestamp |
| fldDepartmentID | FK → tblDepartments (for referrals) |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblReasons`, `tblDepartments`

---

### tblSupervisorNotifications

**Purpose:** Outbox queue for supervisor alert emails. Populated automatically by a trigger when an application's `fldDeferCount` exceeds the `MaxDeferCount` setting. Polled by the application layer to send emails.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldDeferCount | Count at time of trigger |
| fldIsSent | 0 = pending, 1 = email dispatched |
| fldSentAt | When the email was sent |

**Relationships:** FK to `tblVisaApplicationSubmitted`

---

---

## Section 6 — Application Person Data

Applicant-level data captured per person directly on the application.

---

### tblApplicantPersonData

**Purpose:** Complete personal, passport, contact, and travel background data for the principal applicant. Covers BRD sections 8.3.7–8.3.10. One record per applicant per application.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserKey | FK → tblSecUserMap |
| fldIsMinor | Computed — based on DOB vs AdultAge setting |
| fldPassportExpired | Computed — live check against today |
| fldPassportExpiringSoon | Computed — within 6-month buffer |
| fldPassportBase64Converted | Computed — full data URI |
| fldFullPhoneNumber | Computed — concatenated dial code + number |
| fldGenderID | FK → tblGenders |
| fldNationalityID | FK → tblNationalities |
| fldMaritalStatusID | FK → tblMaritalStatuses |
| fldPassportTypeID | FK → tblPassportTypes |
| fldCountryOfResidenceID | FK → tblNationalities |
| fldImmigrationStatusID | FK → tblImmigrationStatuses |
| fldPurposeOfVisitID | FK → tblPurposesOfVisit |
| fldPointOfEntryID | FK → tblPointsOfEntry |
| fldDateOfArrival | Planned arrival date |
| fldDurationOfStayDays | Planned length of stay |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblSecUserMap`, and all personal data lookup tables

---

### tblApplicantDocuments

**Purpose:** Documents uploaded by the principal applicant against their application. Tracks both typed documents (from `tblDocumentTypes`) and free-text other document types.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldUserKey | FK → tblSecUserMap |
| fldDocumentTypeID | FK → tblDocumentTypes |
| fldOtherDocTypeName | Free text when type = Other |
| fldBase64Converted | Computed — full data URI |
| fldIsIncludedInApp | Whether this doc is formally part of the submission |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblSecUserMap`, `tblDocumentTypes`

---

---

## Section 7 — Application Family & Group Member Tables

When a principal includes family or group members on an application, their data is copied into these tables at that point in time. This ensures submitted applications are a permanent historical record — subsequent edits to `tblFamilyMembers` or `tblGroups` have no effect on previously submitted applications.

---

### tblApplicationGroups

**Purpose:** Records the group details on a specific application. Data is copied from `tblGroups` at application time. `fldGroupID` retains a nullable traceability link to the source group.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted (UNIQUE — one group per application) |
| fldGroupID | FK → tblGroups (nullable — traceability only) |
| fldOwnerKey | FK → tblSecUserMap |
| fldGroupName | Copied at application time |
| fldGroupType | Copied at application time |
| fldContactFirstName, fldContactSurname | Copied at application time |
| fldContactFullPhone | Computed |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblGroups` (nullable), `tblSecUserMap`

---

### tblApplicationFamilyMembers

**Purpose:** Family members included on a specific application. All personal and passport data is stored directly in this table as it was when the member was added. `fldFamilyMemberID` provides a nullable traceability link back to the source `tblFamilyMembers` record.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldFamilyMemberID | FK → tblFamilyMembers (nullable — traceability) |
| fldMemberUserKey | FK → tblSecUserMap |
| fldMemberTypeID | FK → tblGroupMemberTypes |
| fldIsMinor | Copied at inclusion time |
| fldGuardianRelID | FK → tblGuardianRelationships |
| Personal data fields | FirstName, Surname, DOB, Gender, Nationality, etc. — all stored as values |
| Passport data fields | PassportType, PassportNumber, PassportExpDate, etc. — all stored as values |
| fldPassportBase64Converted | Stored as already-converted data URI |
| fldPaymentStatus | Per-member payment tracking |
| fldStatus | Active, Removed, Left |
| fldRemovalReasonID | FK → tblReasons |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblFamilyMembers` (nullable), `tblSecUserMap`, `tblGroupMemberTypes`, `tblGuardianRelationships`, `tblReasons`

---

### tblApplicationGroupMembers

**Purpose:** Group members included on a specific application. Same pattern as `tblApplicationFamilyMembers` — all data stored as values at inclusion time for historical integrity.

| Field | Description |
|---|---|
| fldGroupID | FK → tblApplicationGroups |
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldFamilyMemberID | FK → tblFamilyMembers (nullable — traceability) |
| fldMemberUserKey | FK → tblSecUserMap |
| fldMemberTypeID | FK → tblGroupMemberTypes |
| Personal + passport data fields | All stored as values — same fields as tblApplicationFamilyMembers |
| fldGuardianRelationship | Stored as plain text value (not FK) |
| fldPaymentStatus | Per-member payment tracking |
| fldStatus | Active, Removed, Left |
| fldRemovalReasonID | FK → tblReasons |

**Relationships:** FK to `tblApplicationGroups`, `tblVisaApplicationSubmitted`, `tblFamilyMembers` (nullable), `tblSecUserMap`, `tblGroupMemberTypes`, `tblReasons`

---

### tblApplicationFamilyMemberDocuments

**Purpose:** Documents included on an application for a specific family member. Document content (base64, file type, name) is stored as values at time of inclusion. `fldFamilyMemberDocumentID` provides nullable traceability back to the source document.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicationFamilyMemberID | FK → tblApplicationFamilyMembers |
| fldFamilyMemberDocumentID | FK → tblFamilyMemberDocuments (nullable — traceability) |
| fldDocumentTypeName | Stored as text value — not a FK |
| fldBase64Converted | Stored as already-converted data URI |
| fldUploadedAt | When included on the application |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicationFamilyMembers`, `tblFamilyMemberDocuments` (nullable)

---

### tblApplicationGroupMemberDocuments

**Purpose:** Documents included on an application for a specific group member. Can trace back to either a personal family member document or a shared group-level document via two separate nullable FK columns.

| Field | Description |
|---|---|
| fldApplicationID | FK → tblVisaApplicationSubmitted |
| fldApplicationGroupMemberID | FK → tblApplicationGroupMembers |
| fldFamilyMemberDocumentID | FK → tblFamilyMemberDocuments (nullable — personal doc traceability) |
| fldGroupDocumentID | FK → tblGroupDocuments (nullable — group doc traceability) |
| fldDocumentTypeName | Stored as text value — not a FK |
| fldBase64Converted | Stored as already-converted data URI |

**Relationships:** FK to `tblVisaApplicationSubmitted`, `tblApplicationGroupMembers`, `tblFamilyMemberDocuments` (nullable), `tblGroupDocuments` (nullable)

---

---

## Section 8 — Objects Requiring Verification

The following objects exist in the database but their exact purpose or current design needs to be confirmed before including in the ERD.

| Object | Type | Note |
|---|---|---|
| VisaApplication | Table | Missing `tbl` prefix — unclear if this is a table, view alias, or legacy object |
| VisaApplicationStatus | Table | Missing `tbl` prefix — may be a status lookup or legacy object |
| tblApplicationApplicants | Table | May be a duplicate or earlier version of tblApplicationFamilyMembers / tblApplicationGroupMembers |
| tblVisaApplicationReference | Table | May store or sequence application reference numbers — possibly superseded by computed column on tblVisaApplicationSubmitted |
| sysdiagrams | Table | SQL Server system table for SSMS diagram definitions — not part of application schema |

---

---

## Section 9 — Stored Procedures

### Registration & Profile

| Procedure | Purpose |
|---|---|
| proc_Records_PassportDocument | Upserts passport image record in tblVisaApplicationPassport |
| sp_RecordVisaApplicationPassportDetails | Upserts passport personal details in tblVisaApplicationPassportDetails + creates tblSecUserMap entry on first call |
| sp_RecordVisaApplicationNewPrincipalInfo | Upserts principal contact/residence info in tblVisaApplicationNewPrincipalInfo |
| sp_GetUserPassportImageDetails | Returns passport image base64 for a user by token |
| sp_GetApplicantProfilePic | Returns profile photo base64 by ApplicationID |
| sp_GetApplicantReturnTicketImage | Returns return flight ticket base64 by ApplicationID |

### Application Lifecycle

| Procedure | Purpose |
|---|---|
| sp_RecordNewVisaApplication | ⚠️ Needs verification — may be earlier version of sp_RecordVisaApplication |
| sp_RecordVisaApplication | Upserts master application record in tblVisaApplicationSubmitted |
| sp_CreateVisaApplicationReference | Creates the application reference number |
| sp_RecordNewApplicantPersonData | Upserts applicant person data in tblApplicantPersonData |
| sp_RecordApplicantDocument | Upserts applicant document in tblApplicantDocuments |

### Officer Processing

| Procedure | Purpose |
|---|---|
| proc_VisaApplication_GetById | Returns full application details by ID |
| proc_VisaApplication_Approve | Approves application — updates status, writes approval history |
| proc_VisaApplication_Reject | Rejects application — updates status, writes rejection history |
| proc_VisaApplication_Defer | Defers application back to applicant — updates status, increments defer count |
| proc_VisaApplication_DeferAndHold | Defer & Hold — preserves originating queue for correct routing on resubmit |
| proc_VisaApplication_Refer | Refers application to another department or officer |

### Page / List Queries

| Procedure | Purpose |
|---|---|
| proc_Page_VisaApplications | Returns paginated application list for officer queue |
| proc_Page_VisaApplications_Overview | Returns application summary and overview data |
| proc_Page_DeferredVisaApplications | Returns applications in Defer status |
| proc_Page_DeferredAndHoldVisaApplications | Returns applications in Defer & Hold status |
| proc_Page_RecommendationsVisaApplications | ⚠️ Needs verification — possibly referral recommendations |

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

## Section 10 — Views

| View | Purpose |
|---|---|
| vw_ActiveLookups | Single view returning all active reference/lookup data — used to populate all dropdowns from one call |
| vw_FullApplicationDetails | Complete single-row-per-application view joining all tables — used for application detail screens |
| vw_VisaApplicationSummary | Summarised application view for lists and dashboards |
| vw_PendingApplications | Filtered view of applications awaiting officer action |
| vw_ApplicantFullDetails | Full resolved applicant details with all FK IDs replaced by display names |
| vw_ApplicationQueue | ⚠️ Needs verification — likely officer processing queue view |
| vw_VisaApplicationsOverview | ⚠️ Needs verification — likely dashboard summary counts |
| vw_VisaApplicationsOverviewTest | ⚠️ Test/development version of overview — likely not production |
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

*Last updated: May 2026*
*Database: Uganda_Forms*
*Classification: Confidential*