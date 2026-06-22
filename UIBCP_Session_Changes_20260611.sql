-- =============================================================================
-- UIBCP SESSION CHANGES — 2026-06-11
-- =============================================================================
-- This script documents ALL schema changes, new tables, new views, new stored
-- procedures, and updated stored procedures produced in this development session.
-- Pass to Claude in VS Code to update the database reference documentation.
--
-- CONTENTS
-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 : SCHEMA CHANGES (ALTER TABLE — existing tables)
--   1.1  tblApplicantPersonData     — dual nationality columns
--   1.2  tblApplicationOfficerDocuments — soft delete columns
--   1.3  tblApplicationOfficerComments  — check group column
--
-- SECTION 2 : NEW TABLES
--   2.1  tblBackgroundQuestions
--   2.2  tblApplicantBackgroundResponses
--   2.3  tblApplicationChecklistReview
--   2.4  tblApplicationOfficerComments
--   2.5  tblApplicationRecommendation
--   2.6  tblApplicationOfficerDocuments
--   2.7  tblApplicationApprovalDecision
--   2.8  tblApplicationAdditionalDocRequests
--
-- SECTION 3 : SEED DATA
--   3.1  tblBackgroundQuestions — 5 BRD background questions
--
-- SECTION 4 : NEW VIEWS
--   4.1  vw_ApplicationQueueDetails     (full — includes dual nationality)
--   4.2  vw_ApplicationQueueImages
--   4.3  vw_ApplicantBackgroundResponses
--
-- SECTION 5 : NEW STORED PROCEDURES
--   5.1  sp_SaveChecklistReview
--   5.2  sp_SaveOfficerComment           (with fldCheckGroup)
--   5.3  sp_SaveRecommendation
--   5.4  sp_SaveOfficerDocument          (with soft delete)
--   5.5  sp_SaveApprovalDecision
--   5.6  sp_SaveAdditionalDocRequest
--   5.7  sp_UpsertFamilyMemberDocument
--   5.8  sp_UpsertGroupMemberDocument
--   5.9  sp_SaveBackgroundResponse
--   5.10 sp_GetBackgroundResponse
--   5.11 sp_RecordNewApplicantPersonData
--   5.12 sp_RecordVisaApplication
--
-- SECTION 6 : UPDATED STORED PROCEDURES
--   6.1  proc_Page_OfficialApplicationQueue — aligned to vw_ApplicationQueueDetails
-- =============================================================================

USE [Uganda_Visa_Applications]
GO

-- =============================================================================
-- SECTION 1: SCHEMA CHANGES — ALTER TABLE ON EXISTING TABLES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.1  tblApplicantPersonData
--      Added: fldDualNationality (BIT), fldOtherNationalityID (INT FK)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE [dbo].[tblApplicantPersonData]
    ADD [fldDualNationality]        BIT     NULL,
        [fldOtherNationalityID]     INT     NULL
            CONSTRAINT [FK_ApplicantPersonData_OtherNationality]
            FOREIGN KEY REFERENCES [dbo].[tblNationalities] ([fldID]);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.2  tblApplicationOfficerDocuments
--      Added: fldIsDeleted (BIT), fldDeletedBy (NVARCHAR), fldDeletedAt (DATETIME2)
--      Run once — guarded by IF NOT EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE  object_id = OBJECT_ID('dbo.tblApplicationOfficerDocuments')
    AND    name      = 'fldIsDeleted'
)
BEGIN
    ALTER TABLE [dbo].[tblApplicationOfficerDocuments]
        ADD [fldIsDeleted]  BIT           NOT NULL
                CONSTRAINT [DF_AppOfficerDocs_IsDeleted] DEFAULT 0,
            [fldDeletedBy]  NVARCHAR(200) NULL,
            [fldDeletedAt]  DATETIME2     NULL;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.3  tblApplicationOfficerComments
--      Added: fldCheckGroup (VARCHAR) — links comment to checklist section
--      Run once — guarded by IF NOT EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE  object_id = OBJECT_ID('dbo.tblApplicationOfficerComments')
    AND    name      = 'fldCheckGroup'
)
BEGIN
    ALTER TABLE [dbo].[tblApplicationOfficerComments]
        ADD [fldCheckGroup] VARCHAR(50) NULL
            CONSTRAINT [CK_AppOfficerComments_CheckGroup]
            CHECK ([fldCheckGroup] IN (
                'Personal', 'Passport', 'Travel', 'Contact', 'Background',
                'MandatoryDocuments', 'PassportPhoto', 'ReturnTicket',
                'AdditionalDocuments'
            ) OR [fldCheckGroup] IS NULL);
END
GO


-- =============================================================================
-- SECTION 2: NEW TABLES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.1  tblBackgroundQuestions
--      Lookup table — defines each background question and its conditional
--      sub-field requirements. Populated by seed data in Section 3.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblBackgroundQuestions]
(
    [fldID]             INT             NOT NULL IDENTITY(1,1),
    [fldCode]           VARCHAR(50)     NOT NULL,
    [fldQuestionText]   NVARCHAR(300)   NOT NULL,
    [fldHasCountry]     BIT             NOT NULL    DEFAULT 0,
    [fldHasDate]        BIT             NOT NULL    DEFAULT 0,
    [fldHasReason]      BIT             NOT NULL    DEFAULT 0,
    [fldHasDoctorName]  BIT             NOT NULL    DEFAULT 0,
    [fldHasDiagnosis]   BIT             NOT NULL    DEFAULT 0,
    [fldSortOrder]      INT             NOT NULL    DEFAULT 0,
    [fldIsActive]       BIT             NOT NULL    DEFAULT 1,
    [fldCreatedAt]      DATETIME2       NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblBackgroundQuestions]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [UQ_BackgroundQuestions_Code]
        UNIQUE ([fldCode])
)
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.2  tblApplicantBackgroundResponses
--      One row per question per applicant per application.
--      Sub-fields only populated when fldAnswer = 1 (Yes).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicantBackgroundResponses]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NOT NULL,
    [fldQuestionID]             INT             NOT NULL,
    [fldAnswer]                 BIT             NOT NULL,
    [fldCountry]                NVARCHAR(100)   NULL,
    [fldDate]                   DATE            NULL,
    [fldReason]                 NVARCHAR(500)   NULL,
    [fldDoctorName]             NVARCHAR(200)   NULL,
    [fldDiagnosis]              NVARCHAR(500)   NULL,
    [fldCreatedAt]              DATETIME2       NOT NULL    DEFAULT SYSUTCDATETIME(),
    [fldUpdatedAt]              DATETIME2       NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicantBackgroundResponses]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [UQ_ApplicantBackgroundResponses_Unique]
        UNIQUE ([fldApplicationID], [fldApplicantPersonDataID], [fldQuestionID]),

    CONSTRAINT [FK_AppBackgroundResp_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppBackgroundResp_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID]),

    CONSTRAINT [FK_AppBackgroundResp_Question]
        FOREIGN KEY ([fldQuestionID])
        REFERENCES [dbo].[tblBackgroundQuestions] ([fldID])
)
GO

CREATE INDEX [IX_AppBackgroundResp_ApplicationID]
    ON [dbo].[tblApplicantBackgroundResponses] ([fldApplicationID])
GO
CREATE INDEX [IX_AppBackgroundResp_ApplicantPersonDataID]
    ON [dbo].[tblApplicantBackgroundResponses] ([fldApplicantPersonDataID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.3  tblApplicationChecklistReview
--      One row per check group per applicant per queue stage.
--      Stores Acceptable / Not Acceptable per officer per checklist section.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationChecklistReview]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NOT NULL,
    [fldQueueStage]             VARCHAR(20)     NOT NULL,
    [fldCheckGroup]             VARCHAR(50)     NOT NULL,
    [fldIsAcceptable]           BIT             NULL,
    [fldReviewedBy]             NVARCHAR(200)   NULL,
    [fldReviewedAt]             DATETIME2       NULL,
    [fldCreatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppChecklistReview_CreatedAt]  DEFAULT SYSUTCDATETIME(),
    [fldUpdatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppChecklistReview_UpdatedAt]  DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicationChecklistReview]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [UQ_AppChecklistReview_Unique]
        UNIQUE ([fldApplicationID], [fldApplicantPersonDataID], [fldQueueStage], [fldCheckGroup]),

    CONSTRAINT [CK_AppChecklistReview_QueueStage]
        CHECK ([fldQueueStage] IN ('Processing', 'Approving')),

    CONSTRAINT [CK_AppChecklistReview_CheckGroup]
        CHECK ([fldCheckGroup] IN (
            'Personal', 'Passport', 'Travel', 'Contact', 'Background',
            'MandatoryDocuments', 'PassportPhoto', 'ReturnTicket', 'AdditionalDocuments'
        )),

    CONSTRAINT [FK_AppChecklistReview_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppChecklistReview_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID])
)
GO

CREATE INDEX [IX_AppChecklistReview_ApplicationID]
    ON [dbo].[tblApplicationChecklistReview] ([fldApplicationID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.4  tblApplicationOfficerComments
--      Append-only officer comments per applicant per queue stage per section.
--      NULL fldApplicantPersonDataID = application-level comment.
--      NULL fldCheckGroup            = general comment not tied to a section.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationOfficerComments]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NULL,
    [fldQueueStage]             VARCHAR(20)     NOT NULL,
    [fldCheckGroup]             VARCHAR(50)     NULL,
    [fldComment]                NVARCHAR(500)   NOT NULL,
    [fldCommentBy]              NVARCHAR(200)   NOT NULL,
    [fldCommentAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppOfficerComments_CommentAt] DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicationOfficerComments]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [CK_AppOfficerComments_QueueStage]
        CHECK ([fldQueueStage] IN ('Processing', 'Approving')),

    CONSTRAINT [CK_AppOfficerComments_CheckGroup]
        CHECK ([fldCheckGroup] IN (
            'Personal', 'Passport', 'Travel', 'Contact', 'Background',
            'MandatoryDocuments', 'PassportPhoto', 'ReturnTicket', 'AdditionalDocuments'
        ) OR [fldCheckGroup] IS NULL),

    CONSTRAINT [FK_AppOfficerComments_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppOfficerComments_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID])
)
GO

CREATE INDEX [IX_AppOfficerComments_ApplicationID]
    ON [dbo].[tblApplicationOfficerComments] ([fldApplicationID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.5  tblApplicationRecommendation
--      Processing officer recommendation per applicant.
--      One row per applicant per application — upserted on save.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationRecommendation]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NULL,
    [fldRecommendation]         VARCHAR(20)     NOT NULL,
    [fldRecommendCategoryID]    INT             NULL,
    [fldRecommendSubcategoryID] INT             NULL,
    [fldRecommendDuration]      INT             NULL,
    [fldRecommendDurationUnit]  VARCHAR(10)     NULL,
    [fldRecommendComment]       NVARCHAR(500)   NULL,
    [fldRecommendedBy]          NVARCHAR(200)   NOT NULL,
    [fldRecommendedAt]          DATETIME2       NOT NULL,
    [fldCreatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppRecommendation_CreatedAt]  DEFAULT SYSUTCDATETIME(),
    [fldUpdatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppRecommendation_UpdatedAt]  DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicationRecommendation]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [CK_AppRecommendation_Value]
        CHECK ([fldRecommendation] IN ('Approve', 'Reject')),

    CONSTRAINT [CK_AppRecommendation_DurationUnit]
        CHECK ([fldRecommendDurationUnit] IN ('Days', 'Months') OR [fldRecommendDurationUnit] IS NULL),

    CONSTRAINT [CK_AppRecommendation_Duration]
        CHECK ([fldRecommendDuration] IS NULL OR [fldRecommendDuration] >= 0),

    CONSTRAINT [FK_AppRecommendation_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppRecommendation_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID]),

    CONSTRAINT [FK_AppRecommendation_Category]
        FOREIGN KEY ([fldRecommendCategoryID])
        REFERENCES [dbo].[tblApplicationCategories] ([fldID]),

    CONSTRAINT [FK_AppRecommendation_Subcategory]
        FOREIGN KEY ([fldRecommendSubcategoryID])
        REFERENCES [dbo].[tblApplicationSubcategories] ([fldID])
)
GO

CREATE UNIQUE INDEX [UX_AppRecommendation_SingleApplicant]
    ON [dbo].[tblApplicationRecommendation] ([fldApplicationID])
    WHERE [fldApplicantPersonDataID] IS NULL;
GO

CREATE UNIQUE INDEX [UX_AppRecommendation_MultiApplicant]
    ON [dbo].[tblApplicationRecommendation] ([fldApplicationID], [fldApplicantPersonDataID])
    WHERE [fldApplicantPersonDataID] IS NOT NULL;
GO

CREATE INDEX [IX_AppRecommendation_ApplicationID]
    ON [dbo].[tblApplicationRecommendation] ([fldApplicationID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.6  tblApplicationOfficerDocuments
--      Documents uploaded by officers at Recommendation / Approval / Rejection.
--      Includes soft delete columns.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationOfficerDocuments]
(
    [fldID]                 INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]      INT             NOT NULL,
    [fldDocumentStage]      VARCHAR(20)     NOT NULL,
    [fldDocumentTypeID]     INT             NULL,
    [fldOtherDocTypeName]   NVARCHAR(100)   NULL,
    [fldFileExt]            VARCHAR(10)     NOT NULL,
    [fldBase64]             NVARCHAR(MAX)   NOT NULL,
    [fldBase64Converted]    AS (
                                N'data:application/' + [fldFileExt]
                                + N';base64,' + [fldBase64]
                            ) PERSISTED,
    [fldUploadedBy]         NVARCHAR(200)   NOT NULL,
    [fldUploadedAt]         DATETIME2       NOT NULL    CONSTRAINT [DF_AppOfficerDocs_UploadedAt]   DEFAULT SYSUTCDATETIME(),
    [fldIsDeleted]          BIT             NOT NULL    CONSTRAINT [DF_AppOfficerDocs_IsDeleted]    DEFAULT 0,
    [fldDeletedBy]          NVARCHAR(200)   NULL,
    [fldDeletedAt]          DATETIME2       NULL,

    CONSTRAINT [PK_tblApplicationOfficerDocuments]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [CK_AppOfficerDocs_DocumentStage]
        CHECK ([fldDocumentStage] IN ('Recommendation', 'Approval', 'Rejection')),

    CONSTRAINT [FK_AppOfficerDocs_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppOfficerDocs_DocumentType]
        FOREIGN KEY ([fldDocumentTypeID])
        REFERENCES [dbo].[tblDocumentTypes] ([fldID])
)
GO

CREATE INDEX [IX_AppOfficerDocs_ApplicationID]
    ON [dbo].[tblApplicationOfficerDocuments] ([fldApplicationID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.7  tblApplicationApprovalDecision
--      Approving officer final decision per applicant.
--      One row per applicant per application — upserted on save.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationApprovalDecision]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NULL,
    [fldDecision]               VARCHAR(20)     NOT NULL,
    [fldApproveCategoryID]      INT             NULL,
    [fldApproveSubcategoryID]   INT             NULL,
    [fldApproveDuration]        INT             NULL,
    [fldApproveDurationUnit]    VARCHAR(10)     NULL,
    [fldApproveComment]         NVARCHAR(500)   NULL,
    [fldApprovedBy]             NVARCHAR(200)   NOT NULL,
    [fldApprovedAt]             DATETIME2       NOT NULL,
    [fldCreatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppApprovalDecision_CreatedAt]    DEFAULT SYSUTCDATETIME(),
    [fldUpdatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppApprovalDecision_UpdatedAt]    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicationApprovalDecision]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [CK_AppApprovalDecision_Value]
        CHECK ([fldDecision] IN ('Approved', 'Rejected')),

    CONSTRAINT [CK_AppApprovalDecision_DurationUnit]
        CHECK ([fldApproveDurationUnit] IN ('Days', 'Months') OR [fldApproveDurationUnit] IS NULL),

    CONSTRAINT [CK_AppApprovalDecision_Duration]
        CHECK ([fldApproveDuration] IS NULL OR [fldApproveDuration] >= 0),

    CONSTRAINT [FK_AppApprovalDecision_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppApprovalDecision_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID]),

    CONSTRAINT [FK_AppApprovalDecision_Category]
        FOREIGN KEY ([fldApproveCategoryID])
        REFERENCES [dbo].[tblApplicationCategories] ([fldID]),

    CONSTRAINT [FK_AppApprovalDecision_Subcategory]
        FOREIGN KEY ([fldApproveSubcategoryID])
        REFERENCES [dbo].[tblApplicationSubcategories] ([fldID])
)
GO

CREATE UNIQUE INDEX [UX_AppApprovalDecision_SingleApplicant]
    ON [dbo].[tblApplicationApprovalDecision] ([fldApplicationID])
    WHERE [fldApplicantPersonDataID] IS NULL;
GO

CREATE UNIQUE INDEX [UX_AppApprovalDecision_MultiApplicant]
    ON [dbo].[tblApplicationApprovalDecision] ([fldApplicationID], [fldApplicantPersonDataID])
    WHERE [fldApplicantPersonDataID] IS NOT NULL;
GO

CREATE INDEX [IX_AppApprovalDecision_ApplicationID]
    ON [dbo].[tblApplicationApprovalDecision] ([fldApplicationID])
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.8  tblApplicationAdditionalDocRequests
--      Officer requests for additional documents from the applicant.
--      fldIsDeleted = 1 when officer cancels the request.
--      fldReceivedAt stamped when applicant uploads the document.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE [dbo].[tblApplicationAdditionalDocRequests]
(
    [fldID]                     INT             NOT NULL IDENTITY(1,1),
    [fldApplicationID]          INT             NOT NULL,
    [fldApplicantPersonDataID]  INT             NULL,
    [fldDocumentTypeID]         INT             NULL,
    [fldOtherDocTypeName]       NVARCHAR(100)   NULL,
    [fldRequestComment]         NVARCHAR(500)   NULL,
    [fldRequestedBy]            NVARCHAR(200)   NOT NULL,
    [fldRequestedAt]            DATETIME2       NOT NULL    CONSTRAINT [DF_AppAdditionalDocReq_RequestedAt]  DEFAULT SYSUTCDATETIME(),
    [fldReceivedAt]             DATETIME2       NULL,
    [fldIsDeleted]              BIT             NOT NULL    CONSTRAINT [DF_AppAdditionalDocReq_IsDeleted]    DEFAULT 0,
    [fldCreatedAt]              DATETIME2       NOT NULL    CONSTRAINT [DF_AppAdditionalDocReq_CreatedAt]    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_tblApplicationAdditionalDocRequests]
        PRIMARY KEY CLUSTERED ([fldID] ASC),

    CONSTRAINT [FK_AppAdditionalDocReq_Application]
        FOREIGN KEY ([fldApplicationID])
        REFERENCES [dbo].[tblVisaApplicationSubmitted] ([fldID]),

    CONSTRAINT [FK_AppAdditionalDocReq_PersonData]
        FOREIGN KEY ([fldApplicantPersonDataID])
        REFERENCES [dbo].[tblApplicantPersonData] ([fldID]),

    CONSTRAINT [FK_AppAdditionalDocReq_DocumentType]
        FOREIGN KEY ([fldDocumentTypeID])
        REFERENCES [dbo].[tblDocumentTypes] ([fldID])
)
GO

CREATE INDEX [IX_AppAdditionalDocReq_ApplicationID]
    ON [dbo].[tblApplicationAdditionalDocRequests] ([fldApplicationID])
GO


-- =============================================================================
-- SECTION 3: SEED DATA
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1  tblBackgroundQuestions — 5 BRD background questions
--      fldHasCountry, fldHasDate, fldHasReason, fldHasDoctorName, fldHasDiagnosis
--      drive which conditional sub-fields are required when Answer = Yes.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO [dbo].[tblBackgroundQuestions]
(
    [fldCode],[fldQuestionText],
    [fldHasCountry],[fldHasDate],[fldHasReason],[fldHasDoctorName],[fldHasDiagnosis],
    [fldSortOrder],[fldIsActive]
)
VALUES
('VISA_DENIED',
 'Have you been denied a visa before?',
  1, 1, 1, 0, 0, 10, 1),

('DEPORTED',
 'Have you been deported before?',
  1, 1, 1, 0, 0, 20, 1),

('CONVICTED',
 'Have you been convicted in any country?',
  1, 1, 1, 0, 0, 30, 1),

('CRIMINAL_PROCEEDINGS',
 'Are there any criminal proceedings against you?',
  1, 0, 1, 0, 0, 40, 1),

('MENTAL_ILLNESS',
 'Are you suffering from any mental illness?',
  0, 1, 0, 1, 1, 50, 1);
GO


-- =============================================================================
-- SECTION 4: NEW VIEWS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.1  vw_ApplicationQueueDetails
--      One row per application. Full application data for officer queue grids.
--      Includes dual nationality columns added this session.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW [dbo].[vw_ApplicationQueueDetails]
AS
WITH cte_LatestOfficer AS
(
    SELECT
        h.[fldApplicationID],
        h.[fldActionedBy]   AS AssignedOfficial,
        h.[fldActionedAt]   AS AssignedAt,
        ROW_NUMBER() OVER (
            PARTITION BY h.[fldApplicationID]
            ORDER BY h.[fldActionedAt] DESC
        )                   AS rn
    FROM [dbo].[tblVisaApplicationApprovalHistory] h
    WHERE h.[fldActionedBy] <> 'SYSTEM_USER'
),
cte_FamilyCount AS
(
    SELECT
        vas.[fldID]             AS ApplicationID,
        COUNT(fm.[fldID])       AS FamilyMemberCount
    FROM       [dbo].[tblVisaApplicationSubmitted]  vas
    INNER JOIN [dbo].[tblFamilies]                  f
            ON f.[fldID]        = vas.[fldFamilyGroupID]
    INNER JOIN [dbo].[tblFamilyMembers]             fm
            ON fm.[fldFamilyID] = f.[fldID]
           AND fm.[fldStatus]   = 'Active'
    WHERE  vas.[fldIsFamilyApplication] = 1
    GROUP BY vas.[fldID]
),
cte_GroupCount AS
(
    SELECT
        vas.[fldID]             AS ApplicationID,
        COUNT(gm.[fldID])       AS GroupMemberCount
    FROM       [dbo].[tblVisaApplicationSubmitted]  vas
    INNER JOIN [dbo].[tblGroups]                    g
            ON g.[fldID]        = vas.[fldGroupID]
    INNER JOIN [dbo].[tblGroupMembers]              gm
            ON gm.[fldGroupID]  = g.[fldID]
           AND gm.[fldStatus]   = 'Active'
    WHERE  vas.[fldIsGroupApplication] = 1
    GROUP BY vas.[fldID]
)
SELECT
    N'<button type="button" class="btn btn-sm btn-outline-warning modal-trigger" style="color:black !important;" ' +
     N'data-link="https://lf.automatenow.co.za/Forms/applicationQueue?applicationReference=' + ISNULL(vas.[fldApplicationRef],'') + '&passportNumber=' + ISNULL(apd.[fldPassportNumber],'') + N'" ' +
     N'data-bs-toggle="modal" data-bs-target="#customModal">' +
     N'<i class="bi bi-pencil-square me-2"></i> Review</button>'        AS [Review],

    vas.[fldID]                                 AS ApplicationID,
    vas.[fldApplicationRef]                     AS ApplicationRef,
    vas.[fldStatus]                             AS Status,
    vas.[fldQueue]                              AS Queue,

    vas.[fldApplicationTypeID]                  AS ApplicationTypeID,
    atp.[fldName]                               AS ApplicationType,
    atp.[fldCode]                               AS ApplicationTypeCode,
    vas.[fldApplicationCategoryID]              AS ApplicationCategoryID,
    ac.[fldName]                                AS ApplicationCategory,
    vas.[fldApplicationSubcatID]                AS ApplicationSubcategoryID,
    asc_.[fldName]                              AS ApplicationSubcategory,

    vas.[fldIsFamilyApplication]                AS IsFamilyApplication,
    vas.[fldIsGroupApplication]                 AS IsGroupApplication,
    vas.[fldFamilyGroupID]                      AS FamilyGroupID,
    vas.[fldGroupID]                            AS GroupID,

    1
    + ISNULL(fc.[FamilyMemberCount], 0)
    + ISNULL(gc.[GroupMemberCount],  0)         AS ApplicantCount,

    apd.[fldID]                                 AS ApplicantPersonDataID,
    apd.[fldUserId]                             AS ApplicantUserID,
    apd.[fldFirstName]                          AS FirstName,
    apd.[fldMiddleName]                         AS MiddleName,
    apd.[fldSurname]                            AS Surname,
    apd.[fldFirstName] + ' '
        + ISNULL(apd.[fldMiddleName] + ' ', '')
        + apd.[fldSurname]                      AS FullName,
    apd.[fldDOB]                                AS DateOfBirth,
    apd.[fldIsMinor]                            AS IsMinor,

    apd.[fldGenderID]                           AS GenderID,
    g.[fldName]                                 AS Gender,

    apd.[fldNationalityID]                      AS NationalityID,
    n.[fldCountryName]                          AS Nationality,

    apd.[fldDualNationality]                    AS DualNationality,
    apd.[fldOtherNationalityID]                 AS OtherNationalityID,
    on_.[fldCountryName]                        AS OtherNationality,

    apd.[fldPassportTypeID]                     AS PassportTypeID,
    pt.[fldName]                                AS PassportType,
    pt.[fldCode]                                AS PassportTypeCode,
    apd.[fldPassportNumber]                     AS PassportNumber,
    apd.[fldPassportIssuingCountry]             AS PassportIssuingCountry,
    apd.[fldPassportIssuingLocation]            AS PassportIssuingLocation,
    apd.[fldPassportDateOfIssue]                AS PassportDateOfIssue,
    apd.[fldPassportExpDate]                    AS PassportExpiryDate,
    apd.[fldPassportExpired]                    AS PassportExpired,
    apd.[fldPassportExpiringSoon]               AS PassportExpiringSoon,
    apd.[fldPassportFileExt]                    AS PassportFileExtension,

    apd.[fldCountryOfBirth]                     AS CountryOfBirth,
    apd.[fldPlaceOfBirth]                       AS PlaceOfBirth,

    apd.[fldMaritalStatusID]                    AS MaritalStatusID,
    ms.[fldName]                                AS MaritalStatus,

    apd.[fldCurrentResidentialAdd]              AS ResidentialAddress,
    apd.[fldCityOfResidence]                    AS CityOfResidence,
    apd.[fldCountryOfResidenceID]               AS CountryOfResidenceID,
    cr.[fldCountryName]                         AS CountryOfResidence,

    apd.[fldImmigrationStatusID]                AS ImmigrationStatusID,
    ims.[fldName]                               AS ImmigrationStatus,
    ims.[fldCode]                               AS ImmigrationStatusCode,

    apd.[fldCountryPhoneCode]                   AS CountryPhoneCode,
    apd.[fldPhoneNumber]                        AS PhoneNumber,
    apd.[fldFullPhoneNumber]                    AS FullPhoneNumber,
    apd.[fldEmail]                              AS Email,

    apd.[fldPurposeOfVisitID]                   AS PurposeOfVisitID,
    pov.[fldName]                               AS PurposeOfVisit,
    apd.[fldPointOfEntryID]                     AS PointOfEntryID,
    poe.[fldName]                               AS PointOfEntry,
    apd.[fldPhysicalAddressInUganda]            AS PhysicalAddressInUganda,
    apd.[fldPreviousTravelHistory]              AS PreviousTravelHistory,
    apd.[fldDateOfArrival]                      AS DateOfArrival,
    apd.[fldDurationOfStayDays]                 AS DurationOfStayDays,

    vas.[fldPricePerPerson]                     AS PricePerPerson,
    vas.[fldCurrency]                           AS Currency,
    vas.[fldPaymentStatus]                      AS PaymentStatus,
    vas.[fldPaymentRef]                         AS PaymentRef,
    vas.[fldPaidAt]                             AS PaidAt,

    vas.[fldDeferCount]                         AS DeferCount,
    vas.[fldDeferComment]                       AS DeferComment,
    vas.[fldDeferredAt]                         AS DeferredAt,
    vas.[fldDeferDocumentsRequired]             AS DeferDocumentsRequired,
    dr.[fldName]                                AS DeferReason,

    vas.[fldReferComment]                       AS ReferComment,
    vas.[fldReferredAt]                         AS ReferredAt,
    vas.[fldReferredTo]                         AS ReferredTo,
    rr.[fldName]                                AS ReferReason,
    dept.[fldName]                              AS ReferDepartment,

    off_.[AssignedOfficial]                     AS AssignedOfficial,
    off_.[AssignedAt]                           AS OfficialAssignedAt,

    vas.[fldSubmittedAt]                        AS SubmittedAt,
    vas.[fldCreatedAt]                          AS CreatedAt,
    vas.[fldUpdatedAt]                          AS UpdatedAt

FROM      [dbo].[tblVisaApplicationSubmitted]           vas
INNER JOIN [dbo].[tblApplicantPersonData]               apd
        ON apd.[fldApplicationID]   = vas.[fldID]
LEFT JOIN  [dbo].[tblApplicationTypes]                  atp
        ON atp.[fldID]              = vas.[fldApplicationTypeID]
LEFT JOIN  [dbo].[tblApplicationCategories]             ac
        ON ac.[fldID]               = vas.[fldApplicationCategoryID]
LEFT JOIN  [dbo].[tblApplicationSubcategories]          asc_
        ON asc_.[fldID]             = vas.[fldApplicationSubcatID]
LEFT JOIN  [dbo].[tblGenders]                           g
        ON g.[fldID]                = apd.[fldGenderID]
LEFT JOIN  [dbo].[tblNationalities]                     n
        ON n.[fldID]                = apd.[fldNationalityID]
LEFT JOIN  [dbo].[tblNationalities]                     cr
        ON cr.[fldID]               = apd.[fldCountryOfResidenceID]
LEFT JOIN  [dbo].[tblNationalities]                     on_
        ON on_.[fldID]              = apd.[fldOtherNationalityID]
LEFT JOIN  [dbo].[tblMaritalStatuses]                   ms
        ON ms.[fldID]               = apd.[fldMaritalStatusID]
LEFT JOIN  [dbo].[tblPassportTypes]                     pt
        ON pt.[fldID]               = apd.[fldPassportTypeID]
LEFT JOIN  [dbo].[tblImmigrationStatuses]               ims
        ON ims.[fldID]              = apd.[fldImmigrationStatusID]
LEFT JOIN  [dbo].[tblPurposesOfVisit]                   pov
        ON pov.[fldID]              = apd.[fldPurposeOfVisitID]
LEFT JOIN  [dbo].[tblPointsOfEntry]                     poe
        ON poe.[fldID]              = apd.[fldPointOfEntryID]
LEFT JOIN  [dbo].[tblReasons]                           dr
        ON dr.[fldID]               = vas.[fldDeferReasonID]
LEFT JOIN  [dbo].[tblReasons]                           rr
        ON rr.[fldID]               = vas.[fldReferReasonID]
LEFT JOIN  [dbo].[tblDepartments]                       dept
        ON dept.[fldID]             = vas.[fldReferDepartmentID]
LEFT JOIN  cte_FamilyCount                              fc
        ON fc.[ApplicationID]       = vas.[fldID]
LEFT JOIN  cte_GroupCount                               gc
        ON gc.[ApplicationID]       = vas.[fldID]
LEFT JOIN  cte_LatestOfficer                            off_
        ON off_.[fldApplicationID]  = vas.[fldID]
       AND off_.[rn]                = 1
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.2  vw_ApplicationQueueImages
--      Passport image (from application snapshot) and profile photo
--      (from live person record) per application for officer queue display.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW [dbo].[vw_ApplicationQueueImages]
AS
SELECT
    apd.[fldApplicationID]                  AS ApplicationID,
    apd.[fldID]                             AS ApplicantPersonDataID,
    apd.[fldUserId]                         AS ProfileID,
    apd.[fldFirstName] + ' '
        + ISNULL(apd.[fldMiddleName] + ' ','')
        + apd.[fldSurname]                  AS FullName,
    apd.[fldPassportFileExt]                AS PassportFileExt,
    apd.[fldPassportBase64Converted]        AS PassportImageSrc,
    CASE
        WHEN apd.[fldPassportBase64Converted] IS NOT NULL
        AND  LTRIM(RTRIM(apd.[fldPassportBase64Converted])) <> ''
        THEN CAST(1 AS BIT)
        ELSE CAST(0 AS BIT)
    END                                     AS HasPassportImage,
    pd.[fldProfileFileExt]                  AS ProfileFileExt,
    pd.[fldProfileBase64Converted]          AS ProfileImageSrc,
    CASE
        WHEN pd.[fldProfileBase64Converted] IS NOT NULL
        AND  LTRIM(RTRIM(pd.[fldProfileBase64Converted])) <> ''
        THEN CAST(1 AS BIT)
        ELSE CAST(0 AS BIT)
    END                                     AS HasProfileImage
FROM      [dbo].[tblApplicantPersonData]            apd
LEFT JOIN [dbo].[tblPersonalProfileDetails]         pd
       ON pd.[fldID] = apd.[fldUserId]
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.3  vw_ApplicantBackgroundResponses
--      One row per question per applicant per application.
--      CROSS JOIN ensures all 5 questions appear even if unanswered.
--      Used by the applicant portal review and officer processing screens.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW [dbo].[vw_ApplicantBackgroundResponses]
AS
SELECT
    apd.[fldApplicationID]                  AS ApplicationID,
    apd.[fldID]                             AS ApplicantPersonDataID,
    apd.[fldUserId]                         AS ApplicantProfileID,
    apd.[fldFirstName] + ' '
        + ISNULL(apd.[fldMiddleName] + ' ','')
        + apd.[fldSurname]                  AS FullName,
    apd.[fldPassportNumber]                 AS PassportNumber,
    bq.[fldID]                              AS QuestionID,
    bq.[fldCode]                            AS QuestionCode,
    bq.[fldQuestionText]                    AS QuestionText,
    bq.[fldSortOrder]                       AS QuestionSortOrder,
    bq.[fldHasCountry]                      AS HasCountry,
    bq.[fldHasDate]                         AS HasDate,
    bq.[fldHasReason]                       AS HasReason,
    bq.[fldHasDoctorName]                   AS HasDoctorName,
    bq.[fldHasDiagnosis]                    AS HasDiagnosis,
    r.[fldID]                               AS ResponseID,
    CASE r.[fldAnswer]
        WHEN 1 THEN 'Yes'
        WHEN 0 THEN 'No'
        ELSE NULL
    END                                     AS Answer,
    r.[fldCountry]                          AS Country,
    r.[fldDate]                             AS ResponseDate,
    r.[fldReason]                           AS Reason,
    r.[fldDoctorName]                       AS DoctorName,
    r.[fldDiagnosis]                        AS Diagnosis,
    r.[fldCreatedAt]                        AS ResponseCreatedAt,
    r.[fldUpdatedAt]                        AS ResponseUpdatedAt,
    CASE
        WHEN r.[fldID] IS NOT NULL THEN CAST(1 AS BIT)
        ELSE CAST(0 AS BIT)
    END                                     AS IsAnswered,
    CASE
        WHEN COUNT(bq.[fldID]) OVER (
                PARTITION BY apd.[fldApplicationID], apd.[fldID]
             )
             =
             COUNT(r.[fldID]) OVER (
                PARTITION BY apd.[fldApplicationID], apd.[fldID]
             )
        THEN CAST(1 AS BIT)
        ELSE CAST(0 AS BIT)
    END                                     AS AllQuestionsAnswered
FROM      [dbo].[tblApplicantPersonData]                apd
CROSS JOIN [dbo].[tblBackgroundQuestions]               bq
LEFT JOIN  [dbo].[tblApplicantBackgroundResponses]      r
        ON r.[fldApplicationID]          = apd.[fldApplicationID]
       AND r.[fldApplicantPersonDataID]  = apd.[fldID]
       AND r.[fldQuestionID]             = bq.[fldID]
WHERE  bq.[fldIsActive] = 1
GO


-- =============================================================================
-- SECTION 5: NEW STORED PROCEDURES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1  sp_SaveChecklistReview
--      Upserts one checklist section result per applicant per queue stage.
--      Token resolves to officer DisplayName from Uganda_Portal.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveChecklistReview]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @ApplicantPersonDataID  INT,
    @QueueStage             VARCHAR(20),    -- 'Processing' | 'Approving'
    @CheckGroup             VARCHAR(50),
    @IsAcceptable           BIT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName    NVARCHAR(200)   = NULL;
    DECLARE @Now            DATETIME2       = SYSUTCDATETIME();
    BEGIN TRY
        SELECT @OfficerName = [DisplayName]
        FROM   [Uganda_Portal].[dbo].[SecUsers]
        WHERE  [Token] = @SessionToken AND [Status] = 'Active';
        IF @OfficerName IS NULL
        BEGIN
            INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])
            VALUES('sp_SaveChecklistReview',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.');
            SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN;
        END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID)
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID)
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        IF @QueueStage NOT IN ('Processing','Approving')
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid QueueStage. Must be Processing or Approving.' AS [fldMessage]; RETURN; END
        IF @CheckGroup NOT IN ('Personal','Passport','Travel','Contact','Background','MandatoryDocuments','PassportPhoto','ReturnTicket','AdditionalDocuments')
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid CheckGroup value.' AS [fldMessage]; RETURN; END
        IF EXISTS(SELECT 1 FROM [dbo].[tblApplicationChecklistReview] WHERE [fldApplicationID]=@ApplicationID AND [fldApplicantPersonDataID]=@ApplicantPersonDataID AND [fldQueueStage]=@QueueStage AND [fldCheckGroup]=@CheckGroup)
        BEGIN
            UPDATE [dbo].[tblApplicationChecklistReview]
            SET [fldIsAcceptable]=@IsAcceptable,[fldReviewedBy]=@OfficerName,[fldReviewedAt]=@Now,[fldUpdatedAt]=@Now
            WHERE [fldApplicationID]=@ApplicationID AND [fldApplicantPersonDataID]=@ApplicantPersonDataID AND [fldQueueStage]=@QueueStage AND [fldCheckGroup]=@CheckGroup;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblApplicationChecklistReview]([fldApplicationID],[fldApplicantPersonDataID],[fldQueueStage],[fldCheckGroup],[fldIsAcceptable],[fldReviewedBy],[fldReviewedAt],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@ApplicationID,@ApplicantPersonDataID,@QueueStage,@CheckGroup,@IsAcceptable,@OfficerName,@Now,@Now,@Now);
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Checklist review saved.' AS [fldMessage],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@QueueStage AS [fldQueueStage],@CheckGroup AS [fldCheckGroup],@OfficerName AS [fldReviewedBy];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveChecklistReview',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2  sp_SaveOfficerComment
--      Append-only officer comment per applicant per queue stage per section.
--      fldCheckGroup = NULL for general comments not tied to a checklist section.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveOfficerComment]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @ApplicantPersonDataID  INT             = NULL,
    @QueueStage             VARCHAR(20),
    @CheckGroup             VARCHAR(50)     = NULL,
    @Comment                NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName    NVARCHAR(200)   = NULL;
    DECLARE @Now            DATETIME2       = SYSUTCDATETIME();
    DECLARE @NewCommentID   INT             = NULL;
    BEGIN TRY
        SELECT @OfficerName = [DisplayName] FROM [Uganda_Portal].[dbo].[SecUsers] WHERE [Token]=@SessionToken AND [Status]='Active';
        IF @OfficerName IS NULL
        BEGIN
            INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])
            VALUES('sp_SaveOfficerComment',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.');
            SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN;
        END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID)
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF @ApplicantPersonDataID IS NOT NULL AND NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID)
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        IF @QueueStage NOT IN ('Processing','Approving')
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid QueueStage. Must be Processing or Approving.' AS [fldMessage]; RETURN; END
        IF @CheckGroup IS NOT NULL AND @CheckGroup NOT IN ('Personal','Passport','Travel','Contact','Background','MandatoryDocuments','PassportPhoto','ReturnTicket','AdditionalDocuments')
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid CheckGroup value.' AS [fldMessage]; RETURN; END
        IF LTRIM(RTRIM(ISNULL(@Comment,''))) = ''
        BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Comment cannot be empty.' AS [fldMessage]; RETURN; END
        INSERT INTO [dbo].[tblApplicationOfficerComments]([fldApplicationID],[fldApplicantPersonDataID],[fldQueueStage],[fldCheckGroup],[fldComment],[fldCommentBy],[fldCommentAt])
        VALUES(@ApplicationID,@ApplicantPersonDataID,@QueueStage,@CheckGroup,@Comment,@OfficerName,@Now);
        SET @NewCommentID = SCOPE_IDENTITY();
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Comment saved.' AS [fldMessage],@NewCommentID AS [fldCommentID],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@QueueStage AS [fldQueueStage],@CheckGroup AS [fldCheckGroup],@OfficerName AS [fldCommentBy];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveOfficerComment',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3  sp_SaveRecommendation
--      Upserts processing officer recommendation per applicant.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveRecommendation]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @ApplicantPersonDataID  INT             = NULL,
    @Recommendation         VARCHAR(20),    -- 'Approve' | 'Reject'
    @RecommendCategoryID    INT             = NULL,
    @RecommendSubcategoryID INT             = NULL,
    @RecommendDuration      INT             = NULL,
    @RecommendDurationUnit  VARCHAR(10)     = NULL,
    @RecommendComment       NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName NVARCHAR(200)=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @OfficerName=[DisplayName] FROM [Uganda_Portal].[dbo].[SecUsers] WHERE [Token]=@SessionToken AND [Status]='Active';
        IF @OfficerName IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_SaveRecommendation',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF @ApplicantPersonDataID IS NOT NULL AND NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        IF @Recommendation NOT IN ('Approve','Reject') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Recommendation. Must be Approve or Reject.' AS [fldMessage]; RETURN; END
        IF @RecommendDurationUnit IS NOT NULL AND @RecommendDurationUnit NOT IN ('Days','Months') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid DurationUnit. Must be Days or Months.' AS [fldMessage]; RETURN; END
        IF EXISTS(SELECT 1 FROM [dbo].[tblApplicationRecommendation] WHERE [fldApplicationID]=@ApplicationID AND ([fldApplicantPersonDataID]=@ApplicantPersonDataID OR (@ApplicantPersonDataID IS NULL AND [fldApplicantPersonDataID] IS NULL)))
        BEGIN
            UPDATE [dbo].[tblApplicationRecommendation] SET [fldRecommendation]=@Recommendation,[fldRecommendCategoryID]=@RecommendCategoryID,[fldRecommendSubcategoryID]=@RecommendSubcategoryID,[fldRecommendDuration]=@RecommendDuration,[fldRecommendDurationUnit]=@RecommendDurationUnit,[fldRecommendComment]=@RecommendComment,[fldRecommendedBy]=@OfficerName,[fldRecommendedAt]=@Now,[fldUpdatedAt]=@Now
            WHERE [fldApplicationID]=@ApplicationID AND ([fldApplicantPersonDataID]=@ApplicantPersonDataID OR (@ApplicantPersonDataID IS NULL AND [fldApplicantPersonDataID] IS NULL));
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblApplicationRecommendation]([fldApplicationID],[fldApplicantPersonDataID],[fldRecommendation],[fldRecommendCategoryID],[fldRecommendSubcategoryID],[fldRecommendDuration],[fldRecommendDurationUnit],[fldRecommendComment],[fldRecommendedBy],[fldRecommendedAt],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@ApplicationID,@ApplicantPersonDataID,@Recommendation,@RecommendCategoryID,@RecommendSubcategoryID,@RecommendDuration,@RecommendDurationUnit,@RecommendComment,@OfficerName,@Now,@Now,@Now);
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Recommendation saved.' AS [fldMessage],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@Recommendation AS [fldRecommendation],@OfficerName AS [fldRecommendedBy];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveRecommendation',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.4  sp_SaveOfficerDocument
--      Upload or soft-delete a document at Recommendation/Approval/Rejection.
--      @Action = 'Upload' | 'Delete'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveOfficerDocument]
    @SessionToken       VARCHAR(400),
    @ApplicationID      INT,
    @Action             VARCHAR(10),
    @DocumentStage      VARCHAR(20),
    @DocumentTypeID     INT             = NULL,
    @OtherDocTypeName   NVARCHAR(100)   = NULL,
    @FileExt            VARCHAR(10)     = NULL,
    @Base64             NVARCHAR(MAX)   = NULL,
    @DocumentID         INT             = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName NVARCHAR(200)=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME(); DECLARE @NewDocID INT=NULL;
    BEGIN TRY
        SELECT @OfficerName=[DisplayName] FROM [Uganda_Portal].[dbo].[SecUsers] WHERE [Token]=@SessionToken AND [Status]='Active';
        IF @OfficerName IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_SaveOfficerDocument',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN; END
        IF @Action NOT IN ('Upload','Delete') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Action. Must be Upload or Delete.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF @DocumentStage NOT IN ('Recommendation','Approval','Rejection') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid DocumentStage. Must be Recommendation, Approval, or Rejection.' AS [fldMessage]; RETURN; END
        IF @Action='Upload'
        BEGIN
            IF LTRIM(RTRIM(ISNULL(@Base64,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Base64 content cannot be empty.' AS [fldMessage]; RETURN; END
            IF LTRIM(RTRIM(ISNULL(@FileExt,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'File extension cannot be empty.' AS [fldMessage]; RETURN; END
            IF @DocumentTypeID IS NOT NULL AND EXISTS(SELECT 1 FROM [dbo].[tblDocumentTypes] WHERE [fldID]=@DocumentTypeID AND UPPER([fldName])='OTHER') AND LTRIM(RTRIM(ISNULL(@OtherDocTypeName,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'OtherDocTypeName is required when document type is Other.' AS [fldMessage]; RETURN; END
            INSERT INTO [dbo].[tblApplicationOfficerDocuments]([fldApplicationID],[fldDocumentStage],[fldDocumentTypeID],[fldOtherDocTypeName],[fldFileExt],[fldBase64],[fldUploadedBy],[fldUploadedAt],[fldIsDeleted])
            VALUES(@ApplicationID,@DocumentStage,@DocumentTypeID,@OtherDocTypeName,@FileExt,@Base64,@OfficerName,@Now,0);
            SET @NewDocID=SCOPE_IDENTITY();
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document uploaded.' AS [fldMessage],@NewDocID AS [fldDocumentID],@ApplicationID AS [fldApplicationID],@DocumentStage AS [fldDocumentStage],@OfficerName AS [fldUploadedBy];
        END
        ELSE IF @Action='Delete'
        BEGIN
            IF @DocumentID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'DocumentID is required for Delete.' AS [fldMessage]; RETURN; END
            IF NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicationOfficerDocuments] WHERE [fldID]=@DocumentID AND [fldApplicationID]=@ApplicationID AND [fldDocumentStage]=@DocumentStage AND [fldIsDeleted]=0) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Document not found, does not belong to this application/stage, or is already deleted.' AS [fldMessage]; RETURN; END
            UPDATE [dbo].[tblApplicationOfficerDocuments] SET [fldIsDeleted]=1,[fldDeletedBy]=@OfficerName,[fldDeletedAt]=@Now WHERE [fldID]=@DocumentID;
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document deleted.' AS [fldMessage],@DocumentID AS [fldDocumentID],@ApplicationID AS [fldApplicationID],@DocumentStage AS [fldDocumentStage],@OfficerName AS [fldDeletedBy];
        END
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveOfficerDocument',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.5  sp_SaveApprovalDecision
--      Upserts approving officer final decision per applicant.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveApprovalDecision]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @ApplicantPersonDataID  INT             = NULL,
    @Decision               VARCHAR(20),    -- 'Approved' | 'Rejected'
    @ApproveCategoryID      INT             = NULL,
    @ApproveSubcategoryID   INT             = NULL,
    @ApproveDuration        INT             = NULL,
    @ApproveDurationUnit    VARCHAR(10)     = NULL,
    @ApproveComment         NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName NVARCHAR(200)=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @OfficerName=[DisplayName] FROM [Uganda_Portal].[dbo].[SecUsers] WHERE [Token]=@SessionToken AND [Status]='Active';
        IF @OfficerName IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_SaveApprovalDecision',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF @ApplicantPersonDataID IS NOT NULL AND NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        IF @Decision NOT IN ('Approved','Rejected') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Decision. Must be Approved or Rejected.' AS [fldMessage]; RETURN; END
        IF @ApproveDurationUnit IS NOT NULL AND @ApproveDurationUnit NOT IN ('Days','Months') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid DurationUnit. Must be Days or Months.' AS [fldMessage]; RETURN; END
        IF EXISTS(SELECT 1 FROM [dbo].[tblApplicationApprovalDecision] WHERE [fldApplicationID]=@ApplicationID AND ([fldApplicantPersonDataID]=@ApplicantPersonDataID OR (@ApplicantPersonDataID IS NULL AND [fldApplicantPersonDataID] IS NULL)))
        BEGIN
            UPDATE [dbo].[tblApplicationApprovalDecision] SET [fldDecision]=@Decision,[fldApproveCategoryID]=@ApproveCategoryID,[fldApproveSubcategoryID]=@ApproveSubcategoryID,[fldApproveDuration]=@ApproveDuration,[fldApproveDurationUnit]=@ApproveDurationUnit,[fldApproveComment]=@ApproveComment,[fldApprovedBy]=@OfficerName,[fldApprovedAt]=@Now,[fldUpdatedAt]=@Now
            WHERE [fldApplicationID]=@ApplicationID AND ([fldApplicantPersonDataID]=@ApplicantPersonDataID OR (@ApplicantPersonDataID IS NULL AND [fldApplicantPersonDataID] IS NULL));
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblApplicationApprovalDecision]([fldApplicationID],[fldApplicantPersonDataID],[fldDecision],[fldApproveCategoryID],[fldApproveSubcategoryID],[fldApproveDuration],[fldApproveDurationUnit],[fldApproveComment],[fldApprovedBy],[fldApprovedAt],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@ApplicationID,@ApplicantPersonDataID,@Decision,@ApproveCategoryID,@ApproveSubcategoryID,@ApproveDuration,@ApproveDurationUnit,@ApproveComment,@OfficerName,@Now,@Now,@Now);
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Approval decision saved.' AS [fldMessage],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@Decision AS [fldDecision],@OfficerName AS [fldApprovedBy];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveApprovalDecision',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.6  sp_SaveAdditionalDocRequest
--      @Action = 'Request' | 'Received' | 'Delete'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveAdditionalDocRequest]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @Action                 VARCHAR(10),
    @ApplicantPersonDataID  INT             = NULL,
    @DocumentTypeID         INT             = NULL,
    @OtherDocTypeName       NVARCHAR(100)   = NULL,
    @RequestComment         NVARCHAR(500)   = NULL,
    @RequestID              INT             = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OfficerName NVARCHAR(200)=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME(); DECLARE @NewRequestID INT=NULL;
    BEGIN TRY
        SELECT @OfficerName=[DisplayName] FROM [Uganda_Portal].[dbo].[SecUsers] WHERE [Token]=@SessionToken AND [Status]='Active';
        IF @OfficerName IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_SaveAdditionalDocRequest',LEFT(@SessionToken,250),NULL,@ApplicationID,'Token Validation','Session token is invalid or officer account is not Active.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or officer not found.' AS [fldMessage]; RETURN; END
        IF @Action NOT IN ('Request','Received','Delete') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Action. Must be Request, Received, or Delete.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF @ApplicantPersonDataID IS NOT NULL AND NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        IF @Action='Request' AND @DocumentTypeID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'DocumentTypeID is required for a new request.' AS [fldMessage]; RETURN; END
        IF @Action IN ('Received','Delete') AND @RequestID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'RequestID is required for Received and Delete actions.' AS [fldMessage]; RETURN; END
        IF @Action IN ('Received','Delete') AND NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicationAdditionalDocRequests] WHERE [fldID]=@RequestID AND [fldApplicationID]=@ApplicationID AND [fldIsDeleted]=0) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Document request not found or already deleted.' AS [fldMessage]; RETURN; END
        IF @Action='Received' AND EXISTS(SELECT 1 FROM [dbo].[tblApplicationAdditionalDocRequests] WHERE [fldID]=@RequestID AND [fldReceivedAt] IS NOT NULL) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Document request has already been marked as received.' AS [fldMessage]; RETURN; END
        IF @Action='Request'
        BEGIN
            INSERT INTO [dbo].[tblApplicationAdditionalDocRequests]([fldApplicationID],[fldApplicantPersonDataID],[fldDocumentTypeID],[fldOtherDocTypeName],[fldRequestComment],[fldRequestedBy],[fldRequestedAt],[fldIsDeleted],[fldCreatedAt])
            VALUES(@ApplicationID,@ApplicantPersonDataID,@DocumentTypeID,@OtherDocTypeName,@RequestComment,@OfficerName,@Now,0,@Now);
            SET @NewRequestID=SCOPE_IDENTITY();
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document request saved.' AS [fldMessage],@NewRequestID AS [fldRequestID],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@OfficerName AS [fldRequestedBy];
        END
        ELSE IF @Action='Received'
        BEGIN
            UPDATE [dbo].[tblApplicationAdditionalDocRequests] SET [fldReceivedAt]=@Now WHERE [fldID]=@RequestID;
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document request marked as received.' AS [fldMessage],@RequestID AS [fldRequestID],@ApplicationID AS [fldApplicationID];
        END
        ELSE IF @Action='Delete'
        BEGIN
            UPDATE [dbo].[tblApplicationAdditionalDocRequests] SET [fldIsDeleted]=1 WHERE [fldID]=@RequestID;
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document request deleted.' AS [fldMessage],@RequestID AS [fldRequestID],@ApplicationID AS [fldApplicationID];
        END
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveAdditionalDocRequest',LEFT(@SessionToken,250),NULL,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.7  sp_UpsertFamilyMemberDocument
--      Upload or hard-delete a document for a family member.
--      Caller must be the family principal OR the member themselves.
--      @MemberUserID = tblPersonalProfileDetails.fldID of the member.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertFamilyMemberDocument]
    @SessionToken       VARCHAR(400),
    @MemberUserID       INT,
    @Action             VARCHAR(10),        -- 'Upload' | 'Delete'
    @DocumentID         INT         = NULL,
    @DocumentTypeID     INT         = NULL,
    @OtherDocTypeName   NVARCHAR(100) = NULL,
    @FileExt            VARCHAR(10)  = NULL,
    @Base64             NVARCHAR(MAX) = NULL,
    @DocumentRowID      INT         = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @PortalUserId INT=NULL; DECLARE @CallerProfileID INT=NULL; DECLARE @FamilyMemberID INT=NULL; DECLARE @FamilyID INT=NULL; DECLARE @PrincipalProfileID INT=NULL; DECLARE @NewDocID INT=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @PortalUserId=su.[ID],@CallerProfileID=pd.[fldID] FROM [Uganda_Portal].[dbo].[SecUsers] su INNER JOIN [Uganda_Visa_Applications].[dbo].[tblSecUserMap] sm ON sm.[fldPortalSecUserId]=su.[ID] INNER JOIN [dbo].[tblPersonalProfileDetails] pd ON pd.[fldSecUserId]=sm.[fldID] WHERE su.[Token]=@SessionToken AND su.[Status]='Active';
        IF @CallerProfileID IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_UpsertFamilyMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Token Validation','Session token is invalid, user status is not Active, or no SecUserMap record found.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or user not found.' AS [fldMessage]; RETURN; END
        IF @Action NOT IN ('Upload','Delete') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Action. Must be Upload or Delete.' AS [fldMessage]; RETURN; END
        SELECT @FamilyMemberID=fm.[fldID],@FamilyID=fm.[fldFamilyID],@PrincipalProfileID=f.[fldUserId] FROM [dbo].[tblFamilyMembers] fm INNER JOIN [dbo].[tblFamilies] f ON f.[fldID]=fm.[fldFamilyID] WHERE fm.[fldUserId]=@MemberUserID AND fm.[fldStatus]='Active' AND f.[fldIsActive]=1;
        IF @FamilyMemberID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Member not found or is not an active member of any active family.' AS [fldMessage]; RETURN; END
        IF @CallerProfileID<>@PrincipalProfileID AND @CallerProfileID<>@MemberUserID BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_UpsertFamilyMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Authorisation','Caller (ProfileID '+CAST(@CallerProfileID AS VARCHAR)+') is not the family principal or the member.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'You are not authorised to manage documents for this member.' AS [fldMessage]; RETURN; END
        IF @Action='Upload'
        BEGIN
            IF @DocumentID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'DocumentID is required for Upload.' AS [fldMessage]; RETURN; END
            IF LTRIM(RTRIM(ISNULL(@FileExt,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'File extension cannot be empty.' AS [fldMessage]; RETURN; END
            IF LTRIM(RTRIM(ISNULL(@Base64,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Base64 content cannot be empty.' AS [fldMessage]; RETURN; END
            IF @DocumentTypeID IS NOT NULL AND EXISTS(SELECT 1 FROM [dbo].[tblDocumentTypes] WHERE [fldID]=@DocumentTypeID AND UPPER([fldName])='OTHER') AND LTRIM(RTRIM(ISNULL(@OtherDocTypeName,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'OtherDocTypeName is required when document type is Other.' AS [fldMessage]; RETURN; END
            INSERT INTO [dbo].[tblFamilyMemberDocuments]([fldFamilyMemberID],[fldDocumentID],[fldDocumentTypeId],[fldOtherDocTypeName],[fldFileExt],[fldBase64],[fldUploadedAt])
            VALUES(@FamilyMemberID,@DocumentID,@DocumentTypeID,@OtherDocTypeName,@FileExt,@Base64,@Now);
            SET @NewDocID=SCOPE_IDENTITY();
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document uploaded.' AS [fldMessage],@NewDocID AS [fldDocumentRowID],@FamilyMemberID AS [fldFamilyMemberID],@MemberUserID AS [fldMemberUserID],@FamilyID AS [fldFamilyID],@DocumentID AS [fldDocumentID];
        END
        ELSE IF @Action='Delete'
        BEGIN
            IF @DocumentRowID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'DocumentRowID is required for Delete.' AS [fldMessage]; RETURN; END
            IF NOT EXISTS(SELECT 1 FROM [dbo].[tblFamilyMemberDocuments] WHERE [fldID]=@DocumentRowID AND [fldFamilyMemberID]=@FamilyMemberID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Document not found or does not belong to this member.' AS [fldMessage]; RETURN; END
            DELETE FROM [dbo].[tblFamilyMemberDocuments] WHERE [fldID]=@DocumentRowID;
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document deleted.' AS [fldMessage],@DocumentRowID AS [fldDocumentRowID],@FamilyMemberID AS [fldFamilyMemberID],@MemberUserID AS [fldMemberUserID],@FamilyID AS [fldFamilyID];
        END
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_UpsertFamilyMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.8  sp_UpsertGroupMemberDocument
--      Upload or hard-delete a document for a group member.
--      @GroupID pins the exact group. Caller must be group principal or member.
--      @MemberUserID = tblPersonalProfileDetails.fldID of the member.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertGroupMemberDocument]
    @SessionToken       VARCHAR(400),
    @GroupID            INT,
    @MemberUserID       INT,
    @Action             VARCHAR(10),
    @DocumentID         INT         = NULL,
    @DocumentTypeID     INT         = NULL,
    @OtherDocTypeName   NVARCHAR(100) = NULL,
    @FileExt            VARCHAR(10)  = NULL,
    @Base64             NVARCHAR(MAX) = NULL,
    @DocumentRowID      INT         = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @PortalUserId INT=NULL; DECLARE @CallerProfileID INT=NULL; DECLARE @GroupMemberID INT=NULL; DECLARE @PrincipalProfileID INT=NULL; DECLARE @NewDocID INT=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @PortalUserId=su.[ID],@CallerProfileID=pd.[fldID] FROM [Uganda_Portal].[dbo].[SecUsers] su INNER JOIN [Uganda_Visa_Applications].[dbo].[tblSecUserMap] sm ON sm.[fldPortalSecUserId]=su.[ID] INNER JOIN [dbo].[tblPersonalProfileDetails] pd ON pd.[fldSecUserId]=sm.[fldID] WHERE su.[Token]=@SessionToken AND su.[Status]='Active';
        IF @CallerProfileID IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_UpsertGroupMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Token Validation','Session token is invalid, user status is not Active, or no SecUserMap record found.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or user not found.' AS [fldMessage]; RETURN; END
        IF @Action NOT IN ('Upload','Delete') BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Invalid Action. Must be Upload or Delete.' AS [fldMessage]; RETURN; END
        SELECT @PrincipalProfileID=g.[fldPersonId] FROM [dbo].[tblGroups] g WHERE g.[fldID]=@GroupID AND g.[fldIsActive]=1;
        IF @PrincipalProfileID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Group not found or is inactive.' AS [fldMessage]; RETURN; END
        IF @CallerProfileID<>@PrincipalProfileID AND @CallerProfileID<>@MemberUserID BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_UpsertGroupMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Authorisation','Caller (ProfileID '+CAST(@CallerProfileID AS VARCHAR)+') is not the group principal or the member.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'You are not authorised to manage documents for this member.' AS [fldMessage]; RETURN; END
        SELECT @GroupMemberID=gm.[fldID] FROM [dbo].[tblGroupMembers] gm WHERE gm.[fldGroupID]=@GroupID AND gm.[fldUserId]=@MemberUserID AND gm.[fldStatus]='Active';
        IF @GroupMemberID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Member not found or is not an active member of this group.' AS [fldMessage]; RETURN; END
        IF @Action='Upload'
        BEGIN
            IF LTRIM(RTRIM(ISNULL(@FileExt,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'File extension cannot be empty.' AS [fldMessage]; RETURN; END
            IF LTRIM(RTRIM(ISNULL(@Base64,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Base64 content cannot be empty.' AS [fldMessage]; RETURN; END
            IF @DocumentTypeID IS NOT NULL AND EXISTS(SELECT 1 FROM [dbo].[tblDocumentTypes] WHERE [fldID]=@DocumentTypeID AND UPPER([fldName])='OTHER') AND LTRIM(RTRIM(ISNULL(@OtherDocTypeName,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'OtherDocTypeName is required when document type is Other.' AS [fldMessage]; RETURN; END
            INSERT INTO [dbo].[tblGroupMemberDocuments]([fldGroupMemberID],[fldDocumentID],[fldDocumentTypeId],[fldOtherDocTypeName],[fldFileExt],[fldBase64],[fldUploadedAt])
            VALUES(@GroupMemberID,@DocumentID,@DocumentTypeID,@OtherDocTypeName,@FileExt,@Base64,@Now);
            SET @NewDocID=SCOPE_IDENTITY();
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document uploaded.' AS [fldMessage],@NewDocID AS [fldDocumentRowID],@GroupMemberID AS [fldGroupMemberID],@MemberUserID AS [fldMemberUserID],@GroupID AS [fldGroupID],@DocumentID AS [fldDocumentID];
        END
        ELSE IF @Action='Delete'
        BEGIN
            IF @DocumentRowID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'DocumentRowID is required for Delete.' AS [fldMessage]; RETURN; END
            IF NOT EXISTS(SELECT 1 FROM [dbo].[tblGroupMemberDocuments] WHERE [fldID]=@DocumentRowID AND [fldGroupMemberID]=@GroupMemberID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Document not found or does not belong to this member.' AS [fldMessage]; RETURN; END
            DELETE FROM [dbo].[tblGroupMemberDocuments] WHERE [fldID]=@DocumentRowID;
            SELECT CAST(1 AS BIT) AS [fldSuccess],'Document deleted.' AS [fldMessage],@DocumentRowID AS [fldDocumentRowID],@GroupMemberID AS [fldGroupMemberID],@MemberUserID AS [fldMemberUserID],@GroupID AS [fldGroupID];
        END
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_UpsertGroupMemberDocument',LEFT(@SessionToken,250),@PortalUserId,@MemberUserID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.9  sp_SaveBackgroundResponse
--      Upserts one background question response per applicant per application.
--      Validates sub-fields based on question flags. Clears sub-fields on No.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_SaveBackgroundResponse]
    @SessionToken           VARCHAR(400),
    @ApplicationID          INT,
    @ApplicantPersonDataID  INT,
    @QuestionCode           VARCHAR(50),
    @Answer                 BIT,
    @Country                NVARCHAR(100)   = NULL,
    @Date                   DATE            = NULL,
    @Reason                 NVARCHAR(500)   = NULL,
    @DoctorName             NVARCHAR(200)   = NULL,
    @Diagnosis              NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @PortalUserId INT=NULL; DECLARE @CallerProfileID INT=NULL; DECLARE @QuestionID INT=NULL; DECLARE @HasCountry BIT=0; DECLARE @HasDate BIT=0; DECLARE @HasReason BIT=0; DECLARE @HasDoctorName BIT=0; DECLARE @HasDiagnosis BIT=0; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @PortalUserId=su.[ID],@CallerProfileID=pd.[fldID] FROM [Uganda_Portal].[dbo].[SecUsers] su INNER JOIN [Uganda_Visa_Applications].[dbo].[tblSecUserMap] sm ON sm.[fldPortalSecUserId]=su.[ID] INNER JOIN [dbo].[tblPersonalProfileDetails] pd ON pd.[fldSecUserId]=sm.[fldID] WHERE su.[Token]=@SessionToken AND su.[Status]='Active';
        IF @CallerProfileID IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_SaveBackgroundResponse',LEFT(@SessionToken,250),@PortalUserId,@ApplicationID,'Token Validation','Session token is invalid, user status is not Active, or no SecUserMap record found.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or user not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblApplicantPersonData] WHERE [fldID]=@ApplicantPersonDataID AND [fldApplicationID]=@ApplicationID) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Applicant not found on this application.' AS [fldMessage]; RETURN; END
        SELECT @QuestionID=[fldID],@HasCountry=[fldHasCountry],@HasDate=[fldHasDate],@HasReason=[fldHasReason],@HasDoctorName=[fldHasDoctorName],@HasDiagnosis=[fldHasDiagnosis] FROM [dbo].[tblBackgroundQuestions] WHERE [fldCode]=@QuestionCode AND [fldIsActive]=1;
        IF @QuestionID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Question code '''+ISNULL(@QuestionCode,'')+''' not found or inactive.' AS [fldMessage]; RETURN; END
        IF @Answer=1
        BEGIN
            IF @HasCountry=1 AND LTRIM(RTRIM(ISNULL(@Country,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Country is required for this question when answer is Yes.' AS [fldMessage]; RETURN; END
            IF @HasDate=1 AND @Date IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Date is required for this question when answer is Yes.' AS [fldMessage]; RETURN; END
            IF @HasReason=1 AND LTRIM(RTRIM(ISNULL(@Reason,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Reason is required for this question when answer is Yes.' AS [fldMessage]; RETURN; END
            IF @HasDoctorName=1 AND LTRIM(RTRIM(ISNULL(@DoctorName,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Doctor name is required for this question when answer is Yes.' AS [fldMessage]; RETURN; END
            IF @HasDiagnosis=1 AND LTRIM(RTRIM(ISNULL(@Diagnosis,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Diagnosis is required for this question when answer is Yes.' AS [fldMessage]; RETURN; END
        END
        IF @Answer=0 BEGIN SET @Country=NULL; SET @Date=NULL; SET @Reason=NULL; SET @DoctorName=NULL; SET @Diagnosis=NULL; END
        IF EXISTS(SELECT 1 FROM [dbo].[tblApplicantBackgroundResponses] WHERE [fldApplicationID]=@ApplicationID AND [fldApplicantPersonDataID]=@ApplicantPersonDataID AND [fldQuestionID]=@QuestionID)
        BEGIN
            UPDATE [dbo].[tblApplicantBackgroundResponses] SET [fldAnswer]=@Answer,[fldCountry]=@Country,[fldDate]=@Date,[fldReason]=@Reason,[fldDoctorName]=@DoctorName,[fldDiagnosis]=@Diagnosis,[fldUpdatedAt]=@Now
            WHERE [fldApplicationID]=@ApplicationID AND [fldApplicantPersonDataID]=@ApplicantPersonDataID AND [fldQuestionID]=@QuestionID;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblApplicantBackgroundResponses]([fldApplicationID],[fldApplicantPersonDataID],[fldQuestionID],[fldAnswer],[fldCountry],[fldDate],[fldReason],[fldDoctorName],[fldDiagnosis],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@ApplicationID,@ApplicantPersonDataID,@QuestionID,@Answer,@Country,@Date,@Reason,@DoctorName,@Diagnosis,@Now,@Now);
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Background response saved.' AS [fldMessage],@ApplicationID AS [fldApplicationID],@ApplicantPersonDataID AS [fldApplicantPersonDataID],@QuestionCode AS [fldQuestionCode],@Answer AS [fldAnswer];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_SaveBackgroundResponse',LEFT(@SessionToken,250),@PortalUserId,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.10 sp_GetBackgroundResponse
--      Returns one background question response row for a specific applicant.
--      Used by Laserfiche lookup rules — one rule per question using QuestionCode.
--      Answer returned as 'Yes' / 'No' / NULL (not yet answered).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_GetBackgroundResponse]
    @ApplicationID          INT,
    @ApplicantProfileID     INT,
    @QuestionCode           VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        apd.[fldApplicationID]                  AS ApplicationID,
        apd.[fldID]                             AS ApplicantPersonDataID,
        apd.[fldUserId]                         AS ApplicantProfileID,
        apd.[fldFirstName]+' '+ISNULL(apd.[fldMiddleName]+' ','')+apd.[fldSurname] AS FullName,
        bq.[fldID]                              AS QuestionID,
        bq.[fldCode]                            AS QuestionCode,
        bq.[fldQuestionText]                    AS QuestionText,
        bq.[fldHasCountry]                      AS HasCountry,
        bq.[fldHasDate]                         AS HasDate,
        bq.[fldHasReason]                       AS HasReason,
        bq.[fldHasDoctorName]                   AS HasDoctorName,
        bq.[fldHasDiagnosis]                    AS HasDiagnosis,
        r.[fldID]                               AS ResponseID,
        CASE r.[fldAnswer] WHEN 1 THEN 'Yes' WHEN 0 THEN 'No' ELSE NULL END AS Answer,
        r.[fldCountry]                          AS Country,
        r.[fldDate]                             AS ResponseDate,
        r.[fldReason]                           AS Reason,
        r.[fldDoctorName]                       AS DoctorName,
        r.[fldDiagnosis]                        AS Diagnosis,
        r.[fldUpdatedAt]                        AS ResponseUpdatedAt,
        CASE WHEN r.[fldID] IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsAnswered
    FROM      [dbo].[tblApplicantPersonData]                apd
    INNER JOIN [dbo].[tblBackgroundQuestions]               bq
            ON bq.[fldCode]=@QuestionCode AND bq.[fldIsActive]=1
    LEFT JOIN  [dbo].[tblApplicantBackgroundResponses]      r
            ON r.[fldApplicationID]=apd.[fldApplicationID]
           AND r.[fldApplicantPersonDataID]=apd.[fldID]
           AND r.[fldQuestionID]=bq.[fldID]
    WHERE  apd.[fldApplicationID]=@ApplicationID
    AND    apd.[fldUserId]=@ApplicantProfileID;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.11 sp_RecordNewApplicantPersonData
--      Upserts applicant personal, passport, identity and travel data snapshot.
--      All FK lookups resolved from description strings internally.
--      Upsert key: fldApplicationID + fldUserId (resolved from token).
--      Includes fldDualNationality and fldOtherNationalityID added this session.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_RecordNewApplicantPersonData]
    @SessionToken               VARCHAR(400),
    @ApplicationID              INT,
    @FirstName                  NVARCHAR(100),
    @MiddleName                 NVARCHAR(100)   = NULL,
    @Surname                    NVARCHAR(100),
    @DOB                        DATE,
    @Gender                     NVARCHAR(50),
    @Nationality                NVARCHAR(100),
    @CountryOfBirth             VARCHAR(100),
    @PlaceOfBirth               VARCHAR(200),
    @MaritalStatus              NVARCHAR(100),
    @PassportType               NVARCHAR(100),
    @PassportNumber             VARCHAR(50),
    @PassportIssuingCountry     VARCHAR(100),
    @PassportIssuingLocation    VARCHAR(200),
    @PassportDateOfIssue        DATE,
    @PassportExpDate            DATE,
    @PassportBase64             NVARCHAR(MAX)   = NULL,
    @PassportFileExt            VARCHAR(10)     = NULL,
    @DualNationality            BIT             = NULL,
    @OtherNationality           NVARCHAR(100)   = NULL,
    @CurrentResidentialAdd      VARCHAR(400),
    @CityOfResidence            VARCHAR(200),
    @CountryOfResidence         NVARCHAR(100),
    @ImmigrationStatus          NVARCHAR(100),
    @CountryPhoneCode           VARCHAR(10),
    @PhoneNumber                VARCHAR(15),
    @Email                      NVARCHAR(200)   = NULL,
    @PurposeOfVisit             NVARCHAR(100),
    @PointOfEntry               NVARCHAR(100),
    @PhysicalAddressInUganda    VARCHAR(400)    = NULL,
    @PreviousTravelHistory      NVARCHAR(MAX)   = NULL,
    @DateOfArrival              DATE            = NULL,
    @DurationOfStayDays         INT             = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @PortalUserId INT=NULL; DECLARE @CallerProfileID INT=NULL; DECLARE @ExistingID INT=NULL;
    DECLARE @GenderID INT=NULL; DECLARE @NationalityID INT=NULL; DECLARE @MaritalStatusID INT=NULL; DECLARE @PassportTypeID INT=NULL;
    DECLARE @OtherNationalityID INT=NULL; DECLARE @CountryOfResidenceID INT=NULL; DECLARE @ImmigrationStatusID INT=NULL;
    DECLARE @PurposeOfVisitID INT=NULL; DECLARE @PointOfEntryID INT=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @PortalUserId=su.[ID],@CallerProfileID=pd.[fldID] FROM [Uganda_Portal].[dbo].[SecUsers] su INNER JOIN [Uganda_Visa_Applications].[dbo].[tblSecUserMap] sm ON sm.[fldPortalSecUserId]=su.[ID] INNER JOIN [dbo].[tblPersonalProfileDetails] pd ON pd.[fldSecUserId]=sm.[fldID] WHERE su.[Token]=@SessionToken AND su.[Status]='Active';
        IF @CallerProfileID IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_RecordNewApplicantPersonData',LEFT(@SessionToken,250),@PortalUserId,@ApplicationID,'Token Validation','Session token is invalid, user status is not Active, or no SecUserMap record found.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or user not found.' AS [fldMessage]; RETURN; END
        IF NOT EXISTS(SELECT 1 FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldID]=@ApplicationID AND [fldUserId]=@CallerProfileID) BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_RecordNewApplicantPersonData',LEFT(@SessionToken,250),@PortalUserId,@ApplicationID,'Application Validation','ApplicationID '+CAST(@ApplicationID AS VARCHAR)+' not found or does not belong to this user.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Application not found or does not belong to this account.' AS [fldMessage]; RETURN; END
        SELECT @GenderID=[fldID] FROM [dbo].[tblGenders] WHERE [fldName]=@Gender; IF @GenderID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Gender '''+ISNULL(@Gender,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @NationalityID=[fldID] FROM [dbo].[tblNationalities] WHERE [fldCountryName]=@Nationality AND [fldIsActive]=1; IF @NationalityID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Nationality '''+ISNULL(@Nationality,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @MaritalStatusID=[fldID] FROM [dbo].[tblMaritalStatuses] WHERE [fldName]=@MaritalStatus; IF @MaritalStatusID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Marital status '''+ISNULL(@MaritalStatus,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @PassportTypeID=[fldID] FROM [dbo].[tblPassportTypes] WHERE [fldName]=@PassportType AND [fldIsActive]=1; IF @PassportTypeID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Passport type '''+ISNULL(@PassportType,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @CountryOfResidenceID=[fldID] FROM [dbo].[tblNationalities] WHERE [fldCountryName]=@CountryOfResidence AND [fldIsActive]=1; IF @CountryOfResidenceID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Country of residence '''+ISNULL(@CountryOfResidence,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @ImmigrationStatusID=[fldID] FROM [dbo].[tblImmigrationStatuses] WHERE [fldName]=@ImmigrationStatus AND [fldIsActive]=1; IF @ImmigrationStatusID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Immigration status '''+ISNULL(@ImmigrationStatus,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @PurposeOfVisitID=[fldID] FROM [dbo].[tblPurposesOfVisit] WHERE [fldName]=@PurposeOfVisit AND [fldIsActive]=1; IF @PurposeOfVisitID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Purpose of visit '''+ISNULL(@PurposeOfVisit,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @PointOfEntryID=[fldID] FROM [dbo].[tblPointsOfEntry] WHERE [fldName]=@PointOfEntry AND [fldIsActive]=1; IF @PointOfEntryID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Point of entry '''+ISNULL(@PointOfEntry,'')+''' not found.' AS [fldMessage]; RETURN; END
        IF ISNULL(@DualNationality,0)=1
        BEGIN
            IF LTRIM(RTRIM(ISNULL(@OtherNationality,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Other nationality is required when dual nationality is Yes.' AS [fldMessage]; RETURN; END
            SELECT @OtherNationalityID=[fldID] FROM [dbo].[tblNationalities] WHERE [fldCountryName]=@OtherNationality AND [fldIsActive]=1; IF @OtherNationalityID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Other nationality '''+ISNULL(@OtherNationality,'')+''' not found.' AS [fldMessage]; RETURN; END
            IF @OtherNationalityID=@NationalityID BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Other nationality must differ from primary nationality.' AS [fldMessage]; RETURN; END
        END
        ELSE SET @OtherNationalityID=NULL;
        IF @PassportExpDate<=@PassportDateOfIssue BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Passport expiry date must be after date of issue.' AS [fldMessage]; RETURN; END
        IF @DOB>=CAST(GETUTCDATE() AS DATE) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Date of birth must be in the past.' AS [fldMessage]; RETURN; END
        IF LEFT(@CountryPhoneCode,1)<>'+' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Country phone code must start with ''+''.' AS [fldMessage]; RETURN; END
        IF @DurationOfStayDays IS NOT NULL AND @DurationOfStayDays<=0 BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Duration of stay must be greater than zero.' AS [fldMessage]; RETURN; END
        SELECT @ExistingID=[fldID] FROM [dbo].[tblApplicantPersonData] WHERE [fldApplicationID]=@ApplicationID AND [fldUserId]=@CallerProfileID;
        IF @ExistingID IS NOT NULL
        BEGIN
            UPDATE [dbo].[tblApplicantPersonData]
            SET [fldFirstName]=@FirstName,[fldMiddleName]=@MiddleName,[fldSurname]=@Surname,[fldDOB]=@DOB,[fldGenderID]=@GenderID,[fldNationalityID]=@NationalityID,[fldCountryOfBirth]=@CountryOfBirth,[fldPlaceOfBirth]=@PlaceOfBirth,[fldMaritalStatusID]=@MaritalStatusID,[fldPassportTypeID]=@PassportTypeID,[fldPassportNumber]=@PassportNumber,[fldPassportIssuingCountry]=@PassportIssuingCountry,[fldPassportIssuingLocation]=@PassportIssuingLocation,[fldPassportDateOfIssue]=@PassportDateOfIssue,[fldPassportExpDate]=@PassportExpDate,[fldPassportBase64]=ISNULL(@PassportBase64,[fldPassportBase64]),[fldPassportFileExt]=ISNULL(@PassportFileExt,[fldPassportFileExt]),[fldDualNationality]=@DualNationality,[fldOtherNationalityID]=@OtherNationalityID,[fldCurrentResidentialAdd]=@CurrentResidentialAdd,[fldCityOfResidence]=@CityOfResidence,[fldCountryOfResidenceID]=@CountryOfResidenceID,[fldImmigrationStatusID]=@ImmigrationStatusID,[fldCountryPhoneCode]=@CountryPhoneCode,[fldPhoneNumber]=@PhoneNumber,[fldEmail]=@Email,[fldPurposeOfVisitID]=@PurposeOfVisitID,[fldPointOfEntryID]=@PointOfEntryID,[fldPhysicalAddressInUganda]=@PhysicalAddressInUganda,[fldPreviousTravelHistory]=@PreviousTravelHistory,[fldDateOfArrival]=@DateOfArrival,[fldDurationOfStayDays]=@DurationOfStayDays,[fldUpdatedAt]=@Now
            WHERE [fldApplicationID]=@ApplicationID AND [fldUserId]=@CallerProfileID;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblApplicantPersonData]([fldApplicationID],[fldUserId],[fldFirstName],[fldMiddleName],[fldSurname],[fldDOB],[fldGenderID],[fldNationalityID],[fldCountryOfBirth],[fldPlaceOfBirth],[fldMaritalStatusID],[fldPassportTypeID],[fldPassportNumber],[fldPassportIssuingCountry],[fldPassportIssuingLocation],[fldPassportDateOfIssue],[fldPassportExpDate],[fldPassportBase64],[fldPassportFileExt],[fldDualNationality],[fldOtherNationalityID],[fldCurrentResidentialAdd],[fldCityOfResidence],[fldCountryOfResidenceID],[fldImmigrationStatusID],[fldCountryPhoneCode],[fldPhoneNumber],[fldEmail],[fldPurposeOfVisitID],[fldPointOfEntryID],[fldPhysicalAddressInUganda],[fldPreviousTravelHistory],[fldDateOfArrival],[fldDurationOfStayDays],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@ApplicationID,@CallerProfileID,@FirstName,@MiddleName,@Surname,@DOB,@GenderID,@NationalityID,@CountryOfBirth,@PlaceOfBirth,@MaritalStatusID,@PassportTypeID,@PassportNumber,@PassportIssuingCountry,@PassportIssuingLocation,@PassportDateOfIssue,@PassportExpDate,@PassportBase64,@PassportFileExt,@DualNationality,@OtherNationalityID,@CurrentResidentialAdd,@CityOfResidence,@CountryOfResidenceID,@ImmigrationStatusID,@CountryPhoneCode,@PhoneNumber,@Email,@PurposeOfVisitID,@PointOfEntryID,@PhysicalAddressInUganda,@PreviousTravelHistory,@DateOfArrival,@DurationOfStayDays,@Now,@Now);
            SET @ExistingID=SCOPE_IDENTITY();
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Applicant person data saved.' AS [fldMessage],@ExistingID AS [fldApplicantPersonDataID],@ApplicationID AS [fldApplicationID],@CallerProfileID AS [fldUserID],@GenderID AS [fldGenderID],@NationalityID AS [fldNationalityID],@MaritalStatusID AS [fldMaritalStatusID],@PassportTypeID AS [fldPassportTypeID],@CountryOfResidenceID AS [fldCountryOfResidenceID],@ImmigrationStatusID AS [fldImmigrationStatusID],@PurposeOfVisitID AS [fldPurposeOfVisitID],@PointOfEntryID AS [fldPointOfEntryID],@OtherNationalityID AS [fldOtherNationalityID];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_RecordNewApplicantPersonData',LEFT(@SessionToken,250),@PortalUserId,@ApplicationID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.12 sp_RecordVisaApplication
--      Upserts master application record in tblVisaApplicationSubmitted.
--      @ApplicationRef passed from Laserfiche form (natural key).
--      Application type/category/subcategory resolved from descriptions.
--      Price and currency derived from tblApplicationSubcategories.
--      Initial status = 'Awaiting Processing'.
--      Upsert key: fldApplicationRef + fldUserId.
--      Only 'Awaiting Processing' records are re-saveable.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_RecordVisaApplication]
    @SessionToken               VARCHAR(400),
    @ApplicationRef             VARCHAR(50),
    @ApplicationType            NVARCHAR(100),
    @ApplicationCategory        NVARCHAR(100),
    @ApplicationSubcategory     NVARCHAR(100),
    @IsFamilyApplication        BIT         = 0,
    @FamilyGroupID              INT         = NULL,
    @IsGroupApplication         BIT         = 0,
    @GroupID                    INT         = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @PortalUserId INT=NULL; DECLARE @SecUserMapID INT=NULL;
    DECLARE @ApplicationTypeID INT=NULL; DECLARE @ApplicationCategoryID INT=NULL; DECLARE @ApplicationSubcatID INT=NULL;
    DECLARE @PricePerPerson DECIMAL(10,2)=0.00; DECLARE @Currency VARCHAR(5)='USD';
    DECLARE @ExistingID INT=NULL; DECLARE @ExistingStatus VARCHAR(30)=NULL; DECLARE @Now DATETIME2=SYSUTCDATETIME();
    BEGIN TRY
        SELECT @PortalUserId=su.[ID],@SecUserMapID=sm.[fldID] FROM [Uganda_Portal].[dbo].[SecUsers] su INNER JOIN [Uganda_Visa_Applications].[dbo].[tblSecUserMap] sm ON sm.[fldPortalSecUserId]=su.[ID] WHERE su.[Token]=@SessionToken AND su.[Status]='Active';
        IF @SecUserMapID IS NULL BEGIN INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorMessage])VALUES('sp_RecordVisaApplication',LEFT(@SessionToken,250),@PortalUserId,NULL,'Token Validation','Session token is invalid, user status is not Active, or no SecUserMap record found.'); SELECT CAST(0 AS BIT) AS [fldSuccess],'Session token is invalid or user not found.' AS [fldMessage]; RETURN; END
        IF LTRIM(RTRIM(ISNULL(@ApplicationRef,'')))='' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'ApplicationRef cannot be empty.' AS [fldMessage]; RETURN; END
        SELECT @ApplicationTypeID=[fldID] FROM [dbo].[tblApplicationTypes] WHERE [fldName]=@ApplicationType AND [fldIsActive]=1; IF @ApplicationTypeID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application type '''+ISNULL(@ApplicationType,'')+''' not found.' AS [fldMessage]; RETURN; END
        SELECT @ApplicationCategoryID=[fldID] FROM [dbo].[tblApplicationCategories] WHERE [fldName]=@ApplicationCategory AND [fldApplicationTypeID]=@ApplicationTypeID AND [fldIsActive]=1; IF @ApplicationCategoryID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application category '''+ISNULL(@ApplicationCategory,'')+''' not found under type '''+ISNULL(@ApplicationType,'')+'''.' AS [fldMessage]; RETURN; END
        SELECT @ApplicationSubcatID=[fldID],@PricePerPerson=[fldPricePerPerson],@Currency=[fldCurrency] FROM [dbo].[tblApplicationSubcategories] WHERE [fldName]=@ApplicationSubcategory AND [fldApplicationCategoryID]=@ApplicationCategoryID AND [fldIsActive]=1; IF @ApplicationSubcatID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application subcategory '''+ISNULL(@ApplicationSubcategory,'')+''' not found under category '''+ISNULL(@ApplicationCategory,'')+'''.' AS [fldMessage]; RETURN; END
        IF ISNULL(@IsFamilyApplication,0)=1 AND ISNULL(@IsGroupApplication,0)=1 BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'An application cannot be both a family and a group application.' AS [fldMessage]; RETURN; END
        IF ISNULL(@IsFamilyApplication,0)=1 BEGIN IF @FamilyGroupID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'FamilyGroupID is required for a family application.' AS [fldMessage]; RETURN; END IF NOT EXISTS(SELECT 1 FROM [dbo].[tblFamilies] WHERE [fldID]=@FamilyGroupID AND [fldIsActive]=1) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Family group not found or is inactive.' AS [fldMessage]; RETURN; END END ELSE SET @FamilyGroupID=NULL;
        IF ISNULL(@IsGroupApplication,0)=1 BEGIN IF @GroupID IS NULL BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'GroupID is required for a group application.' AS [fldMessage]; RETURN; END IF NOT EXISTS(SELECT 1 FROM [dbo].[tblGroups] WHERE [fldID]=@GroupID AND [fldIsActive]=1) BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Group not found or is inactive.' AS [fldMessage]; RETURN; END END ELSE SET @GroupID=NULL;
        SELECT @ExistingID=[fldID],@ExistingStatus=[fldStatus] FROM [dbo].[tblVisaApplicationSubmitted] WHERE [fldApplicationRef]=@ApplicationRef AND [fldUserId]=@SecUserMapID;
        IF @ExistingID IS NOT NULL
        BEGIN
            IF @ExistingStatus<>'Awaiting Processing' BEGIN SELECT CAST(0 AS BIT) AS [fldSuccess],'Application '''+@ApplicationRef+''' cannot be updated — current status is '''+@ExistingStatus+'''.' AS [fldMessage]; RETURN; END
            UPDATE [dbo].[tblVisaApplicationSubmitted] SET [fldApplicationTypeID]=@ApplicationTypeID,[fldApplicationCategoryID]=@ApplicationCategoryID,[fldApplicationSubcatID]=@ApplicationSubcatID,[fldIsFamilyApplication]=ISNULL(@IsFamilyApplication,0),[fldFamilyGroupID]=@FamilyGroupID,[fldIsGroupApplication]=ISNULL(@IsGroupApplication,0),[fldGroupID]=@GroupID,[fldPricePerPerson]=@PricePerPerson,[fldCurrency]=@Currency,[fldUpdatedAt]=@Now WHERE [fldID]=@ExistingID;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[tblVisaApplicationSubmitted]([fldUserId],[fldApplicationRef],[fldApplicationTypeID],[fldApplicationCategoryID],[fldApplicationSubcatID],[fldIsFamilyApplication],[fldFamilyGroupID],[fldIsGroupApplication],[fldGroupID],[fldStatus],[fldQueue],[fldPricePerPerson],[fldCurrency],[fldPaymentStatus],[fldPaymentRef],[fldPaidAt],[fldSubmittedAt],[fldCreatedAt],[fldUpdatedAt])
            VALUES(@SecUserMapID,@ApplicationRef,@ApplicationTypeID,@ApplicationCategoryID,@ApplicationSubcatID,ISNULL(@IsFamilyApplication,0),@FamilyGroupID,ISNULL(@IsGroupApplication,0),@GroupID,'Awaiting Processing',NULL,@PricePerPerson,@Currency,'Unpaid',NULL,NULL,NULL,@Now,@Now);
            SET @ExistingID=SCOPE_IDENTITY();
        END
        SELECT CAST(1 AS BIT) AS [fldSuccess],'Application saved.' AS [fldMessage],@ExistingID AS [fldApplicationID],@ApplicationRef AS [fldApplicationRef],@SecUserMapID AS [fldUserID],@ApplicationTypeID AS [fldApplicationTypeID],@ApplicationCategoryID AS [fldApplicationCategoryID],@ApplicationSubcatID AS [fldApplicationSubcatID],@PricePerPerson AS [fldPricePerPerson],@Currency AS [fldCurrency];
    END TRY
    BEGIN CATCH
        INSERT INTO [dbo].[tblErrorLog]([fldProcedure],[fldUserToken],[fldPortalUserID],[fldLocalUserID],[fldAction],[fldErrorNumber],[fldErrorSeverity],[fldErrorState],[fldErrorLine],[fldErrorMessage])
        VALUES('sp_RecordVisaApplication',LEFT(@SessionToken,250),@PortalUserId,@ExistingID,'Unhandled Exception',ERROR_NUMBER(),ERROR_SEVERITY(),ERROR_STATE(),ERROR_LINE(),LEFT(ERROR_MESSAGE(),4000));
        SELECT CAST(0 AS BIT) AS [fldSuccess],'An unexpected error occurred. Please try again or contact support.' AS [fldMessage];
    END CATCH
END
GO


-- =============================================================================
-- SECTION 6: UPDATED STORED PROCEDURES
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.1  proc_Page_OfficialApplicationQueue
--      Updated to reference vw_ApplicationQueueDetails (replaces
--      vw_OfficialApplicationQueue). Column names aligned to new view.
--      Role detection auth pattern unchanged from original.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[proc_Page_OfficialApplicationQueue]
    @AuthenticatedUser VARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AdminRole     BIT = 0;
    DECLARE @ApprovalGroup BIT = 0;

    IF EXISTS (
        SELECT su.DisplayName, sg.GroupName
        FROM [Uganda_Portal].[dbo].[SecUsers]  su
        JOIN [Uganda_Portal].[dbo].[SecGroups] sg ON sg.ID = su.ID
        WHERE sg.GroupName IN ('Developer','Visa Approvals')
          AND su.DisplayName = @AuthenticatedUser
    )
    BEGIN SET @AdminRole = 1; END

    IF EXISTS (
        SELECT su.DisplayName, sg.GroupName
        FROM [Uganda_Portal].[dbo].[SecUsers]  su
        JOIN [Uganda_Portal].[dbo].[SecGroups] sg ON sg.ID = su.ID
        WHERE sg.GroupName IN ('Visa Approvals')
          AND su.DisplayName = @AuthenticatedUser
    )
    BEGIN SET @ApprovalGroup = 1; END

    IF @AdminRole = 0 AND @ApprovalGroup = 0
    BEGIN
        SELECT [Review],ApplicationRef AS [Reference],FullName AS [Full Name],Nationality,[ApplicationType] AS [Type],PassportNumber AS [Passport Number],Status,Queue,ApplicantCount AS [People Linked],SubmittedAt AS [Submitted Date],UpdatedAt AS [Last Updated],OfficialAssignedAt AS [Last Review],AssignedOfficial AS [Last Review By]
        FROM [dbo].[vw_ApplicationQueueDetails]
        WHERE [Status] IN ('Awaiting Processing','Processing')
        UNION ALL
        SELECT [Review],ApplicationRef AS [Reference],FullName AS [Full Name],Nationality,[ApplicationType] AS [Type],PassportNumber AS [Passport Number],Status,Queue,ApplicantCount AS [People Linked],SubmittedAt AS [Submitted Date],UpdatedAt AS [Last Updated],OfficialAssignedAt AS [Last Review],AssignedOfficial AS [Last Review By]
        FROM [dbo].[vw_ApplicationQueueDetails]
        WHERE [Status] IN ('Defer','Defer & Hold') AND Queue='Processing' AND AssignedOfficial=@AuthenticatedUser
    END

    ELSE IF @AdminRole = 0 AND @ApprovalGroup = 1
    BEGIN
        SELECT [Review],ApplicationRef AS [Reference],FullName AS [Full Name],Nationality,[ApplicationType] AS [Type],PassportNumber AS [Passport Number],Status,Queue,ApplicantCount AS [People Linked],SubmittedAt AS [Submitted Date],UpdatedAt AS [Last Updated],OfficialAssignedAt AS [Last Review],AssignedOfficial AS [Last Review By]
        FROM [dbo].[vw_ApplicationQueueDetails]
        WHERE [Status] IN ('Awaiting Approval','Approving')
        UNION ALL
        SELECT [Review],ApplicationRef AS [Reference],FullName AS [Full Name],Nationality,[ApplicationType] AS [Type],PassportNumber AS [Passport Number],Status,Queue,ApplicantCount AS [People Linked],SubmittedAt AS [Submitted Date],UpdatedAt AS [Last Updated],OfficialAssignedAt AS [Last Review],AssignedOfficial AS [Last Review By]
        FROM [dbo].[vw_ApplicationQueueDetails]
        WHERE [Status] IN ('Defer','Defer & Hold') AND Queue='Approval' AND AssignedOfficial=@AuthenticatedUser
    END

    ELSE
    BEGIN
        SELECT [Review],ApplicationRef AS [Reference],FullName AS [Full Name],Nationality,[ApplicationType] AS [Type],PassportNumber AS [Passport Number],Status,Queue,ApplicantCount AS [People Linked],SubmittedAt AS [Submitted Date],UpdatedAt AS [Last Updated],OfficialAssignedAt AS [Last Review],AssignedOfficial AS [Last Review By]
        FROM [dbo].[vw_ApplicationQueueDetails]
        WHERE [Status] NOT IN ('Draft','Approved','Rejected','Cancelled','Withdrawn')
    END

END
GO

-- =============================================================================
-- END OF SESSION CHANGES SCRIPT
-- Target : UIBCP — Uganda_Visa_Applications
-- Date   : 2026-06-11
-- =============================================================================
