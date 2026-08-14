import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';

export default function ProfileForm() {
  const { getToken } = useAuth();
  
  const [profile, setProfile] = useState({
    name: '',
    headline: '',
    skills: '',
    projects: '',
    experience: '',
    education: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeMetadata, setResumeMetadata] = useState<{filename: string} | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          headline: data.headline || '',
          skills: data.skills ? data.skills.join(', ') : '',
          projects: data.projects ? data.projects.join('\n') : '',
          experience: data.experience ? data.experience.join('\n') : '',
          education: data.education ? data.education.join('\n') : ''
        });
        if (data.resume) {
          setResumeMetadata(data.resume);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      const token = await getToken();
      
      const payload = {
        name: profile.name,
        headline: profile.headline,
        // Split by comma for skills, split by newline for the others
        skills: profile.skills.split(',').map(s => s.trim()).filter(Boolean),
        projects: profile.projects.split('\n').map(s => s.trim()).filter(Boolean),
        experience: profile.experience.split('\n').map(s => s.trim()).filter(Boolean),
        education: profile.education.split('\n').map(s => s.trim()).filter(Boolean)
      };

      const response = await fetch('http://localhost:8000/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('');
    setError('');

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/profile/resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to upload resume');
      }
      
      const data = await response.json();
      if (data.resume) {
        setResumeMetadata(data.resume);
      }
      setMessage('Resume uploaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <div>Loading profile...</div>;

  return (
    <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Candidate Profile</h2>
      {message && <div style={{color: 'green', marginBottom: '1rem'}}>{message}</div>}
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
      
      <div style={{marginBottom: '1.5rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px'}}>
        <h3>Resume</h3>
        {resumeMetadata && (
          <p>Current resume: <strong>{resumeMetadata.filename}</strong></p>
        )}
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          {isUploading && <span>Uploading...</span>}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto', textAlign: 'left'}}>
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Name:
          <input 
            type="text" 
            value={profile.name} 
            onChange={e => setProfile({...profile, name: e.target.value})} 
            required 
            style={{padding: '0.5rem'}}
          />
        </label>
        
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Headline:
          <input 
            type="text" 
            value={profile.headline} 
            onChange={e => setProfile({...profile, headline: e.target.value})} 
            required 
            style={{padding: '0.5rem'}}
          />
        </label>
        
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Skills (comma separated):
          <textarea 
            value={profile.skills} 
            onChange={e => setProfile({...profile, skills: e.target.value})} 
            style={{padding: '0.5rem', minHeight: '60px'}}
          />
        </label>
        
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Projects (one per line):
          <textarea 
            value={profile.projects} 
            onChange={e => setProfile({...profile, projects: e.target.value})} 
            style={{padding: '0.5rem', minHeight: '80px'}}
          />
        </label>
        
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Experience (one per line):
          <textarea 
            value={profile.experience} 
            onChange={e => setProfile({...profile, experience: e.target.value})} 
            style={{padding: '0.5rem', minHeight: '80px'}}
          />
        </label>
        
        <label style={{display: 'flex', flexDirection: 'column'}}>
          Education (one per line):
          <textarea 
            value={profile.education} 
            onChange={e => setProfile({...profile, education: e.target.value})} 
            style={{padding: '0.5rem', minHeight: '80px'}}
          />
        </label>
        
        <button type="submit" disabled={isSaving} style={{padding: '0.75rem', marginTop: '1rem', cursor: 'pointer'}}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
