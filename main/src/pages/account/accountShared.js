export const pageBackground = {
  backgroundImage:
    "radial-gradient(circle at top left, rgba(255,244,229,0.88), rgba(255,255,255,0.72) 32%, rgba(228,244,252,0.9) 74%, rgba(255,248,237,0.9) 100%)",
};

export const getAccountProfile = (user) => {
  const displayName = user?.name?.trim() || "PixieKat Player";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return {
    displayName,
    initials: initials || "PK",
    email: user?.email || "demo@client.com",
    phone: "+91 90000 00000",
    walletBalance: 0,
  };
};
