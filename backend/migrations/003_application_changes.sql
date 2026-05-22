-- NCLMS — application form changes
--   * Rename registration_number → namfisa_reg_no (applications + microlenders).
--   * Add preferred_tier on applications (selected during signup).
--   * Extend allowed document_type values with 'business_registration'.

ALTER TABLE nclms_microlender_applications RENAME COLUMN registration_number TO namfisa_reg_no;
ALTER TABLE nclms_microlenders            RENAME COLUMN registration_number TO namfisa_reg_no;

ALTER TABLE nclms_microlender_applications
  ADD COLUMN IF NOT EXISTS preferred_tier VARCHAR(20)
    CHECK (preferred_tier IN ('tier1','tier2','tier3','tier4'));

-- Rebuild the document_type CHECK so applicants can upload business-registration documents.
ALTER TABLE nclms_application_documents
  DROP CONSTRAINT IF EXISTS nclms_application_documents_document_type_check;

ALTER TABLE nclms_application_documents
  ADD CONSTRAINT nclms_application_documents_document_type_check
    CHECK (document_type IN (
      'founding_statement',
      'namfisa_certificate',
      'namfisa_approval_letter',
      'principal_officer_id',
      'member_id',
      'business_registration',
      'other'
    ));
