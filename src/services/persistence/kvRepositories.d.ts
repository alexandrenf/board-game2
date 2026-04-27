// NOTE: This barrel assumes web and native implementations expose the same public
// type surface (KVProfileRepository, KVProgressRepository, KVSettingsRepository,
// persistenceRepositories). If a future native implementation diverges, replace
// this file with a conditional export or explicit type assertion to catch
// discrepancies at type-check time.
export * from './kvRepositories.web';
