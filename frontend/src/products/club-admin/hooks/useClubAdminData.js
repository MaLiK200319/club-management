import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { clubService } from '../../../services/apiService';

const useClubAdminData = (user) => {
    const [data, setData] = useState({
        myClub: null,
        pendingMembersCount: 0,
        enforcement: {
            state: 'normal', // normal, restricted, locked, suspended
            deadline: null,
            activeIssues: 0
        },
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user || user.role !== 'club_admin') {
                setData(prev => ({ ...prev, loading: false }));
                return;
            }

            try {
                // 1. Resolve Club ID
                let clubId = user.club_id;
                if (!clubId) {
                    const profileRes = await api.get(`/users/${user.id}`);
                    clubId = profileRes.data?.club_id;
                }

                if (!clubId) {
                    setData(prev => ({ ...prev, loading: false }));
                    return;
                }

                // 2. Parallel Fetch: Club Data + Escalations + Members (for notification)
                const [clubRes, escRes, membersRes] = await Promise.all([
                    clubService.getById(clubId),
                    api.get('/intelligence/escalations'),
                    api.get(`/clubs/${clubId}/members`)
                ]);

                // 3. Process Enforcement Logic
                const allEscalations = escRes.data || [];
                const myEscalations = allEscalations.filter(
                    e => e.target_type === 'club' && e.target_id === clubId && !e.resolved_at
                );

                const allMembers = membersRes.data || [];
                const pendingMembersCount = allMembers.filter(m => m.status === 'pending').length;

                let state = 'normal';
                let deadline = null;

                if (myEscalations.length > 0) {
                    const urgent = myEscalations.filter(e => e.severity === 'escalated' || e.severity === 'intervention');

                    if (urgent.length > 0) {
                        const oldest = urgent.reduce((prev, curr) =>
                            new Date(prev.created_at) < new Date(curr.created_at) ? prev : curr
                        );

                        const created = new Date(oldest.created_at);
                        const now = new Date();
                        const hoursOld = (now - created) / (1000 * 60 * 60);

                        if (hoursOld > 168) {
                            state = 'suspended';
                        } else if (hoursOld > 48) {
                            state = 'locked';
                            deadline = new Date(created.getTime() + (168 * 60 * 60 * 1000));
                        } else {
                            state = 'restricted';
                            deadline = new Date(created.getTime() + (48 * 60 * 60 * 1000));
                        }
                    } else {
                        state = 'restricted'; // Warnings only
                    }
                }

                setData({
                    myClub: clubRes.data,
                    pendingMembersCount,
                    enforcement: {
                        state,
                        deadline,
                        activeIssues: myEscalations.length
                    },
                    loading: false,
                    error: null
                });

            } catch (err) {
                console.error("Failed to fetch admin data", err);
                setData(prev => ({ ...prev, loading: false, error: err }));
            }
        };

        fetchData();
    }, [user]);

    return data;
};

export default useClubAdminData;
