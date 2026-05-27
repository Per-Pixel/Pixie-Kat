export const pageBackground = {
  backgroundImage:
    "radial-gradient(circle at top left, rgba(255,244,229,0.88), rgba(255,255,255,0.72) 32%, rgba(228,244,252,0.9) 74%, rgba(255,248,237,0.9) 100%)",
};

export const getAccountProfile = (profile) => {
  const displayName = profile?.name?.trim() || "PixieKat Player";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return {
    displayName,
    initials: initials || "PK",
    email: profile?.email || "",
    phone: profile?.phone || "",
    walletBalance: Number(profile?.wallet_balance ?? 0),
    username: profile?.username || "",
    bio: profile?.bio || "",
    avatarUrl: profile?.avatar_url || null,
    referralCode: profile?.referral_code || "",
    role: profile?.role || "user",
    emailVerified: profile?.email_verified ?? false,
    id: profile?.id || null,
  };
};
