import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, User, Phone, AtSign, Save, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { pageBackground } from "./accountShared";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const getAvatarPathFromUrl = (url) => {
  if (!url) return null;
  try {
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  } catch {
    return null;
  }
};

const getAvatarErrorMessage = (err) => {
  const message = err?.message || "";
  if (message.toLowerCase().includes("bucket not found")) {
    return "Profile picture storage is not set up yet. Please run supabase/migrations/003_avatar_storage.sql in Supabase.";
  }
  return message || "Failed to save profile. Please try again.";
};

const EditProfilePage = ({ profile }) => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: profile?.displayName || "",
    username: profile?.username || "",
    mobile: profile?.phone || "",
    bio: profile?.bio || "",
  });

  const [profileImagePreview, setProfileImagePreview] = useState(profile?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSaveError("");
    setSaved(false);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setSaveError("Please choose an image file.");
        return;
      }

      if (file.size > MAX_AVATAR_SIZE) {
        setSaveError("Profile picture must be 5MB or smaller.");
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      setProfileImagePreview(imageUrl);
      setFormData((prev) => ({ ...prev, profilePicture: file }));
      setSaveError("");
      setSaved(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setSaveError("Full name is required."); return; }
    if (!user?.id) { setSaveError("Not authenticated."); return; }

    setIsSaving(true);
    setSaveError("");

    try {
      let avatarUrl = profile?.avatarUrl || null;

      if (formData.profilePicture) {
        const ext = formData.profilePicture.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/profile-${Date.now()}.${ext}`;
        const oldAvatarPath = getAvatarPathFromUrl(profile?.avatarUrl);

        const { error: uploadErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, formData.profilePicture, {
            cacheControl: "3600",
            contentType: formData.profilePicture.type,
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        avatarUrl = urlData?.publicUrl || avatarUrl;

        if (oldAvatarPath && oldAvatarPath !== path) {
          await supabase.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name.trim(),
          username: formData.username.trim() || null,
          phone: formData.mobile.trim() || null,
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      setSaved(true);
      setTimeout(() => navigate("/account"), 1200);
    } catch (err) {
      setSaveError(getAvatarErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate("/account")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Edit Profile</h1>
          </div>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8dcff] via-white to-[#9a82ff] p-[6px] shadow-[0_14px_26px_rgba(122,97,255,0.2)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#7a5bff] to-[#b097ff] text-4xl font-black text-white overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      profile?.initials || "PK"
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-105 border border-slate-100"
                  >
                    <Camera className="h-5 w-5 text-[#6c49ff]" />
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-500">Tap to change profile picture</p>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-bold text-slate-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="h-14 w-full rounded-2xl border border-white/50 bg-white/60 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#8b6dff] focus:bg-white focus:ring-4 focus:ring-[#8b6dff]/10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-bold text-slate-700">
                    Username
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <AtSign className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="h-14 w-full rounded-2xl border border-white/50 bg-white/60 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#8b6dff] focus:bg-white focus:ring-4 focus:ring-[#8b6dff]/10"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <label htmlFor="mobile" className="text-sm font-bold text-slate-700">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className="h-14 w-full rounded-2xl border border-white/50 bg-white/60 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#8b6dff] focus:bg-white focus:ring-4 focus:ring-[#8b6dff]/10"
                      placeholder="Enter your mobile number"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-bold text-slate-700">
                    Bio
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-4 left-0 flex items-start pl-4">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="4"
                      className="w-full rounded-2xl border border-white/50 bg-white/60 pl-12 pr-4 pt-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#8b6dff] focus:bg-white focus:ring-4 focus:ring-[#8b6dff]/10 resize-none"
                      placeholder="Write a short bio about yourself"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {saveError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 border border-red-200">
                  {saveError}
                </p>
              )}

              {/* Actions */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving || saved}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-lg font-bold text-white shadow-[0_14px_28px_rgba(108,73,255,0.3)] transition hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</>
                  ) : saved ? (
                    <><CheckCircle2 className="h-5 w-5" /> Saved!</>
                  ) : (
                    <><Save className="h-5 w-5" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfilePage;
