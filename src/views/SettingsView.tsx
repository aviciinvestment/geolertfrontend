import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StreamService } from '../services/StreamService';
import { ArrowLeft, User, Save, Camera, LogOut } from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleSave = async () => {
    setSaving(true);

    let finalAvatar = avatarPreview;

    if (avatarFile) {
      const avatarRes = await StreamService.uploadAvatar(avatarFile);
      if (avatarRes.success && avatarRes.user?.avatar) {
        finalAvatar = avatarRes.user.avatar;
      }
    }

    const res = await StreamService.updateProfile({
      name: name || undefined,
      bio,
      avatar: finalAvatar || undefined,
    });
    setSaving(false);

    if (res.success && res.user) {
      updateUser(res.user);
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const hasChanges = name !== (user?.name || '') || bio !== (user?.bio || '') || avatarFile !== null;

  return (
    <div className="w-full h-full bg-[#0A0A0A] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="p-1 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Profile Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-white/20 group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/20 group-hover:border-pink-500/50 transition-colors">
                <User className="w-12 h-12 text-white/30" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center border-2 border-[#0A0A0A] shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <p className="text-white/30 text-xs mt-3">Tap to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="px-5 space-y-5 pb-8">
          {/* Name */}
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={150}
              placeholder="Tell the world about yourself..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <span className={`text-xs font-medium ${bio.length > 130 ? 'text-yellow-400' : 'text-white/25'}`}>
                {bio.length}/150
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-5 pb-8 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`w-full font-semibold py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              hasChanges
                ? 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : saved ? (
              'Saved!'
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full border border-white/10 text-white/50 font-semibold py-3.5 rounded-full hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
