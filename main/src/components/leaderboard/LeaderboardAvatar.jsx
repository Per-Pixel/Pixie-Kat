import { UserRound } from "lucide-react";

import AvatarFrame from "../common/AvatarFrame";

const LeaderboardAvatar = ({ avatarUrl, alt = "", frame, sizeClass = "size-10", fallback = null }) => (
  <AvatarFrame frame={frame} className="shrink-0">
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7a5bff] to-[#b097ff] text-white ${sizeClass}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={alt} className="size-full rounded-full object-cover" loading="lazy" decoding="async" />
      ) : (
        fallback ?? <UserRound aria-hidden="true" className="size-1/2" />
      )}
    </span>
  </AvatarFrame>
);

export default LeaderboardAvatar;
