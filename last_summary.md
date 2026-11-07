# Last session summary

- Added API worker `expireStalePendingOrders`: Aluu/Razorpay `pending` >24h → `failed` (last-chance Aluu paid check). Commit pushed; deploy API with `eb deploy` from `main/server`.
