# Last session summary

- Fixed Aluu QR/UPI orders stuck pending: background `aluu-settlement` reconcile + auto-fulfill workers on API; storefront keeps polling after payment popup closes. One paid stuck order reconciled locally to `processing`. Ship: `eb deploy` (API) + Amplify `main` (storefront).
