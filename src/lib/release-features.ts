// Release switches, not subscription entitlements. Paid access must eventually
// be verified on the server against an authenticated account and billing state.
export const releaseFeatures = Object.freeze({
  accounts: false,
  websiteVideos: false,
});
