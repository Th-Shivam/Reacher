import React, { useState, useEffect } from 'react';
import { useAuth, useSession } from '@clerk/react';

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
  draft_review?: any;
}

export const OutreachForm = () => {
  const { getToken } = useAuth();
  const { session } = useSession();

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

  const handleReviewDraft = async (campaignId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/review-draft`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCampaigns();
      } else {
        throw new Error("Failed to review draft");
      }
    } catch (err: any) {
      alert(err.message);
      console.error(err);
    }
  };

  const handlePushToGmail = async (campaignId: string) => {
    try {
      if (!session) {
        throw new Error("No active session found.");
      }

      // We attempt to get the Google OAuth token from Clerk
      // This requires an 'oauth_google' template in the Clerk Dashboard
      let googleToken;
      try {
        googleToken = await session.getToken({ template: 'oauth_google' });
      } catch (err) {
        console.error("Clerk Token Error:", err);
      }

      if (!googleToken) {
        throw new Error("Could not retrieve Google OAuth token. Please ensure you have added the 'oauth_google' template in your Clerk Dashboard and signed in with Google.");
      }

      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/outreach/${campaignId}/push-to-gmail`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: googleToken })
      });

      if (res.ok) {
        alert("Draft successfully pushed to your Gmail!");
        await fetchCampaigns();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to push to Gmail");
      }
    } catch (err: any) {
      alert(err.message);
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
                  {c.generated_draft && (
                    <button 
                      onClick={() => handleReviewDraft(c._id)} 
                      style={{ padding: '5px 10px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Review Draft
                    </button>
                  )}
                  {c.generated_draft && c.contact_email && (
                    <button 
                      onClick={() => handlePushToGmail(c._id)} 
                      style={{ padding: '5px 10px', cursor: 'pointer', background: '#ea4335', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                    >
                      Push to Gmail 🚀
                    </button>
                  )}
                </div>
                {c.generated_draft && (
                  <div style={{ marginTop: '10px', background: '#fff9e6', padding: '15px', borderRadius: '4px', border: '1px solid #ffe066' }}>
                    <strong>Generated Cold Email:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: '10px' }}>{c.generated_draft}</pre>
                  </div>
                )}
                {c.draft_review && (
                  <div style={{ marginTop: '10px', background: c.draft_review.score >= 8 ? '#d1fae5' : '#fee2e2', padding: '15px', borderRadius: '4px', border: `1px solid ${c.draft_review.score >= 8 ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>AI Review Scorecard</strong>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: c.draft_review.score >= 8 ? '#059669' : '#b91c1c' }}>
                        {c.draft_review.score} / 10
                      </span>
                    </div>
                    <ul style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.5' }}>
                      <li><strong>Tone:</strong> {c.draft_review.tone_analysis}</li>
                      <li><strong>Length:</strong> {c.draft_review.length_analysis}</li>
                      <li><strong>Alignment:</strong> {c.draft_review.alignment_analysis}</li>
                    </ul>
                    <div style={{ marginTop: '10px', fontSize: '14px', fontStyle: 'italic' }}>
                      <strong>Actionable Feedback:</strong> {c.draft_review.overall_feedback}
                    </div>
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
