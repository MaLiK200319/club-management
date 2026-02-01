import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import '../super-admin.css';

const GovernanceDashboard = () => {
    // Mock system configuration
    const [config, setConfig] = useState({
        autoLock: true,
        escalationThreshold: 3,
        notifyAdmins: true,
        requireApprovalWait: 24 // hours
    });

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, we'd fetch these
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Mocking logs since backend endpoint might not exist yet
            const mockLogs = [
                { id: 101, timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: 'ENFORCEMENT', target: 'Club #42', message: 'Changed state to SUSPENDED (Automated)' },
                { id: 102, timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: 'ALERT', target: 'System', message: 'Escalation volume high (5/hr)' },
                { id: 103, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), type: 'USER', target: 'Admin User', message: 'Updated global threshold config' },
                { id: 104, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), type: 'ENFORCEMENT', target: 'Club #11', message: 'Changed state to NORMAL' },
                { id: 105, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), type: 'SYSTEM', target: 'DailyJob', message: 'Audit scan completed. 2 issues found.' },
            ];
            setLogs(mockLogs);
        } catch (error) {
            console.error("Log fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigToggle = (key) => {
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div>
            <div className="sa-page-header">
                <div>
                    <h1 className="sa-page-title">Governance & Enforcement</h1>
                    <div className="sa-page-subtitle">Configure system rules and review audit trails</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-lg)' }}>

                {/* 1. Global Configuration */}
                <BitCard title="System Rules" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>Automated Lockdowns</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lock club after 48h unrest</div>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config.autoLock} onChange={() => handleConfigToggle('autoLock')} />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>Super Admin Notifications</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email on Critical alerts</div>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config.notifyAdmins} onChange={() => handleConfigToggle('notifyAdmins')} />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

                        <div>
                            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Escalation Threshold</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Max warnings before restriction</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={config.escalationThreshold}
                                    readOnly
                                    className="bit-input-field"
                                    style={{ width: '80px', padding: '4px 8px' }}
                                />
                                <BitButton size="sm" variant="secondary">Update</BitButton>
                            </div>
                        </div>
                    </div>
                </BitCard>

                {/* 2. Audit Logs */}
                <BitCard title="System Audit Log">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
                        <BitButton size="sm" variant="outline" onClick={fetchLogs}>Refresh Logs</BitButton>
                    </div>

                    <div>
                        {logs.map((log, index) => (
                            <div key={log.id} style={{
                                padding: 'var(--space-md)',
                                borderBottom: index !== logs.length - 1 ? '1px solid var(--border-light)' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        color: log.type === 'ENFORCEMENT' ? 'var(--color-danger)' : 'var(--text-muted)',
                                        textTransform: 'uppercase'
                                    }}>
                                        [{log.type}]
                                    </span>
                                    <span style={{ fontWeight: 600 }}>{log.target}</span>
                                </div>
                                <div style={{ color: 'var(--text-main)' }}>{log.message}</div>
                            </div>
                        ))}
                    </div>
                </BitCard>

            </div>

            <style>{`
                .switch {
                  position: relative;
                  display: inline-block;
                  width: 40px;
                  height: 20px;
                }
                .switch input { 
                  opacity: 0;
                  width: 0;
                  height: 0;
                }
                .slider {
                  position: absolute;
                  cursor: pointer;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: #CBD5E1;
                  transition: .4s;
                  border-radius: 34px;
                }
                .slider:before {
                  position: absolute;
                  content: "";
                  height: 16px;
                  width: 16px;
                  left: 2px;
                  bottom: 2px;
                  background-color: white;
                  transition: .4s;
                  border-radius: 50%;
                }
                input:checked + .slider {
                  background-color: var(--color-primary);
                }
                input:checked + .slider:before {
                  transform: translateX(20px);
                }
            `}</style>
        </div>
    );
};

export default GovernanceDashboard;
