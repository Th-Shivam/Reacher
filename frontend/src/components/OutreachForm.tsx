import React, { useState, useEffect } from 'react';
import { useAuth, useSession, useUser } from '@clerk/react';

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
  const { user } = useUser();

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Gmail Connection State
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    gmail_accessible?: boolean;
    email_address?: string;
    loading: boolean;
  }>({ connected: false, loading: true });
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
  }, []);

  const fetchGmailStatus = async () => {
    try {
      console.log("Fetching Gmail status...");
      const token = await getToken();
      if (!token) {
        console.log("No token available for Gmail status");
        return;
      }
      console.log("Calling backend /api/gmail/status...");
      const res = await fetch('http://localhost:8000/api/gmail/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("Backend response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Gmail status data:", data);
        setGmailStatus({ ...data, loading: false });
      } else {
        console.error("Gmail status error response");
        setGmailStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error("Failed to fetch Gmail status", err);
      setGmailStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (session) {
      fetchGmailStatus();
    }
  }, [session]);

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

  const handleCreateDraft = async (_campaignId: string, email: string, draftBody: string) => {
    try {
      if (!gmailStatus.connected || !gmailStatus.gmail_accessible) {
        throw new Error("Gmail is not connected or accessible.");
      }
      if (!email) {
        throw new Error("Contact email is required to create a draft.");
      }

      // Extract subject line if present
      const lines = draftBody.split("\n");
      let subject = "Outreach Email";
      const bodyLines = [];
      for (const line of lines) {
        if (line.toLowerCase().startsWith("subject:")) {
          subject = line.substring(8).trim();
        } else {
          bodyLines.push(line);
        }
      }
      const bodyText = bodyLines.join("\n").trim();

      const token = await getToken();
      const res = await fetch(`http://localhost:8000/api/gmail/draft`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_email: email,
          subject: subject,
          body_text: bodyText
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`Draft created successfully! Draft ID: ${data.draft_id}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create draft");
      }
    } catch (err: any) {
      alert(err.message);
      console.error(err);
    }
  };

  const handleConnectGmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Connect Gmail clicked. User:", user);
    if (!user) return;
    try {
      const googleAccount = user.externalAccounts.find(a => a.provider === 'google' || a.verification?.strategy === 'oauth_google');
      console.log("Found Google Account:", googleAccount);
      if (googleAccount) {
        console.log("Reauthorizing existing Google Account...");
        const updated = await googleAccount.reauthorize({
          additionalScopes: ['https://www.googleapis.com/auth/gmail.compose'],
          redirectUrl: window.location.href
        });
        console.log("Updated Account:", updated);
        if (updated.verification?.externalVerificationRedirectURL) {
          console.log("Redirecting to:", updated.verification.externalVerificationRedirectURL);
          window.location.href = updated.verification.externalVerificationRedirectURL.toString();
        } else {
          console.log("No redirect URL found. Verification state:", updated.verification);
        }
      } else {
        console.log("Creating new Google External Account...");
        const newAcc = await user.createExternalAccount({
          strategy: 'oauth_google',
          redirectUrl: window.location.href,
          additionalScopes: ['https://www.googleapis.com/auth/gmail.compose']
        });
        console.log("New Account:", newAcc);
        if (newAcc?.verification?.externalVerificationRedirectURL) {
          console.log("Redirecting to:", newAcc.verification.externalVerificationRedirectURL);
          window.location.href = newAcc.verification.externalVerificationRedirectURL.toString();
        } else {
          console.log("No redirect URL found for new account. Verification state:", newAcc?.verification);
        }
      }
    } catch (err) {
      console.error("Failed to connect Gmail", err);
      alert("Failed to connect Gmail: " + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
      
      {/* Gmail Connection Section */}
      <div style={{ marginBottom: '2rem', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', textAlign: 'left' }}>
        <h3>Gmail</h3>
        <p style={{ margin: '5px 0 15px 0', color: '#6c757d' }}>Connect your Gmail account to create Gmail drafts directly from Reacher.</p>
        
        {gmailStatus.loading ? (
          <p>Loading Gmail status...</p>
        ) : gmailStatus.connected && gmailStatus.gmail_accessible ? (
          <div>
            <span style={{ color: '#10b981', fontWeight: 'bold', marginRight: '15px' }}>✓ Gmail connected ({gmailStatus.email_address})</span>
            <button 
              onClick={handleConnectGmail}
              style={{ padding: '8px 15px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Reconnect Gmail
            </button>
          </div>
        ) : (
          <div>
            {gmailStatus.connected && !gmailStatus.gmail_accessible && (
              <p style={{ color: '#ea4335', marginBottom: '10px' }}>⚠️ Connected to Google, but Gmail access is missing or invalid.</p>
            )}
            <button 
              onClick={handleConnectGmail}
              style={{ padding: '8px 15px', background: '#ea4335', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Connect Gmail
            </button>
          </div>
        )}
      </div>

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
                </div>
                {c.generated_draft && (
                  <div style={{ marginTop: '10px', background: '#fff9e6', padding: '15px', borderRadius: '4px', border: '1px solid #ffe066' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#b7791f' }}>Generated Draft:</h4>
                      
                      {gmailStatus.connected && gmailStatus.gmail_accessible && (
                        <button 
                          onClick={() => handleCreateDraft(c._id, c.contact_email || "", c.generated_draft || "")}
                          style={{ padding: '6px 12px', cursor: 'pointer', background: '#ea4335', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9em' }}
                        >
                          Push to Gmail Drafts 🚀
                        </button>
                      )}
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: '0.9em', color: '#4a5568' }}>
                      {c.generated_draft}
                    </pre>
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
