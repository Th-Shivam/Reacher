import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';

interface OutreachCampaign {
  _id: string;
  company_name: string;
  contact_email: string;
  job_description: string;
  status: string;
  jd_analysis?: any;
  candidate_analysis?: any;
  company_research?: string;
  generated_draft?: string;
}

export const OutreachForm = () => {
  const { getToken } = useAuth();

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    contact_email: '',
    job_description: ''
  });

  const fetchCampaigns = async () => {
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:8000/api/outreach', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const token = await getToken();
      
      const res = await fetch('http://localhost:8000/api/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('Failed to create outreach campaign');
      }

      setMessage('Outreach campaign created successfully!');
      setFormData({ company_name: '', contact_email: '', job_description: '' });
      await fetchCampaigns(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeJD = async (campaignId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/analyze-jd`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCampaigns();
      } else {
        throw new Error("Failed to analyze JD");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDraft = async (campaignId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/generate-draft`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCampaigns();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to generate draft");
      }
    } catch (err: any) {
      alert(err.message);
      console.error(err);
    }
  };

  const handleAnalyzeCandidate = async (campaignId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/analyze-candidate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCampaigns();
      } else {
        throw new Error("Failed to analyze Candidate");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResearchCompany = async (campaignId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/research-company`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCampaigns();
      } else {
        throw new Error("Failed to research company");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
      <h2>Target Job / Outreach Campaign</h2>
      <p>Enter the details of the job and company you want to target.</p>

      {message && <div style={{ color: 'green', marginBottom: '1rem' }}>{message}</div>}
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Company Name:
          <input
            type="text"
            required
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            style={{ padding: '8px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Recruiter/Contact Email:
          <input
            type="email"
            required
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            style={{ padding: '8px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Job Description:
          <textarea
            required
            rows={6}
            value={formData.job_description}
            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
            style={{ padding: '8px', resize: 'vertical' }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Saving...' : 'Create Target'}
        </button>
      </form>

      {campaigns.length > 0 && (
        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h3>Your Targets</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {campaigns.map(c => (
              <li key={c._id} style={{ background: '#f5f5f5', margin: '10px 0', padding: '15px', borderRadius: '4px' }}>
                <strong>{c.company_name}</strong> - Status: <span style={{ color: '#0070f3' }}>{c.status}</span>
                <br />
                <small>Contact: {c.contact_email || 'None'}</small>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleAnalyzeJD(c._id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Analyze JD
                  </button>
                  <button onClick={() => handleAnalyzeCandidate(c._id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Analyze Candidate
                  </button>
                  <button onClick={() => handleResearchCompany(c._id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Research Company
                  </button>
                  <button 
                    onClick={() => handleGenerateDraft(c._id)} 
                    style={{ padding: '5px 10px', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
                    disabled={!c.jd_analysis || !c.candidate_analysis || !c.company_research}
                  >
                    Generate Draft
                  </button>
                </div>
                {c.generated_draft && (
                  <div style={{ marginTop: '10px', background: '#fff9e6', padding: '15px', borderRadius: '4px', border: '1px solid #ffe066' }}>
                    <strong>Generated Cold Email:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: '10px' }}>{c.generated_draft}</pre>
                  </div>
                )}
                {c.jd_analysis && (
                  <div style={{ marginTop: '10px', background: '#eef', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>JD Analysis:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(c.jd_analysis, null, 2)}</pre>
                  </div>
                )}
                {c.candidate_analysis && (
                  <div style={{ marginTop: '10px', background: '#efe', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>Candidate Analysis:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(c.candidate_analysis, null, 2)}</pre>
                  </div>
                )}
                {c.company_research && (
                  <div style={{ marginTop: '10px', background: '#e6f7ff', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>Company Research:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{c.company_research}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
