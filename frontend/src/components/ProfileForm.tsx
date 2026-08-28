import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import {
  IconUser, IconBrandGithub, IconBrandLinkedin, IconBrandX,
  IconFileText, IconUpload, IconCode, IconDeviceFloppy,
} from '@tabler/icons-react';

interface ProfileFormProps {
  onUpdateStats?: () => void;
}

export default function ProfileForm({ onUpdateStats }: ProfileFormProps) {
  const { getToken } = useAuth();

  const [profile, setProfile] = useState({
    name: '', phone: '', email: '',
    github: '', linkedin: '', x_url: '',
    headline: '', skills: '', projects: '',
    experience: '', education: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeMetadata, setResumeMetadata] = useState<{ filename: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setProfile({
          name: d.name || '', phone: d.phone || '', email: d.email || '',
          github: d.github || '', linkedin: d.linkedin || '', x_url: d.x_url || '',
          headline: d.headline || '',
          skills: d.skills ? d.skills.join(', ') : '',
          projects: d.projects ? d.projects.join('\n') : '',
          experience: d.experience ? d.experience.join('\n') : '',
          education: d.education ? d.education.join('\n') : ''
        });
        if (d.resume) setResumeMetadata(d.resume);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setMessage(''); setError('');
    try {
      const token = await getToken();
      const payload = {
        name: profile.name, phone: profile.phone, email: profile.email,
        github: profile.github, linkedin: profile.linkedin, x_url: profile.x_url,
        headline: profile.headline,
        skills: profile.skills.split(',').map(s => s.trim()).filter(Boolean),
        projects: profile.projects.split('\n').map(s => s.trim()).filter(Boolean),
        experience: profile.experience.split('\n').map(s => s.trim()).filter(Boolean),
        education: profile.education.split('\n').map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setMessage('Profile saved!');
      if (onUpdateStats) onUpdateStats();
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
    finally { setIsSaving(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true); setMessage(''); setError('');
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/resume`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Upload failed'); }
      const d = await res.json();
      if (d.resume) setResumeMetadata(d.resume);
      setMessage('Resume uploaded!');
      if (onUpdateStats) onUpdateStats();
    } catch (err: any) { setError(err.message); }
    finally { setIsUploading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', background: '#F8F7F3', border: '1px solid #E8E6DD',
    borderRadius: '8px', padding: '9px 12px', fontSize: '13px',
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Lato', system-ui, sans-serif", transition: 'border-color 0.15s',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '9px', fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: '5px',
  };
  const divider: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
    textTransform: 'uppercase', color: '#888',
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
  };

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = '#1A1A1A');
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = '#E8E6DD');

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #1A1A1A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '13px', color: '#888' }}>Loading profile...</span>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>

      {/* ─── Compact page title ─── */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A90E2', marginBottom: '8px' }}>
            <IconUser style={{ width: '13px', height: '13px' }} />
            Candidate Intelligence Profile
          </div>
          <h2 className="text-[27px] sm:text-[34px]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, color: '#1A1A1A', margin: '0 0 6px 0', lineHeight: 1.1 }}>
            Your Professional Profile
          </h2>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Reacher uses your profile to personalize outreach and match company requirements.
          </p>
        </div>

        {/* Alerts inline top-right */}
        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
            {message}
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '14px', lineHeight: 1 }}>×</button>
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#9F1239' }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9F1239', fontSize: '14px', lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ─── 2-column master layout ─── */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">

          {/* ══════════════ LEFT COLUMN ══════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Resume upload */}
            <div className="px-5 py-5 sm:px-[22px]" style={{ background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#F8F7F3', border: '1px solid #E8E6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconFileText style={{ width: '18px', height: '18px', color: '#555' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', marginBottom: '2px' }}>Resume (PDF)</div>
                    <div style={{ fontSize: '11px', color: resumeMetadata ? '#166534' : '#888', overflowWrap: 'anywhere' }}>
                      {resumeMetadata ? resumeMetadata.filename : 'Upload for automated parsing'}
                    </div>
                  </div>
                </div>
                <label className="w-full justify-center sm:w-auto" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 14px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#1A1A1A', color: '#FFFFFF', cursor: 'pointer', flexShrink: 0, minHeight: '40px' }}>
                  <IconUpload style={{ width: '13px', height: '13px' }} />
                  {isUploading ? 'Uploading…' : 'Upload PDF'}
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Personal Information */}
            <div className="px-5 py-5 sm:px-[22px]" style={{ background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ ...divider }}>
                <IconUser style={{ width: '14px', height: '14px', color: '#4A90E2' }} />
                Personal Information
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label style={lbl}>Full Name *</label>
                  <input type="text" required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="e.g. Alex Morgan" style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={lbl}>Email Address</label>
                  <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="alex@example.com" style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input type="text" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 000-0000" style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={lbl}>Headline / Role *</label>
                  <input type="text" required value={profile.headline} onChange={e => setProfile({ ...profile, headline: e.target.value })} placeholder="Full Stack Engineer & AI Specialist" style={inp} onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            {/* Social & Portfolio Links */}
            <div className="px-5 py-5 sm:px-[22px]" style={{ background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ ...divider }}>
                <IconBrandGithub style={{ width: '14px', height: '14px', color: '#4A90E2' }} />
                Social & Portfolio Links
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconBrandGithub style={{ width: '12px', height: '12px' }} /> GitHub URL
                  </label>
                  <input type="url" value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} placeholder="https://github.com/username" style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconBrandLinkedin style={{ width: '12px', height: '12px', color: '#0A66C2' }} /> LinkedIn URL
                  </label>
                  <input type="url" value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} placeholder="https://linkedin.com/in/username" style={inp} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconBrandX style={{ width: '12px', height: '12px' }} /> X (Twitter) URL
                  </label>
                  <input type="url" value={profile.x_url} onChange={e => setProfile({ ...profile, x_url: e.target.value })} placeholder="https://x.com/username" style={inp} onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT COLUMN ══════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="px-5 py-5 sm:px-[22px]" style={{ background: '#FFFFFF', border: '1px solid #E8E6DD', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ ...divider }}>
                <IconCode style={{ width: '14px', height: '14px', color: '#4A90E2' }} />
                Technical Background & Experience
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={lbl}>Key Skills (comma separated)</label>
                  <textarea
                    rows={2}
                    value={profile.skills}
                    onChange={e => setProfile({ ...profile, skills: e.target.value })}
                    placeholder="React, TypeScript, Python, FastAPI, MongoDB, System Design, AI/LLMs"
                    style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                <div>
                  <label style={lbl}>Key Projects (one project per line)</label>
                  <textarea
                    rows={3}
                    value={profile.projects}
                    onChange={e => setProfile({ ...profile, projects: e.target.value })}
                    placeholder={"Reacher AI: Automated Outreach Engine with Editorial UI\nSmartFlow: Distributed Workflow Pipeline with Redis"}
                    style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                <div>
                  <label style={lbl}>Work Experience (one role per line)</label>
                  <textarea
                    rows={3}
                    value={profile.experience}
                    onChange={e => setProfile({ ...profile, experience: e.target.value })}
                    placeholder={"Senior Full Stack Engineer at TechCorp (2023 - Present)\nSoftware Engineer at DataCloud (2021 - 2023)"}
                    style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>

                <div>
                  <label style={lbl}>Education & Credentials (one per line)</label>
                  <textarea
                    rows={2}
                    value={profile.education}
                    onChange={e => setProfile({ ...profile, education: e.target.value })}
                    placeholder="B.S. Computer Science - State University (2021)"
                    style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
                    onFocus={focus} onBlur={blur}
                  />
                </div>
              </div>
            </div>

            {/* Save button pinned to bottom of right column */}
            <div className="flex justify-stretch sm:justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '13px 24px', borderRadius: '9px', border: 'none',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: isSaving ? '#555' : '#1A1A1A', color: '#FFFFFF',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.15s',
                  minHeight: '46px',
                }}
              >
                <IconDeviceFloppy style={{ width: '15px', height: '15px' }} />
                {isSaving ? 'Saving…' : 'Save Candidate Profile'}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
