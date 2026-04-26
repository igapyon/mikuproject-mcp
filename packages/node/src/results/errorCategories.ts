export const errorCategories = {
  invalidToolArguments: "invalid_tool_arguments",
  unsupportedDocumentKind: "unsupported_document_kind",
  missingBaseState: "missing_base_state",
  upstreamRuntimeFailure: "upstream_runtime_failure",
  upstreamValidationError: "upstream_validation_error",
  upstreamWarning: "upstream_warning",
  fileAccessPolicyError: "file_access_policy_error",
  storagePolicyError: "storage_policy_error",
  transportError: "transport_error",
  sessionError: "session_error"
} as const;

export type ErrorCategory = (typeof errorCategories)[keyof typeof errorCategories];
